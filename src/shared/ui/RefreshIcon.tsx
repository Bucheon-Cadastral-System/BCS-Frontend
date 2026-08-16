/**
 * 되돌아가는 화살표 — 다시 불러오기·처음으로 돌리기를 함께 가리킨다.
 *
 * <p>크기를 적지 않는다. 이 그림을 담는 버튼(ICON_BTN)이 자리를 정하고 여기는 size-full 로 채우기만 한다.
 */
export function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
