import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type OlMap from 'ol/Map'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { selectTheme, toggleTheme } from '@/shared/model/theme'
import {
  POINT_TYPES,
  PUBLIC_CONTROL_POINTS_KEY,
  usePublicControlPointQuery,
  usePublicControlPointsQuery,
  type ControlPoint,
  type PublicControlPoint,
} from '@/entities/control-point'
import type { SurveyResult } from '@/entities/survey-record'
import type { SurveyProject } from '@/entities/survey-project'
import { AppHeader, PointIcon, ProjectIcon } from '@/widgets/app-header'
import { ControlPointMap } from '@/widgets/control-point-map'
import { ControlPointDetail } from '@/widgets/control-point-detail'
import { MapSidebar, MinimizedPanelChip } from '@/widgets/map-sidebar'
import { PointSearchBar } from '@/widgets/point-search'
import { MapCommandBar } from '@/widgets/map-command-bar'
import { MapLayerPicker } from '@/widgets/map-layer-picker'
import { MobileBottomNav } from '@/widgets/mobile-bottom-nav'
import { MobileSummaryChip } from '@/widgets/mobile-summary-chip'
import { withoutTransition } from '@/shared/lib/instantChange'
import { useNarrowScreen } from '@/shared/lib/useNarrowScreen'
import { useLockedDocument } from '@/shared/lib/useLockedDocument'
import { LIST_SHEET_RATIO, useBottomSheet } from '@/shared/lib/useBottomSheet'
import { useViewportHeight } from '@/shared/lib/useViewportHeight'
import { VWORLD_KEY } from '@/shared/config/map'
import { Spinner } from '@/shared/ui/Spinner'
import { Toast } from '@/shared/ui/Toast'

const EMPTY_RESULTS: ReadonlyMap<string, SurveyResult> = new Map()
const EMPTY_PROJECTS: SurveyProject[] = []
const EMPTY_IDS: ReadonlySet<string> = new Set()
const PANEL_MARGIN = 16

const carriesFile = (event: DragEvent<HTMLElement>) => event.dataTransfer.types.includes('Files')

const CADASTRAL_SWATCH = (
  <svg viewBox="0 0 20 14" className="h-[14px] w-5 shrink-0" fill="none" stroke="var(--color-teal-btn-edge)" strokeWidth="1" aria-hidden="true">
    <rect x="1" y="1" width="18" height="12" rx="1.5" />
    <path d="M1 7h18M7 1v12M13 1v12" />
  </svg>
)

const DISTRICT_SWATCH = (
  <svg viewBox="0 0 20 14" className="h-[14px] w-5 shrink-0" fill="none" stroke="var(--color-ink-3)" strokeWidth="1.4" strokeDasharray="4 2" aria-hidden="true">
    <path d="M1 7h18" />
  </svg>
)

function sortPublicPoints(points: PublicControlPoint[]): PublicControlPoint[] {
  const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' })
  return [...points].sort(
    (a, b) => POINT_TYPES.indexOf(a.type) - POINT_TYPES.indexOf(b.type) || collator.compare(a.name, b.name),
  )
}

/**
 * 공개 API만 사용하는 게스트 지도.
 *
 * 회원 화면과 지도·기준점 목록·상세 패널을 공유하지만 프로젝트·파일 드롭·조사·사진·챗봇은
 * 이 트리에 마운트하지 않는다. 따라서 게스트 화면에서 보호 API가 우발적으로 실행될 길도 없다.
 */
