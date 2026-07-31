import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 긴 목록을 나눠서 그린다 — 처음엔 chunk개만 마운트하고, 바닥 감시자가 보이면 chunk씩 늘린다.
 * 수천 행을 한 커밋에 마운트하면 그 프레임이 막혀 패널 열림 애니메이션이 끊기고 목록이 늦게 나타난다.
 * 반환한 sentinelRef를 목록 마지막 요소에 달아야 다음 묶음이 이어진다.
 */
export function useIncrementalReveal(total: number, chunk = 40) {
  const [count, setCount] = useState(() => Math.min(chunk, total))
  const observerRef = useRef<IntersectionObserver | null>(null)

  // 목록이 바뀌면(검색·프로젝트 전환) 처음부터 다시 그린다
  useEffect(() => {
    setCount(Math.min(chunk, total))
  }, [total, chunk])

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect()
      if (!node) return
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) setCount((c) => c + chunk)
      })
      observerRef.current.observe(node)
    },
    [chunk],
  )

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return { count: Math.min(count, total), hasMore: count < total, sentinelRef }
}
