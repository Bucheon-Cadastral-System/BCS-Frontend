/** 로딩 자리표시 막대. 밝은 배경·어두운 배경 양쪽에서 보이게 중립 회색 반투명을 쓴다. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-400/25 ${className}`} aria-hidden="true" />
}

/** 목록 자리표시 — 아이콘 + 두 줄 텍스트 형태의 행을 rows개 그린다. */
export function SkeletonRows({ rows = 6, className = '' }: { rows?: number; className?: string }) {
  return (
    <ul className={className} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-2.5 px-4 py-2.5">
          <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
          <Skeleton className="h-3 flex-1" />
        </li>
      ))}
    </ul>
  )
}
