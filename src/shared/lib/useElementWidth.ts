import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/**
 * 요소의 실제 폭(px).
 * 창 크기·판 열림·글자 길이가 한꺼번에 걸리는 값이라 계산으로 맞추지 않고 재서 쓴다.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const report = () => setWidth(el.getBoundingClientRect().width)
    report()
    const observer = new ResizeObserver(report)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return width
}
