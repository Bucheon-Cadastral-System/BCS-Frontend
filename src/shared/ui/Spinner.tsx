/**
 * 진행 중 표시 — 회전하는 테두리 원.
 * current면 글자색을 따라 돈다 — 버튼처럼 바탕·전경 규칙이 따로 있는 자리에서 테마가 갈릴 때 함께 따라오게.
 */
export function Spinner({
  className = 'size-4',
  current = false,
  label,
}: {
  className?: string
  current?: boolean
  /** 읽어 주는 이름 — 없으면 장식으로 숨긴다 */
  label?: string
}) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`${className} shrink-0 animate-spin rounded-full border-2 ${
        current ? 'border-current/40 border-t-current' : 'border-teal border-t-transparent'
      }`}
    />
  )
}
