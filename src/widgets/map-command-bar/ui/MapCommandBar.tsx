import type { ReactNode } from 'react'
import type Map from 'ol/Map'
import type { MapTheme } from '@/entities/control-point'
import type { TmEpsg } from '@/shared/lib/crs'
import { MAP_BAR_BTN, PILL } from '@/shared/ui/classes'
import { PointerCoordinates } from './PointerCoordinates'
import { ScaleReadout } from './ScaleReadout'

/** 한 단계 확대·축소 — 지도 컨트롤을 지도 구석에 따로 두지 않고 이 줄에 모은다 */
function zoomBy(map: Map | null, step: number) {
  const view = map?.getView()
  const zoom = view?.getZoom()
  if (!view || zoom === undefined) return
  view.animate({ zoom: zoom + step, duration: 200 })
}

/**
 * 지도 아래 커맨드 바 — 표시 설정과 읽을거리를 한 줄에 모은다.
 * 지적도·점 상태는 지도에 무엇을 얹을지 고르는 값이라 한 묶음으로 세우고, 배경 밝기는 화면 자체의 밝기라
 * 한 번의 동작인 위치 초기화 옆에 아이콘으로만 둔다. 좌표·축척은 늘 읽는 값이라 지도 위에 항상 드러내 둔다.
 */
export function MapCommandBar(props: {
  map: Map | null
  tmEpsg: TmEpsg
  showCadastral: boolean
  onToggleCadastral: () => void
  theme: MapTheme
  onToggleTheme: () => void
  /**
   * 기준점 상태 버튼 자리 — 지적도 다음.
   * 둘 다 지도에 무엇을 얹을지 고르는 값이라 한 묶음으로 서고, 무엇을 세울지는 페이지가 정한다.
   */
  surveyStatus?: ReactNode
  /** 처음 보던 자리로 되돌리기 — 어디까지 옮겨야 하는지는 판이 가린 폭을 아는 지도가 정한다 */
  onResetView: () => void
}) {
  const dark = props.theme === 'dark'

  return (
    <div className={`flex h-[34px] w-max items-center gap-2 px-2.5 ${PILL}`}>
      {/* 켜고 끄는 값이 아니라 한 번의 동작이라 표시 설정과는 선으로 가른다 */}
      <button
        type="button"
        onClick={props.onResetView}
        title="처음 보던 자리로 이동"
        aria-label="처음 보던 자리로 이동"
        className="flex size-6 shrink-0 items-center justify-center rounded-ctl text-ink-2 transition-colors hover:bg-hover hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {/* 아이콘이 지금 배경을 그대로 나타낸다(누르면 반대로 바뀜).
          지적도·점 상태와 달리 무엇을 얹고 걷는 값이 아니라 화면 자체의 밝기라, 글자 없이 위치 초기화 옆에 둔다 */}
      <button
        type="button"
        onClick={props.onToggleTheme}
        aria-pressed={dark}
        title="배경 밝기"
        aria-label="배경 밝기"
        className="flex size-6 shrink-0 items-center justify-center rounded-ctl text-ink-2 transition-colors hover:bg-hover hover:text-ink"
      >
        {dark ? (
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        )}
      </button>

      <Divider />

      <button
        type="button"
        onClick={props.onToggleCadastral}
        aria-pressed={props.showCadastral}
        title="지적도"
        aria-label="지적도"
        className={`${MAP_BAR_BTN} ${
          props.showCadastral ? 'bg-teal-wash-strong text-teal-text' : 'text-ink-2 hover:bg-hover hover:text-ink'
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 13 9 5 9-5" />
        </svg>
        <span className="max-lg:hidden">지적도</span>
      </button>

      {props.surveyStatus}

      <Divider />

      <span className="flex shrink-0 overflow-hidden rounded-ctl border border-line-field text-ink-2">
        <ZoomButton label="확대" onClick={() => zoomBy(props.map, 1)}>
          <path d="M12 5v14M5 12h14" />
        </ZoomButton>
        <span className="w-px bg-line" />
        <ZoomButton label="축소" onClick={() => zoomBy(props.map, -1)}>
          <path d="M5 12h14" />
        </ZoomButton>
      </span>

      <Divider />
      <PointerCoordinates map={props.map} tmEpsg={props.tmEpsg} />
      <Divider />
      <ScaleReadout map={props.map} />
    </div>
  )
}

function Divider() {
  return <span className="h-4 w-px shrink-0 bg-line" aria-hidden />
}

function ZoomButton(props: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      title={props.label}
      aria-label={props.label}
      className="flex size-6 items-center justify-center transition-colors hover:bg-hover"
    >
      <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
        {props.children}
      </svg>
    </button>
  )
}
