import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MAP_BAR_BTN, POPOVER_FLAT } from '@/shared/ui/classes'
import { CheckMark } from '@/shared/ui/CheckMark'
import { useDismiss } from '@/shared/lib/useDismiss'

/** 지도에 얹고 걷을 수 있는 겹 하나 */
export interface MapLayerItem {
  key: string
  label: string
  on: boolean
  onToggle: () => void
  /** 지도에 어떤 선으로 그려지는지 보이는 견본 — 이름만으로는 켜 보기 전에 알 수 없다 */
  swatch: ReactNode
  /** 이름 뒤 괄호에 덧붙이는 조건(표시되는 축척 등) — 켜 두어도 안 보이는 이유를 그 자리에서 알린다 */
  note?: string
}

/**
 * 지도에 얹을 겹 고르기 — 커맨드 바의 버튼과, 그 위로 열리는 말풍선.
 *
 * <p>겹은 늘어난다. 지적도 하나였을 때는 버튼 하나로 족했으나 법정동 경계가 붙으면서 둘이 되었고,
 * 바에 버튼을 하나씩 늘리면 줄이 길어지는 만큼 좌표·축척이 밀린다. 한 자리에 모아 접어 둔다.
 *
 * <p>버튼은 켜고 끄지 않는다. 누르면 말풍선만 여닫고, 무엇을 얹을지는 안에서 겹마다 고른다.
 * 하나라도 켜져 있으면 버튼에 색이 남아, 접어 둔 동안에도 무언가 얹혀 있음이 보인다.
 */
export function MapLayerPicker(props: { layers: MapLayerItem[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  // 버튼도 이 안에 있어 버튼 클릭이 접기와 겹쳐 두 번 뒤집히지 않는다
  useDismiss({ enabled: open, onDismiss: () => setOpen(false), ref: rootRef })

  const anyOn = props.layers.some((layer) => layer.on)

  return (
    <span ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        // 이 버튼은 말풍선만 여닫는다 — 켜고 끄는 것은 그 안의 줄이라 눌림 상태를 알리지 않는다
        aria-expanded={open}
        aria-haspopup="true"
        title="레이어"
        aria-label="레이어"
        className={`${MAP_BAR_BTN} ${
          anyOn ? 'bg-teal-wash-strong font-semibold text-teal-text' : 'text-ink-2 hover:bg-hover hover:text-ink'
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 13 9 5 9-5" />
        </svg>
        <span className="max-lg:hidden">레이어</span>
      </button>

      {open && (
        <div
          role="group"
          aria-label="지도 레이어 고르기"
          // 안쪽 여백을 두지 않는다 — 줄이 말풍선 변까지 닿아야 패널 안의 패널로 보이지 않는다.
          // 모서리는 첫·끝 줄이 스스로 깎는다
          className={`absolute bottom-[calc(100%+8px)] left-1/2 flex w-[208px] -translate-x-1/2 flex-col ${POPOVER_FLAT}`}
        >
          {props.layers.map((layer, index) => {
            const last = index === props.layers.length - 1
            return (
              <button
                key={layer.key}
                type="button"
                onClick={layer.onToggle}
                aria-pressed={layer.on}
                // 대상 기준점 고르기의 줄과 같은 규격이다 — 여럿을 켜고 끄는 목록은 이 앱에서 한 모양으로 선다
                className={`flex h-[38px] items-center gap-[9px] px-3 text-left transition-colors hover:bg-hover ${
                  index === 0 ? 'rounded-t-pop' : 'border-t border-line-row'
                } ${last ? 'rounded-b-pop' : ''} ${layer.on ? 'bg-teal-wash' : ''}`}
              >
                <CheckMark on={layer.on} />
                {layer.swatch}
                <span className={`min-w-0 flex-1 truncate text-[12.5px] ${layer.on ? 'text-ink' : 'text-ink-3'}`}>
                  {layer.label}
                  {layer.note !== undefined && <span className="ml-1 text-[11px] text-ink-4">({layer.note})</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </span>
  )
}
