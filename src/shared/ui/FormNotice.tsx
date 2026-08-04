/** 버튼 옆에 서는 제출 실패 사유 — 자리를 늘 차지하지는 않고 눌러 본 뒤에만 나타난다 */
export function FormNotice({ message }: { message: string | null }) {
  if (message === null) return null
  return (
    <p role="alert" className="min-w-0 flex-1 text-[12px] leading-[1.45] text-danger">
      {message}
    </p>
  )
}
