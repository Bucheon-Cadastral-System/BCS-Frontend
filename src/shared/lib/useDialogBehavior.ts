import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE =
  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

/**
 * 지금 떠 있는 대화상자들의 순서 — 수정 창 위에 확인 창이 서듯 겹칠 수 있는데,
 * 둘 다 창 밖(window)에서 키를 들으므로 맨 위 하나만 반응하게 가리지 않으면
 * Esc 한 번에 두 창이 같이 닫히고 Tab 순환도 서로 뺏는다.
 */
const dialogStack: symbol[] = []

/**
 * 모달 대화상자의 공통 키보드·포커스 동작 — 열릴 때 포커스 이동, Esc 닫기, Tab 순환(트랩), 닫으면 트리거로 복원.
 * aria-modal 대화상자는 열려 있는 동안 포커스가 배경으로 나가면 안 되므로 Tab을 창 안에서 돌린다.
 * 콜백·상태는 ref로 최신값을 읽는다 — 부모가 인라인 함수를 넘겨도 구독을 다시 걸지 않아 초기 포커스가 재실행되지 않는다.
 */
export function useDialogBehavior(options: {
  panelRef: RefObject<HTMLElement | null>
  onClose: () => void
  /** 처리 중이면 Esc로 닫히지 않게 한다(응답 전 창이 사라지는 것 방지) */
  busy?: boolean
  /** 지정하면 이 요소로 초기 포커스를 준다(미지정 시 첫 포커스 가능 요소) */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** 화면에서 감춰진 동안(지도 위치 찍기 등)엔 Esc·포커스 트랩을 쉬게 한다 */
  enabled?: boolean
}) {
  const { panelRef, initialFocusRef, enabled = true } = options
  const closeRef = useRef(options.onClose)
  const busyRef = useRef(options.busy)
  // 렌더 중 ref 대입 금지(버려지는 렌더의 콜백 노출 방지) → 커밋 후 동기화
  useEffect(() => {
    closeRef.current = options.onClose
    busyRef.current = options.busy
  }, [options.onClose, options.busy])

  useEffect(() => {
    if (!enabled) return
    const token = Symbol('dialog')
    dialogStack.push(token)
    const isTop = () => dialogStack[dialogStack.length - 1] === token
    const prevActive = document.activeElement as HTMLElement | null
    const target = initialFocusRef?.current ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    target?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return // 위에 다른 대화상자가 떠 있다 — 키는 맨 위 창의 몫이다
      if (e.key === 'Escape') {
        if (!busyRef.current) closeRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault()
        last.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      const at = dialogStack.indexOf(token)
      // 맨 위 창이었을 때만 이전 포커스로 되돌린다 — 아래 창이 걷힐 때 되돌리면 남아 있는 위 창 밖으로 포커스가 샌다
      const wasTop = at === dialogStack.length - 1
      if (at >= 0) dialogStack.splice(at, 1)
      window.removeEventListener('keydown', onKey)
      if (wasTop) prevActive?.focus?.()
    }
  }, [panelRef, initialFocusRef, enabled])
}
