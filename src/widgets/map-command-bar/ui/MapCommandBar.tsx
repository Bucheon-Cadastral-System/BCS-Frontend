import type { ReactNode } from 'react'
import type Map from 'ol/Map'
import type { MapTheme } from '@/entities/control-point'
import type { TmEpsg } from '@/shared/lib/crs'
import { ThemeIcon } from '@/shared/ui/ThemeIcon'
import { PILL } from '@/shared/ui/classes'
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
 * 레이어·점 상태는 지도에 무엇을 얹을지 고르는 값이라 한 묶음으로 세우고, 배경 밝기는 화면 자체의 밝기라
 * 한 번의 동작인 위치 초기화 옆에 아이콘으로만 둔다. 좌표·축척은 늘 읽는 값이라 지도 위에 항상 드러내 둔다.
 */
export function MapCommandBar(props: {
  map: Map | null
  tmEpsg: TmEpsg
  theme: MapTheme
  onToggleTheme: () => void
  /**
   * 레이어 버튼 자리 — 표시 설정 묶음의 첫 자리.
   * 무엇을 세울지는 페이지가 정한다.
   */
  layers?: ReactNode
  /**
   * 기준점 상태 버튼 자리 — 레이어 다음.
   * 둘 다 지도에 무엇을 얹을지 고르는 값이라 한 묶음으로 선다.
   */
  surveyStatus?: ReactNode
  /** 눈높이를 되돌리기 — 현재 위치를 잡았으면 그 자리로, 아니면 처음 보던 자리로. 어디로 갈지는 지도가 정한다 */
  onResetView: () => void
}) {
  const dark = props.theme === 'dark'

  return (
    <div className={`flex h-[34px] w-max items-center gap-2 px-2.5 ${PILL}`}>
      {/* 켜고 끄는 값이 아니라 한 번의 동작이라 표시 설정과는 선으로 가른다 */}
      <button
        type="button"
        onClick={props.onResetView}
        title="위치 초기화"
        aria-label="위치 초기화"
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
        <ThemeIcon dark={dark} className="size-4" strokeWidth={1.7} />
      </button>

      <Divider />

      {props.layers}
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
