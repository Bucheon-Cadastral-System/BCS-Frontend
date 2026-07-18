import type { PointType } from '../model/types'

/**
 * 종류 도식 아이콘 (지도 마커와 동일 형상): ⊕ 지적삼각점 / ● 지적삼각보조점(채움) / ○ 지적도근점(작은 빈원).
 * 색은 currentColor → 부모의 text-* 로 제어(다크/라이트 양쪽 재사용).
 */
export function PointTypeIcon({ type, className = 'h-4 w-4' }: { type: PointType; className?: string }) {
  return (
    <span className={`inline-block shrink-0 ${className}`} aria-label={type}>
      {type === '지적삼각점' ? (
        <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 4v16M4 12h16" strokeWidth={1.5} />
        </svg>
      ) : type === '지적삼각보조점' ? (
        <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
          <circle cx="12" cy="12" r="6.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="5" />
        </svg>
      )}
    </span>
  )
}
