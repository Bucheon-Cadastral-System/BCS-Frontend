import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type OlMap from 'ol/Map'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { selectTheme, toggleTheme } from '@/shared/model/theme'
import {
  PUBLIC_CONTROL_POINTS_KEY,
  usePublicControlPointQuery,
  usePublicControlPointsQuery,
} from '@/entities/control-point'
import type { SurveyResult } from '@/entities/survey-record'
import type { SurveyProject } from '@/entities/survey-project'
import { AppHeader, PointIcon, ProjectIcon } from '@/widgets/app-header'
import { ControlPointMap } from '@/widgets/control-point-map'
import { ControlPointDetail } from '@/widgets/control-point-detail'
import { MapSidebar, MinimizedPanelChip } from '@/widgets/map-sidebar'
import { PointSearchBar } from '@/widgets/point-search'
import { MapCommandBar } from '@/widgets/map-command-bar'
import { MapLayerPicker, CADASTRAL_MIN_SCALE, CADASTRAL_SWATCH, DISTRICT_SWATCH } from '@/widgets/map-layer-picker'
import { MobileBottomNav } from '@/widgets/mobile-bottom-nav'
import { MobileSummaryChip } from '@/widgets/mobile-summary-chip'
import { withoutTransition } from '@/shared/lib/instantChange'
import { useNarrowScreen } from '@/shared/lib/useNarrowScreen'
import { useLockedDocument } from '@/shared/lib/useLockedDocument'
import { LIST_SHEET_RATIO, useBottomSheet } from '@/shared/lib/useBottomSheet'
import { useViewportHeight } from '@/shared/lib/useViewportHeight'
import { useFileDrop } from '@/shared/lib/useFileDrop'
import { VWORLD_KEY } from '@/shared/config/map'
import { FileDropOverlay } from '@/shared/ui/FileDropOverlay'
import { PANEL_MARGIN } from '@/shared/ui/layout'
import { MapBanner } from '@/shared/ui/MapBanner'
import { Spinner } from '@/shared/ui/Spinner'
import { ThemeToggleButton } from '@/shared/ui/ThemeToggleButton'
import { Toast } from '@/shared/ui/Toast'
import type { ToastTone } from '@/shared/ui/Toast'

const EMPTY_RESULTS: ReadonlyMap<string, SurveyResult> = new Map()
const EMPTY_PROJECTS: SurveyProject[] = []
const EMPTY_IDS: ReadonlySet<string> = new Set()


/**
 * 공개 API만 사용하는 게스트 지도.
 *
 * 회원 화면과 지도·기준점 목록·상세 패널을 공유하지만 프로젝트·조사·사진·챗봇은 이 트리에 마운트하지 않는다.
 * 파일은 드롭을 받되 등록하지 않고 받을 수 없다는 사실만 알린다. 따라서 게스트 화면에서 보호 API가 우발적으로 실행될 길도 없다.
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
  const points = useMemo(() => pointsQuery.data ?? [], [pointsQuery.data])

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
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null)
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

  // 게스트는 파일을 받지 않는다 — 끌어 오는 동안 받을 수 없음을 덮어 알리고 놓으면 그 사실만 남긴다
  const fileDrop = useFileDrop(() => setToast({ message: '게스트 모드에서는 파일을 업로드할 수 없습니다.', tone: 'error' }), { reject: true })

  async function refreshPoints() {
    if (refreshing) return
    setRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: PUBLIC_CONTROL_POINTS_KEY })
      const failed = queryClient.getQueryState(PUBLIC_CONTROL_POINTS_KEY)?.status === 'error'
      if (failed) setToast({ message: '공개 기준점을 다시 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', tone: 'error' })
      else setToast({ message: '공개 기준점을 다시 불러왔습니다.', tone: 'success' })
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

  /**
   * 지도에 보일 점 — 패널을 닫으면 아무것도 보이지 않는다.
   *
   * <p>고른 점만은 예외다. 헤더 검색은 패널을 열지 않고 점을 지목하므로, 빼면 지목한 자리에 아무것도 나타나지 않는다.
   */
  const visibleIds = useMemo<ReadonlySet<string> | null>(() => {
    if (panel !== null) return null
    return selectedId === null ? EMPTY_IDS : new Set([selectedId])
  }, [panel, selectedId])

  const layers = [
    { key: 'cadastral', label: '지적도', note: `~1:${CADASTRAL_MIN_SCALE.toLocaleString('ko-KR')}`, on: showCadastral, onToggle: () => setShowCadastral((value) => !value), swatch: CADASTRAL_SWATCH },
    { key: 'district', label: '법정동 경계', on: showDistrict, onToggle: () => setShowDistrict((value) => !value), swatch: DISTRICT_SWATCH },
  ]

  return (
    <div
      className="app-bg relative flex h-full min-w-app-min flex-col text-ink max-lg:min-w-0"
      {...fileDrop.dropHandlers}
    >
      {fileDrop.dragging && (
        <FileDropOverlay tone="reject" label="게스트 모드에서는 파일을 업로드할 수 없습니다." hint="파일 등록은 로그인 후 이용해 주세요." />
      )}
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
          search={<PointSearchBar points={points} onSelect={(point) => focusPoint(point)} />}
          onBrandWidthChange={setHeaderWidth}
        />

        <div className="absolute inset-0">
          <ControlPointMap
            points={points}
            visibleIds={visibleIds}
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
              <MapBanner tone="warn">로그인 상태가 만료되었습니다. 공개 기준점은 계속 볼 수 있습니다.</MapBanner>
            )}
            {!VWORLD_KEY && (
              <MapBanner tone="warn">VWorld 배경지도 설정이 없어 OSM 배경지도로 표시합니다. 지적도와 법정동 경계는 표시되지 않습니다.</MapBanner>
            )}
            {pointsQuery.isPending && (
              <MapBanner tone="muted">
                <span className="flex items-center gap-1.5"><Spinner className="size-3" current />공개 기준점을 불러오는 중</span>
              </MapBanner>
            )}
            {pointsQuery.isError && <MapBanner tone="danger">공개 기준점을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</MapBanner>}
            {detailQuery.isError && selected !== null && <MapBanner tone="danger">기준점 상세 정보를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</MapBanner>}
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
                value="지도에 표시 중"
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
                value="지도에 표시 중"
                trailing={{ count: points.length }}
                onOpen={() => setPanel({ minimized: false })}
              />
            </div>
          )}

          <ThemeToggleButton
            dark={theme === 'dark'}
            onToggle={() => withoutTransition(() => dispatch(toggleTheme()))}
            className={`absolute left-[12px] z-[30] transition-[top] duration-200 lg:hidden ${panel === null ? 'top-[64px]' : 'top-[110px]'}`}
          />

          <div
            className={`absolute z-[15] lg:top-[76px] lg:right-[var(--detail-right)] max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-auto max-lg:z-[46] max-lg:overflow-hidden ${detailSheet.sheet.className}`}
            style={{ '--detail-right': `${PANEL_MARGIN}px`, ...detailSheet.sheet.style } as CSSProperties}
          >
            <ControlPointDetail
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
              onCopied={(ok) => setToast(ok ? { message: '클립보드로 복사되었습니다.', tone: 'success' } : { message: '클립보드로 복사하지 못했습니다.', tone: 'error' })}
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
          points={points}
          targetPoints={points}
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

      {toast !== null && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}




