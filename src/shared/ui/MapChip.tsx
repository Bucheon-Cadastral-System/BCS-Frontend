import type { ReactNode } from 'react'

/**
 * 지도 위에 떠 있는 상태 칩의 공통 껍데기 (좌상단 오버레이).
 * 카드 전체가 누를 수 있는 영역이고, 오른쪽 동작(닫기 등)은 그 위에 겹쳐 둔다 —
 * 버튼 안에 버튼을 넣을 수 없어 형제로 두되, 자리를 나눠 가지면 커서를 올렸을 때 카드 일부만 밝아진다.
 */
export function MapChip(props: {
  label: string
  value: string
  /** 값 왼쪽 표식(점·아이콘) */
  leading?: ReactNode
  /** 값 오른쪽 부가 표시(진행률·펼침 화살표) */
  trailing?: ReactNode
  /** 칩 오른쪽 끝의 별도 동작 버튼 */
  action?: ReactNode
  accent?: 'default' | 'active'
  title?: string
  onClick: () => void
  'aria-expanded'?: boolean
}) {
  const active = props.accent === 'active'
  return (
    <div
      className={`relative flex w-full items-center rounded-pop border bg-pill shadow-pill backdrop-blur-[10px] ${
        active ? 'border-teal-edge' : 'border-line-pill'
      }`}
    >
      <button
        type="button"
        onClick={props.onClick}
        title={props.title}
        aria-expanded={props['aria-expanded']}
        // 오른쪽 동작 버튼은 자리를 차지하지 않고 겹쳐 있으므로, 글자가 그 밑에 깔리지 않게 여백으로 자리를 비운다
        className={`flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-pop pl-3.5 transition-colors hover:bg-white/[0.04] ${
          props.action ? 'pr-11' : 'pr-4'
        }`}
      >
        {props.leading}
        <span className="min-w-0 text-left">
          <span className="block text-[10px] font-medium leading-tight text-ink-4">
            {props.label}
          </span>
          <span className="block truncate text-[12.5px] font-semibold leading-snug text-ink">
            {props.value}
          </span>
        </span>
        {props.trailing}
      </button>
      {props.action && <span className="absolute right-2 top-1/2 -translate-y-1/2">{props.action}</span>}
    </div>
  )
}
