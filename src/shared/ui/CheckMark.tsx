/**
 * 체크 상자 — 줄 전체가 버튼인 목록에서 상태만 나타낸다.
 *
 * <p>상자 자체는 누를 수 없다. 줄이 버튼이므로 상자에 다시 손잡이를 두면 같은 자리에 누를 것이 둘이 된다.
 * 끈 상태에서 면을 두지 않아 어느 바탕 위에 놓아도(패널·말풍선·목록) 테두리만 남는다.
 */
export function CheckMark(props: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
        props.on ? 'border-teal bg-teal text-on-teal' : 'border-line-btn bg-transparent'
      }`}
    >
      {props.on && (
        <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 13 4 4L19 7" />
        </svg>
      )}
    </span>
  )
}
