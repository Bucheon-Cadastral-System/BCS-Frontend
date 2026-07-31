import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/**
 * 비모달 오버레이(팝오버·드롭다운) 닫기 — Esc, 그리고 ref를 주면 바깥 클릭도.
 * 모달과 달리 포커스 트랩은 걸지 않는다(뒤 화면을 계속 조작할 수 있어야 하는 오버레이라서).
 */
export function useDismiss(options: {
  enabled: boolean
  onDismiss: () => void
  /** 주면 이 요소 바깥을 눌렀을 때도 닫는다 */
  ref?: RefObject<HTMLElement | null>
}) {
  const { enabled, ref } = options
  const dismissRef = useRef(options.onDismiss)
  // 렌더 중 ref 대입 금지(버려지는 렌더의 콜백 노출 방지) → 커밋 후 동기화
  useEffect(() => {
    dismissRef.current = options.onDismiss
  }, [options.onDismiss])

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissRef.current()
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!ref?.current?.contains(e.target as Node)) dismissRef.current()
    }
    window.addEventListener('keydown', onKey)
    if (ref) window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [enabled, ref])
}