export function GuestMapPage() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const theme = useAppSelector(selectTheme)
  const narrow = useNarrowScreen()
  const viewportHeight = useViewportHeight()
  useLockedDocument(narrow)

  const pointsQuery = usePublicControlPointsQuery()
  const points = useMemo(() => sortPublicPoints(pointsQuery.data ?? []), [pointsQuery.data])
  // 공용 지도·목록은 공개 모델과 실제로 함께 쓰는 여섯 필드만 읽는다.
  const sharedPoints = points as unknown as ControlPoint[]

  const [panel, setPanel] = useState<{ minimized: boolean } | null>({ minimized: false })
  const openPanel = panel !== null && !panel.minimized ? 'points' : null
  const [headerWidth, setHeaderWidth] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = points.find((point) => point.id === selectedId) ?? null
  const detailQuery = usePublicControlPointQuery(selected?.pointNo ?? null)
  const shownPoint = detailQuery.data ?? selected
  const restoreList = useRef(false)
  const [focusNonce, setFocusNonce] = useState(0)
  const [homeNonce, setHomeNonce] = useState(0)
  const [mapInstance, setMapInstance] = useState<OlMap | null>(null)
  const [showCadastral, setShowCadastral] = useState(true)
  const [showDistrict, setShowDistrict] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [blockingFileDrop, setBlockingFileDrop] = useState(false)
  const notice = new URLSearchParams(location.search).get('notice')

  useEffect(() => {
    if (selectedId !== null && !points.some((point) => point.id === selectedId)) setSelectedId(null)
  }, [points, selectedId])

  function focusPoint(point: { id: string }, fromList = false) {
    restoreList.current = fromList && narrow && openPanel === 'points'
    setSelectedId(point.id)
    setFocusNonce((value) => value + 1)
    if (narrow) setPanel((current) => current === null ? null : { minimized: true })
  }

  function closePoints() {
    setSelectedId(null)
    setPanel(null)
  }

  function blockFileDrag(event: DragEvent<HTMLDivElement>) {
    if (!carriesFile(event)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'none'
    setBlockingFileDrop(true)
  }

  function leaveFileDrag(event: DragEvent<HTMLDivElement>) {
    if (!carriesFile(event)) return
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setBlockingFileDrop(false)
  }

  function rejectFileDrop(event: DragEvent<HTMLDivElement>) {
    if (!carriesFile(event)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'none'
    setBlockingFileDrop(false)
    setToast('게스트 모드에서는 파일을 업로드할 수 없습니다.')
  }

  async function refreshPoints() {
    if (refreshing) return
    setRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: PUBLIC_CONTROL_POINTS_KEY })
      const failed = queryClient.getQueryState(PUBLIC_CONTROL_POINTS_KEY)?.status === 'error'
      setToast(failed ? '공개 기준점을 다시 불러오지 못했습니다.' : '공개 기준점을 다시 불러왔습니다.')
    } finally {
      setRefreshing(false)
    }
  }

  const panelSheet = useBottomSheet({
    open: narrow && openPanel === 'points',
    onClosed: () => setPanel((current) => current === null ? null : { minimized: true }),
    viewportHeight,
    contentKey: openPanel,
    ratio: LIST_SHEET_RATIO,
  })

  const detailSheet = useBottomSheet({
    open: narrow && selected !== null,
    onClosed: () => {
      setSelectedId(null)
      if (restoreList.current) setPanel({ minimized: false })
      restoreList.current = false
    },
    viewportHeight,
    contentKey: selectedId,
    minHeight: 300,
  })

  const layers = [
    { key: 'cadastral', label: '지적도', on: showCadastral, onToggle: () => setShowCadastral((value) => !value), swatch: CADASTRAL_SWATCH },
    { key: 'district', label: '법정동 경계', on: showDistrict, onToggle: () => setShowDistrict((value) => !value), swatch: DISTRICT_SWATCH },
  ]

  return (
    <div
      className="app-bg relative flex h-full min-w-app-min flex-col text-ink max-lg:min-w-0"
      onDragEnter={blockFileDrag}
      onDragOver={blockFileDrag}
      onDragLeave={leaveFileDrag}
      onDrop={rejectFileDrop}
    >
      {blockingFileDrop && <GuestFileDropBlock />}
      <div className="relative min-h-0 min-w-0 flex-1">
        <AppHeader
          guest
          user={null}
          reservedTabs={[{ key: 'project-space', label: '프로젝트', icon: <ProjectIcon /> }]}
          tabs={[
            {
              key: 'points',
              label: '기준점',
              icon: <PointIcon />,
              active: panel !== null,
              onClick: () => setPanel((current) => current === null ? { minimized: false } : { minimized: !current.minimized }),
            },
          ]}
          search={<PointSearchBar points={sharedPoints} onSelect={(point) => focusPoint(point)} />}
          onBrandWidthChange={setHeaderWidth}
        />

        <div className="absolute inset-0">
          <ControlPointMap
            points={sharedPoints}
            visibleIds={panel === null ? EMPTY_IDS : null}
            addMode={false}
            showCadastral={showCadastral}
            showDistrict={showDistrict}
            selectedId={selectedId}
            surveyMode={false}
            resultById={EMPTY_RESULTS}
            theme={theme}
            focusNonce={focusNonce}
            homeNonce={homeNonce}
            onAddPoint={() => undefined}
            onSelect={(id) => {
              restoreList.current = false
              setSelectedId(id)
              if (id !== null && narrow) setPanel((current) => current === null ? null : { minimized: true })
            }}
            onMapReady={setMapInstance}
          />

          <div className="pointer-events-none absolute inset-x-0 top-[76px] z-10 flex flex-col items-center gap-1.5 px-4 max-lg:top-[110px] max-lg:px-3">
            {notice === 'authentication-required' && (
              <GuestBanner tone="warn">로그인 상태가 만료되었습니다. 공개 기준점은 계속 둘러볼 수 있습니다.</GuestBanner>
            )}
            {!VWORLD_KEY && (
              <GuestBanner tone="warn">VWorld 설정이 없어 기본 배경지도로 표시합니다.</GuestBanner>
            )}
            {pointsQuery.isPending && (
              <GuestBanner>
                <span className="flex items-center gap-1.5"><Spinner className="size-3" current />공개 기준점을 불러오는 중</span>
              </GuestBanner>
            )}
            {pointsQuery.isError && <GuestBanner tone="danger">공개 기준점을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</GuestBanner>}
            {detailQuery.isError && selected !== null && <GuestBanner tone="danger">기준점 상세 정보를 불러올 수 없습니다.</GuestBanner>}
          </div>

          <div className="pointer-events-none absolute inset-x-4 bottom-[18px] z-[21] flex justify-center max-lg:hidden">
            <div className="pointer-events-auto">
              <MapCommandBar
                map={mapInstance}
                tmEpsg="EPSG:5186"
                layers={<MapLayerPicker layers={layers} />}
                theme={theme}
                onToggleTheme={() => withoutTransition(() => dispatch(toggleTheme()))}
                onResetView={() => setHomeNonce((value) => value + 1)}
              />
            </div>
          </div>

          {panel?.minimized && (
            <div className="panel-in absolute left-4 top-[76px] z-[15] max-lg:hidden" style={{ width: headerWidth || undefined }}>
              <MinimizedPanelChip
                label="기준점"
                value="공개 기준점 표시 중"
                trailing={{ count: points.length }}
                onOpen={() => setPanel({ minimized: false })}
                onClose={closePoints}
              />
            </div>
          )}

          {panel !== null && (
            <div className="absolute inset-x-[12px] top-[64px] z-[30] lg:hidden">
              <MobileSummaryChip
                label="기준점"
                value="공개 기준점 표시 중"
                trailing={{ count: points.length }}
                onOpen={() => setPanel({ minimized: false })}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => withoutTransition(() => dispatch(toggleTheme()))}
            aria-pressed={theme === 'dark'}
            title="배경 밝기"
            aria-label="배경 밝기"
            className={`absolute left-[12px] z-[30] flex size-[30px] items-center justify-center rounded-full border border-line-pill bg-pill text-ink-2 shadow-pill transition-[top] duration-200 lg:hidden ${panel === null ? 'top-[64px]' : 'top-[110px]'}`}
          >
            {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
          </button>

          <div
            className={`absolute z-[15] lg:top-[76px] lg:right-[var(--detail-right)] max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-auto max-lg:z-[46] max-lg:overflow-hidden ${detailSheet.sheet.className}`}
            style={{ '--detail-right': `${PANEL_MARGIN}px`, ...detailSheet.sheet.style } as CSSProperties}
          >
            <ControlPointDetail
              guest
              point={shownPoint}
              activeProjectName={null}
              activeProjectId={null}
              surveyorName={null}
              surveyedAt={null}
              surveyResult={null}
              surveyNote={null}
              onImageUploaded={() => undefined}
              onImageFailed={() => undefined}
              onRecordSurvey={async () => undefined}
              onCancelSurvey={async () => undefined}
              onClose={() => narrow ? detailSheet.requestClose() : setSelectedId(null)}
              onEdit={() => undefined}
              onDelete={() => undefined}
              onCopied={(ok) => setToast(ok ? '클립보드로 복사되었습니다.' : '클립보드로 복사하지 못했습니다.')}
              sheet={narrow ? detailSheet.sheet : undefined}
            />
          </div>
        </div>

        <MapSidebar
          projects={EMPTY_PROJECTS}
          activeProjectId={null}
          onChangeActive={() => undefined}
          onCreate={() => undefined}
          onImportProjects={() => undefined}
          onEditProject={() => undefined}
          onDeleteProject={() => undefined}
          points={sharedPoints}
          targetPoints={sharedPoints}
          resultById={EMPTY_RESULTS}
          onFocusPoint={(point) => focusPoint(point, true)}
          selectedPointId={selectedId}
          onDeselectPoint={() => setSelectedId(null)}
          projectsLoading={false}
          pointsLoading={pointsQuery.isPending}
          recordsLoading={false}
          targetsLoading={false}
          onRefresh={() => void refreshPoints()}
          refreshing={refreshing ? 'points' : null}
          onStartAddPoint={() => undefined}
          onImportPoints={() => undefined}
          readOnly
          isAdmin={false}
          onOpenUserManagement={() => undefined}
          open={openPanel}
          minimized={panel?.minimized === true}
          onMinimize={() => setPanel({ minimized: true })}
          onClose={() => narrow ? panelSheet.requestClose() : closePoints()}
          width={headerWidth}
          sheet={narrow ? panelSheet.sheet : undefined}
        />

        <div className="lg:hidden">
          <MobileBottomNav
            tabs={[
              {
                key: 'points',
                label: '기준점',
                icon: <PointIcon />,
                active: panel !== null,
                onClick: () => setPanel((current) => current === null ? { minimized: false } : current.minimized ? { minimized: false } : null),
              },
            ]}
            controls={<MapLayerPicker variant="dock" layers={layers} />}
          />
        </div>
      </div>

      {toast !== null && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function GuestBanner(props: { children: React.ReactNode; tone?: 'warn' | 'danger' }) {
  const tone = props.tone === 'danger'
    ? 'border-danger-edge bg-danger-wash text-danger'
    : props.tone === 'warn'
      ? 'border-amber/40 bg-amber-wash text-amber'
      : 'border-line bg-panel text-ink-3'
  return <p className={`pointer-events-auto rounded-pop border px-4 py-2 text-[12px] shadow-pill ${tone}`}>{props.children}</p>
}

function GuestFileDropBlock() {
  return (
    <div
      role="alert"
      className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-danger bg-black/70 px-6 text-center backdrop-blur-md"
    >
      <svg viewBox="0 0 24 24" className="size-12 text-danger" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m6.5 6.5 11 11" />
      </svg>
      <span className="text-[15px] font-semibold text-white drop-shadow">게스트 모드에서는 파일을 업로드할 수 없습니다</span>
      <span className="text-[12px] text-white/70">파일 등록은 로그인 후 이용해 주세요</span>
    </div>
  )
}

function MoonIcon() {
  return <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z" /></svg>
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
}
