/**
 * 브랜드 심볼 — 지적 격자와 그 위의 기준점.
 * 격자는 글자색을 따라가고 기준점만 청록으로 둔다. 이 화면이 다루는 것이 기준점이라
 * 화면이 밝든 어둡든 그 하나만 색을 갖는다.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="5 5 54 54" className={`${className ?? 'size-6'} shrink-0`} aria-hidden="true">
      <rect x="7" y="7" width="50" height="50" rx="9" fill="none" stroke="currentColor" strokeWidth="3.4" />
      <line x1="30" y1="7" x2="30" y2="57" stroke="currentColor" strokeWidth="2" opacity=".55" />
      <line x1="30" y1="34" x2="57" y2="34" stroke="currentColor" strokeWidth="2" opacity=".55" />
      <line x1="7" y1="22" x2="30" y2="22" stroke="currentColor" strokeWidth="2" opacity=".55" />
      {/* 청록은 테마마다 값이 갈리므로 색 이름을 이 요소에 다시 세워 currentColor 로 받는다 */}
      <circle cx="30" cy="34" r="5" fill="currentColor" className="text-teal" />
      <circle cx="30" cy="22" r="2.4" fill="currentColor" />
    </svg>
  )
}
