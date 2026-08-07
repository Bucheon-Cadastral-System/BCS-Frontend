import { useEffect, useEffectEvent } from 'react'
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
  // 콜백은 늘 최신 것을 부르되 그것 때문에 리스너를 다시 걸지는 않는다
  const dismiss = useEffectEvent(() => options.onDismiss())

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!ref?.current?.contains(e.target as Node)) dismiss()
    }
    window.addEventListener('keydown', onKey)
    if (ref) window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [enabled, ref])
}
