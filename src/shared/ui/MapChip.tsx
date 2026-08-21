import type { ReactNode } from 'react'

/**
 * 지도 위에 떠 있는 상태 칩의 공통 껍데기 (좌상단 오버레이).
 * 카드 전체가 누를 수 있는 영역이고, 오른쪽 동작(닫기 등)은 그 위에 겹쳐 둔다 —
 * 버튼 안에 버튼을 넣을 수 없어 형제로 두되, 자리를 나눠 가지면 커서를 올렸을 때 카드 일부만 밝아진다.
 */
export function MapChip(props: {
  label: string
  value: string
  /** 이름 줄 오른쪽 끝의 수치(진행률·개수) */
  trailing?: ReactNode
  /** 이름 줄 아래에 까는 내용(분포 막대·내역) — 같은 버튼 안에 두어 어디를 눌러도 펼쳐진다 */
  below?: ReactNode
  /** 칩 오른쪽 위의 별도 동작 버튼 */
  action?: ReactNode
  title?: string
  onClick: () => void
}) {
  return (
    <div className="relative flex w-full flex-col rounded-pop border border-line-pill bg-pill shadow-pill">
      <button
        type="button"
        onClick={props.onClick}
        title={props.title}
        className="flex w-full min-w-0 flex-col gap-2 rounded-pop px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        {/* 오른쪽 동작 버튼은 자리를 차지하지 않고 겹쳐 있다. 아래 줄은 폭을 다 써야 하므로
            그 자리는 이름 줄에서만 여백으로 비운다 */}
        <span className={`flex w-full min-w-0 items-center gap-2 ${props.action ? 'pr-7' : ''}`}>
          <span className="shrink-0 text-[11px] font-semibold tracking-[.06em] text-teal-text">
            {props.label}
          </span>
          {/* 이름이 남은 폭을 모두 차지해 수치를 오른쪽 끝으로 민다 — 이름 길이에 따라 수치 자리가 흔들리지 않는다 */}
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">{props.value}</span>
          {props.trailing}
        </span>
        {props.below}
      </button>
      {props.action && <span className="absolute right-2 top-2">{props.action}</span>}
    </div>
  )
}
