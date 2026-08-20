import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MAP_BAR_BTN, POPOVER_FLAT } from '@/shared/ui/classes'
import { CheckMark } from '@/shared/ui/CheckMark'
import { useDismiss } from '@/shared/lib/useDismiss'

/**
 * 레이어 견본 — 20×14 상자로 지도에 그려지는 선을 그대로 줄여 보인다.
 *
 * <p>지적도는 필지가 갈린 모양이라 상자에 가로선 하나와 세로선 둘을 넣는다.
 * 테두리를 1~19 × 1~13 에 두면 가로 18·세로 12 라 칸이 6씩 정확히 갈린다(세로선 7·13, 가로선 7).
 *
 * <p>법정동 경계는 파선 한 줄이다. 파선을 네모로 두르면 주기가 모서리에서 끊겨 한쪽으로 쏠려 보인다.
 * 길이 18 은 주기 6(칠 4·빈 2)이 세 번 들어가 양끝이 모두 칠로 맺힌다.
 *
 * <p>색은 줄의 글자색을 따르지 않는다. 지도에 그려질 선의 색을 그대로 보이는 것이 견본이 하는 일이다.
 */
export const CADASTRAL_SWATCH = (
  <svg viewBox="0 0 20 14" className="h-[14px] w-5 shrink-0" fill="none" stroke="var(--color-teal-btn-edge)" strokeWidth="1" aria-hidden="true">
    <rect x="1" y="1" width="18" height="12" rx="1.5" />
    <path d="M1 7h18M7 1v12M13 1v12" />
  </svg>
)
export const DISTRICT_SWATCH = (
  <svg viewBox="0 0 20 14" className="h-[14px] w-5 shrink-0" fill="none" stroke="var(--color-ink-3)" strokeWidth="1.4" strokeDasharray="4 2" aria-hidden="true">
    <path d="M1 7h18" />
  </svg>
)

/**
 * 지적도가 그려지기 시작하는 축척 — 이보다 멀리서는 켜 두어도 빈 이미지가 온다.
 * 서버가 정한 값이라 화면이 바꿀 수 없고, 줌 단계는 사용자가 모르는 값이라 하단 바와 같은 축척으로 적는다.
 * 값은 실측이다. 같은 자리를 축척만 바꿔 요청하면 1:2,550 까지는 빈 이미지(6,727바이트)가 오고 1:2,500 부터 필지가 실린다.
 */
export const CADASTRAL_MIN_SCALE = 2500

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
 *
 * <p>좁은 화면에서는 커맨드 바가 서지 않아 아래 독 안에 선다(variant='dock'). 그때는 손가락으로 짚는
 * 자리라 바의 24px 버튼 대신 38px 정사각을 쓰고, 독이 이미 면과 테두리를 두르고 있으므로 제 것은 두지 않는다.
 */
export function MapLayerPicker(props: { layers: MapLayerItem[]; variant?: 'bar' | 'dock' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  // 버튼도 이 안에 있어 버튼 클릭이 접기와 겹쳐 두 번 뒤집히지 않는다
  useDismiss({ enabled: open, onDismiss: () => setOpen(false), ref: rootRef })

  const anyOn = props.layers.some((layer) => layer.on)
  const dock = props.variant === 'dock'

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
        className={
          dock
            ? // 아래 독 안의 한 자리다 — 제 테두리·그늘을 두지 않는다. 켜짐은 독 안의 다른 자리와 같은 옅은 면이고,
              // 그 밑에 독의 면이 깔려 있어 지도가 비치지 않는다
              `flex size-[38px] shrink-0 items-center justify-center rounded-ctl transition-colors ${
                anyOn ? 'bg-teal-wash-strong text-teal-text' : 'text-ink-3 hover:text-ink-2'
              }`
            : `${MAP_BAR_BTN} ${anyOn ? 'bg-teal-wash-strong font-semibold text-teal-text' : 'text-ink-2 hover:bg-hover hover:text-ink'}`
        }
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 13 9 5 9-5" />
        </svg>
        {!dock && <span className="max-lg:hidden">레이어</span>}
      </button>

      {open && (
        <div
          role="group"
          aria-label="지도 레이어 고르기"
          // 안쪽 여백을 두지 않는다 — 줄이 말풍선 변까지 닿아야 패널 안의 패널로 보이지 않는다.
          // 모서리는 첫·끝 줄이 스스로 깎는다
          // 독도 커맨드 바도 화면 아래쪽에 서므로 위로 편다. 독 안의 버튼은 오른쪽 변 가까이 서므로
          // 오른쪽 변에 맞춘다 — 왼쪽으로 열면 화면 밖으로 넘친다
          className={`absolute bottom-[calc(100%+8px)] flex w-[208px] flex-col ${
            dock ? 'right-0' : 'left-1/2 -translate-x-1/2'
          } ${POPOVER_FLAT}`}
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
