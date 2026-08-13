import { useRef, useState } from 'react'
import { MAP_BAR_BTN, POPOVER_TAILED } from '@/shared/ui/classes'
import { CheckMark } from '@/shared/ui/CheckMark'
import { useDismiss } from '@/shared/lib/useDismiss'

/** 지도에 얹고 걷을 수 있는 겹 하나 */
export interface MapLayerItem {
  key: string
  label: string
  on: boolean
  onToggle: () => void
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
        aria-pressed={anyOn}
        aria-expanded={open}
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
          // 안쪽 여백을 두지 않는다 — 줄이 말풍선 변까지 닿아야 판 안의 판으로 보이지 않는다.
          // overflow-hidden 은 걸지 않는다(꼬리가 잘린다). 모서리는 첫·끝 줄이 스스로 깎는다
          className={`absolute bottom-[calc(100%+11px)] left-1/2 flex w-[152px] -translate-x-1/2 flex-col ${POPOVER_TAILED}`}
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
                className={`flex h-[34px] items-center gap-2 px-3 text-left transition-colors hover:bg-hover ${
                  index === 0 ? 'rounded-t-pop' : 'border-t border-line-row'
                } ${last ? 'rounded-b-pop' : ''} ${layer.on ? 'bg-teal-wash' : ''}`}
              >
                <CheckMark on={layer.on} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">{layer.label}</span>
              </button>
            )
          })}

          {/* 꼬리 — 아래를 가리켜 이 말풍선이 어느 버튼에서 나왔는지 잇는다.
              마름모의 아래 두 변만 테두리로 남기고 나머지 두 변은 끝 줄의 면에 묻힌다.
              면을 끝 줄과 같은 순서로 쌓는다. bg-teal-wash 는 다크에서 반투명이라 그것만 칠하면 지도가 비쳐
              마름모가 어둡게 뜨고, bg-panel-strong 만 칠하면 켜진 줄보다 옅어 이음매가 남는다 */}
          <span
            className="absolute -bottom-[6px] left-1/2 size-[11px] -translate-x-1/2 rotate-45 border-b border-r border-line bg-panel-strong"
            aria-hidden
          >
            {props.layers.at(-1)?.on === true && <span className="block size-full bg-teal-wash" />}
          </span>
        </div>
      )}
    </span>
  )
}
