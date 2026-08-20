import { useEffectEvent, useLayoutEffect } from 'react'
import type { RefObject } from 'react'

/**
 * 모달 대화상자의 공통 열고 닫힘. 네이티브 dialog 의 showModal 로 연다.
 * 포커스 가둠, Esc 닫기, 겹친 대화상자 사이의 순서, 닫힌 뒤 포커스 복원은 모두 브라우저가 대신한다.
 * 닫기 요청은 useEffectEvent 로 감싸 최신 콜백과 busy 를 읽는다. 그래서 부모가 인라인 함수를 넘겨도
 * 여닫는 효과의 의존성이 바뀌지 않아 창이 다시 열리고 닫히지 않는다.
 */
export function useDialogBehavior(options: {
  dialogRef: RefObject<HTMLDialogElement | null>
  onClose: () => void
  /** 처리 중이면 Esc 로 닫히지 않게 한다. 응답이 오기 전에 창이 사라지는 것을 막는다 */
  busy?: boolean
  /** 지정하면 열릴 때 이 요소로 초기 포커스를 준다. 미지정 시 첫 포커스 가능 요소는 브라우저가 고른다 */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** 화면에서 감춰진 동안(지도 위치 찍기 등)엔 대화상자를 닫아 둔다 */
  enabled?: boolean
}) {
  const { dialogRef, initialFocusRef, enabled = true } = options
  const requestClose = useEffectEvent(() => {
    if (!options.busy) options.onClose()
  })

  // 레이아웃 이펙트를 쓴다. enabled 가 꺼지는 커밋에서 곧바로 닫혀야
  // 뒤 화면이 상호작용을 되찾기 전까지 대화상자가 한 프레임도 남아 보이지 않는다.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !enabled) return
    if (!dialog.open) dialog.showModal()
    initialFocusRef?.current?.focus()

    // Esc 는 브라우저가 cancel 이벤트로 먼저 알린다. 기본 동작인 즉시 닫힘 대신
    // 이 콜백으로 넘겨 busy 방어를 태우고, 실제로 닫는 일은 정리 함수가 맡는다.
    const onCancel = (e: Event) => {
      e.preventDefault()
      requestClose()
    }
    // Esc 는 이 창이 삼킨다 — 위로 흘려보내면 이 창을 띄운 말풍선·시트까지 함께 닫혀,
    // 물음에 답하려던 손짓이 고치던 값을 통째로 버린다
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.stopPropagation()
    }
    dialog.addEventListener('cancel', onCancel)
    dialog.addEventListener('keydown', onKeyDown)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('keydown', onKeyDown)
      // close 는 열 때 기억해 둔 이전 포커스로 자동으로 되돌린다
      if (dialog.open) dialog.close()
    }
  }, [dialogRef, initialFocusRef, enabled])
}
