/**
 * 로딩 자리표시 막대. 밝은 배경·어두운 배경 양쪽에서 보이게 중립 회색 반투명을 쓴다.
 *
 * <p>span 인 것은 버튼·문단 안에도 들어가기 때문이다 — div 는 그 안에 놓을 수 없다. block 을 줘 크기는 그대로 먹는다.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`block animate-pulse rounded bg-[rgba(143,168,173,.18)] ${className}`} aria-hidden="true" />
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
