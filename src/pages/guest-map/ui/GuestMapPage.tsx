import { useEffect, useMemo, useRef, useState } from 'react'
import type OlMap from 'ol/Map'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { toggleTheme } from '@/app/store'
import { PointTypeIcon } from '@/entities/control-point'
import type { MappableControlPoint } from '@/entities/control-point'
import type { SurveyResult } from '@/entities/survey-record'
import { AppHeader } from '@/widgets/app-header'
import { ControlPointMap } from '@/widgets/control-point-map'
import { PointSearchBar } from '@/widgets/point-search'
import { MapCommandBar } from '@/widgets/map-command-bar'
import { withoutTransition } from '@/shared/lib/instantChange'
import { PANEL, PANEL_HEADER, PANEL_HEADER_RULE } from '@/shared/ui/classes'
import { VWORLD_KEY } from '@/shared/config/map'
import { useGuestControlPointQuery, useGuestControlPointsQuery } from '../api/queries'
import type { GuestControlPoint, GuestPointType } from '../model/guestControlPoint'

const EMPTY_RESULTS: ReadonlyMap<string, SurveyResult> = new Map()
const TYPE_ORDER: GuestPointType[] = ['지적삼각점', '지적삼각보조점', '지적도근점']
const nameCollator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' })
const ROW_HEIGHT = 54

export function GuestMapPage() {
  const location = useLocation()
  const dispatch = useAppDispatch()
  const theme = useAppSelector((state) => state.ui.theme)
  const pointsQuery = useGuestControlPointsQuery()
  const points = useMemo(
    () => [...(pointsQuery.data ?? [])].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || nameCollator.compare(a.name, b.name)),
    [pointsQuery.data],
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = points.find((point) => point.id === selectedId) ?? null
  const detailQuery = useGuestControlPointQuery(selected?.pointNo ?? null)
  const shownPoint = detailQuery.data ?? selected
  const [focusNonce, setFocusNonce] = useState(0)
  const [homeNonce, setHomeNonce] = useState(0)
  const [showCadastral, setShowCadastral] = useState(true)
  const [map, setMap] = useState<OlMap | null>(null)
  const notice = new URLSearchParams(location.search).get('notice')

  useEffect(() => {
    if (selectedId !== null && !points.some((point) => point.id === selectedId)) setSelectedId(null)
  }, [points, selectedId])

  function focusPoint(point: MappableControlPoint) {
    setSelectedId(point.id)
    setFocusNonce((value) => value + 1)
  }

  return (
    <div className={`h-full w-full overflow-hidden ${theme === 'dark' ? 'theme-dark' : 'theme-light'} app-bg text-ink`}>
      <AppHeader
        user={null}
        guest
        search={(
          <PointSearchBar
            points={points}
            onSelect={focusPoint}
            className="w-[250px] max-sm:absolute max-sm:right-0 max-sm:top-[52px] max-sm:w-[calc(100vw-24px)]"
          />
        )}
      />

      <div className="absolute inset-0">
        <ControlPointMap
          points={points}
          visibleIds={null}
          addMode={false}
          showCadastral={showCadastral}
          selectedId={selectedId}
          surveyMode={false}
          resultById={EMPTY_RESULTS}
          theme={theme}
          focusNonce={focusNonce}
          homeNonce={homeNonce}
          onAddPoint={() => undefined}
          onSelect={setSelectedId}
          onMapReady={setMap}
        />
      </div>

      <GuestPointPanel points={points} loading={pointsQuery.isPending} onFocus={focusPoint} />

      <div className="pointer-events-none absolute inset-x-3 top-[76px] z-[30] flex flex-col items-center gap-1.5 max-sm:top-[128px]">
        {notice === 'authentication-required' && (
          <p role="status" className="pointer-events-auto rounded-pop border border-amber/40 bg-amber-wash px-4 py-2 text-[12px] text-amber shadow-pill">
            로그인 상태가 만료되었습니다. 공개 기준점은 계속 둘러볼 수 있습니다.
          </p>
        )}
        {!VWORLD_KEY && (
          <p className="pointer-events-auto rounded-pop border border-amber/40 bg-amber-wash px-4 py-2 text-[12px] text-amber shadow-pill">
            배경지도를 기본 지도로 표시하고 있습니다.
          </p>
        )}
        {pointsQuery.isPending && <GuestBanner>공개 기준점을 불러오는 중…</GuestBanner>}
        {pointsQuery.isError && <GuestBanner danger>공개 기준점을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</GuestBanner>}
      </div>

      <div className="absolute right-4 top-[76px] z-20 max-sm:left-3 max-sm:right-3 max-sm:top-[132px]">
        <GuestPointDetail
          point={shownPoint}
          loading={selected !== null && detailQuery.isPending}
          error={selected !== null && detailQuery.isError}
          onClose={() => setSelectedId(null)}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-[18px] z-20 flex justify-center">
        <div className="pointer-events-auto max-w-full overflow-x-auto rounded-pill">
          <MapCommandBar
            map={map}
            tmEpsg="EPSG:5186"
            showCadastral={showCadastral}
            onToggleCadastral={() => setShowCadastral((value) => !value)}
            theme={theme}
            onToggleTheme={() => withoutTransition(() => dispatch(toggleTheme()))}
            onResetView={() => setHomeNonce((value) => value + 1)}
          />
        </div>
      </div>
    </div>
  )
}

