import type Map from 'ol/Map'
import type { MapTheme } from '@/entities/control-point'
import type { TmEpsg } from '@/shared/lib/crs'
import { PointerCoordinates } from './PointerCoordinates'
import { ScaleReadout } from './ScaleReadout'

/** 한 단계 확대·축소 — 지도 컨트롤을 지도 구석에 따로 두지 않고 이 줄에 모은다 */
function zoomBy(map: Map | null, step: number) {
  const view = map?.getView()
  const zoom = view?.getZoom()
  if (!view || zoom === undefined) return
  view.animate({ zoom: zoom + step, duration: 200 })
}

// 좁은 화면에서는 글자를 접고 아이콘만 남긴다 — 판은 이 줄 위에서 끝나므로 판 열림은 이 판단에 넣지 않는다
const CTL =
  'flex h-6 shrink-0 items-center gap-[6px] whitespace-nowrap rounded-ctl px-2.5 text-[12px] font-medium transition-colors max-lg:gap-0 max-lg:px-1.5'

/**
 * 지도 아래 커맨드 바 — 표시 설정과 읽을거리를 한 줄에 모은다.
 * 지적도·배경 밝기는 지도를 보면서 켜고 끄는 값이고, 좌표·축척은 늘 읽는 값이라 지도 위에 항상 드러내 둔다.
 */
export function MapCommandBar(props: {
  map: Map | null
  tmEpsg: TmEpsg
  showCadastral: boolean
  onToggleCadastral: () => void
  theme: MapTheme
  onToggleTheme: () => void
}) {
  const dark = props.theme === 'dark'

  return (
    <div className="flex h-[34px] w-max items-center gap-2 rounded-pill border border-line-pill bg-pill px-2.5 shadow-pill backdrop-blur-[12px]">
      <button
        type="button"
        onClick={props.onToggleCadastral}
        aria-pressed={props.showCadastral}
        title="지적도"
        aria-label="지적도"
        className={`${CTL} ${
          props.showCadastral ? 'bg-teal-wash-strong text-teal-text' : 'text-ink-2 hover:bg-hover hover:text-ink'
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 13 9 5 9-5" />
        </svg>
        <span className="max-lg:hidden">지적도</span>
      </button>

      {/* 라벨·아이콘이 지금 배경을 그대로 나타낸다(누르면 반대로 바뀜) */}
      <button
        type="button"
        onClick={props.onToggleTheme}
        aria-pressed={dark}
        title={dark ? '다크' : '라이트'}
        aria-label={dark ? '다크' : '라이트'}
        className={`${CTL} text-ink-2 hover:text-ink`}
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
        <span className="max-lg:hidden">{dark ? '다크' : '라이트'}</span>
      </button>

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