function GuestBanner(props: { children: React.ReactNode; danger?: boolean }) {
  return (
    <p className={`pointer-events-auto rounded-pop border px-4 py-2 text-[12px] shadow-pill ${props.danger ? 'border-danger-edge bg-danger-wash text-danger' : 'border-line bg-panel text-ink-3'}`}>
      {props.children}
    </p>
  )
}

function GuestPointPanel(props: {
  points: GuestControlPoint[]
  loading: boolean
  onFocus: (point: GuestControlPoint) => void
}) {
  const [query, setQuery] = useState('')
  const keyword = query.trim().toLowerCase()
  const filtered = useMemo(
    () => keyword === '' ? props.points : props.points.filter((point) => point.name.toLowerCase().includes(keyword) || point.pointNo.toLowerCase().includes(keyword) || point.regionName.toLowerCase().includes(keyword)),
    [keyword, props.points],
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => filtered[index].id,
  })

  return (
    <aside className={`absolute bottom-bar-clear left-4 top-[76px] z-20 flex w-[340px] flex-col overflow-hidden ${PANEL} max-sm:bottom-auto max-sm:left-3 max-sm:right-3 max-sm:top-[132px] max-sm:h-[42vh] max-sm:w-auto`}>
      <header className={`${PANEL_HEADER} ${PANEL_HEADER_RULE}`}>
        <h2 className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="text-[13.5px] font-semibold">공개 기준점</span>
          <span className="text-[11px] text-ink-3">총 {props.points.length}개</span>
        </h2>
        <span className="rounded-chip bg-teal-wash px-2 py-1 text-[10.5px] font-semibold text-teal-text">GUEST</span>
      </header>
      <div className="shrink-0 p-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="공개 기준점 검색"
          placeholder="이름·관리번호·법정동 검색"
          className="h-[36px] w-full rounded-ctl border border-line-field bg-field px-3 text-[12.5px] text-ink outline-none placeholder:text-ink-4 focus:border-teal-edge"
        />
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto border-t-2 border-t-teal">
        {filtered.length === 0 ? (
          <p className="px-4 py-7 text-center text-[12.5px] text-ink-3">{props.loading ? '불러오는 중…' : keyword ? '검색 결과 없음' : '공개 기준점 없음'}</p>
        ) : (
          <ul className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const point = filtered[item.index]
              return (
                <li key={item.key} className="absolute left-0 top-0 w-full" style={{ height: ROW_HEIGHT, transform: `translateY(${item.start}px)` }}>
                  <button type="button" onClick={() => props.onFocus(point)} className="flex h-full w-full items-center gap-2.5 border-b border-line-row px-3.5 text-left transition-colors hover:bg-hover">
                    <PointTypeIcon type={point.type} className="size-4 shrink-0 text-teal-text" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink-2">{point.name}</span>
                      <span className="block truncate text-[11px] text-ink-3">{point.pointNo}</span>
                    </span>
                    <span className="max-w-[76px] truncate text-[11px] text-ink-3">{point.regionName}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}

function GuestPointDetail(props: {
  point: GuestControlPoint | null
  loading: boolean
  error: boolean
  onClose: () => void
}) {
  if (props.point === null) return null
  const point = props.point
  return (
    <aside className={`panel-in w-[320px] overflow-hidden ${PANEL} max-sm:w-full`}>
      <header className={`${PANEL_HEADER} ${PANEL_HEADER_RULE}`}>
        <PointTypeIcon type={point.type} className="size-[18px] shrink-0 text-teal-text" />
        <h2 className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold">{point.name}</span>
          <span className="block truncate text-[11px] text-ink-3">{point.type}</span>
        </h2>
        <button type="button" onClick={props.onClose} aria-label="상세 닫기" title="닫기" className="flex size-7 items-center justify-center rounded-chip text-ink-3 hover:bg-danger-wash hover:text-danger">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </header>
      <div className="px-4 py-3.5">
        {props.loading && <p className="mb-3 text-[11.5px] text-ink-3">상세 정보를 확인하는 중…</p>}
        {props.error && <p role="alert" className="mb-3 text-[11.5px] text-danger">상세 정보를 불러오지 못해 목록의 공개 정보를 표시합니다.</p>}
        <dl className="grid grid-cols-[72px_1fr] gap-x-2.5 gap-y-2 text-[12.5px] [&_dd]:min-w-0 [&_dd]:break-words [&_dd]:text-ink-2 [&_dt]:text-ink-3">
          <dt>관리번호</dt><dd>{point.pointNo}</dd>
          <dt>기준점 종류</dt><dd>{point.type}</dd>
          <dt>법정동명</dt><dd>{point.regionName || '정보 없음'}</dd>
          <dt>상세 소재지</dt><dd>{point.address || '정보 없음'}</dd>
          <dt>경도</dt><dd>{point.lng.toFixed(7)}</dd>
          <dt>위도</dt><dd>{point.lat.toFixed(7)}</dd>
        </dl>
        <p className="mt-4 border-t border-line-soft pt-3 text-[11px] leading-5 text-ink-3">게스트에게 공개된 위치·소재지 정보만 표시됩니다.</p>
      </div>
    </aside>
  )
}
