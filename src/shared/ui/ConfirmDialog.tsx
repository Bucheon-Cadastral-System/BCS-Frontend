import { useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useDialogBehavior } from '@/shared/lib/useDialogBehavior'
import { useFileDrop } from '@/shared/lib/useFileDrop'
import { BTN_SM_DANGER, BTN_SM_PRIMARY, BTN_SM_SECONDARY, MODAL_SHELL } from './classes'

/**
 * 실행 전 한 번 묻는 확인 대화상자. Esc·배경클릭=취소.
 * danger=true(삭제 등 되돌릴 수 없는 작업)면 확인 버튼을 빨강으로 두고 기본 포커스를 취소에 준다.
 */
export function ConfirmDialog(props: {
  message: string
  /** 물음 아래 안내 — 확인을 누르면 무엇이 벌어지는지. 변경 요약처럼 여러 줄·강조가 필요하면 노드로 준다 */
  detail?: ReactNode
  /** 실행이 실패한 이유 — 창을 닫지 않고 이 자리에서 알린다. 뒤쪽 화면에 띄우면 배경 딤에 가려 보이지 않는다. */
  error?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  busyLabel?: string
  /** 확정을 아예 막는다 — 이 창이 '할 수 없음'을 알리는 자리로 바뀔 때(참조 중 삭제 등) */
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const danger = props.danger ?? false
  const busy = props.busy ?? false
  const close = busy ? () => undefined : props.onCancel
  // 되돌릴 수 없는 작업이면 실수로 확정하지 않게 취소에 포커스를 준다
  useDialogBehavior({ panelRef, onClose: close, initialFocusRef: danger ? cancelRef : confirmRef })
  // 묻는 중에 떨어진 파일은 여기서 멈춘다 — 흘려보내면 답을 기다리는 사이 뒤쪽에서 다른 흐름이 시작된다
  const { dropHandlers } = useFileDrop(() => undefined)

  // body 로 내보내 세운다(Modal 과 같은 이유) — 창 안·판 안 어디서 선언해도 딤과 가운데 정렬이 화면 기준이 된다
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-message"
      onClick={close}
      {...dropHandlers}
    >
      {/* 폭은 내용에 맞춘다(최소 320) — 안내 한 줄이 상한 안에 들면 어색하게 꺾이지 않고 한 줄로 선다.
          상한을 넘는 긴 글만 break-keep 으로 단어 경계에서 접는다. */}
      <div ref={panelRef} className={`panel-in w-fit min-w-[min(320px,100%)] max-w-[min(440px,100%)] p-5 ${MODAL_SHELL}`} onClick={(e) => e.stopPropagation()}>
        <p id="confirm-dialog-message" className="break-keep text-center text-[13.5px] font-medium text-ink">
          {props.message}
        </p>
        {/* div — 임의의 노드(변경 요약)를 받으므로 p 안에 블록이 중첩되지 않게 한다. 여러 줄 문자열은 pre-line 이 갈라 준다 */}
        {props.detail && <div className="mt-1.5 whitespace-pre-line break-keep text-center text-[12px] leading-5 text-ink-3">{props.detail}</div>}
        {/* 오류는 서버 문구라 공백 없는 긴 토큰이 올 수 있다 — 단어 경계 우선, 안 되면 아무 데서나 접는다 */}
        {props.error && (
          <p className="mt-2.5 break-keep rounded-chip bg-danger-wash px-2.5 py-1.5 text-center text-[11.5px] wrap-anywhere text-danger" role="alert">
            {props.error}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            className={`${BTN_SM_SECONDARY} flex-1 disabled:cursor-not-allowed`}
            onClick={props.onCancel}
          >
            {props.cancelLabel ?? '아니오'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={busy || props.confirmDisabled}
            className={`${danger ? BTN_SM_DANGER : BTN_SM_PRIMARY} flex-1 ${props.confirmDisabled ? 'disabled:cursor-not-allowed' : 'disabled:cursor-wait'}`}
            onClick={props.onConfirm}
          >
            {busy ? (props.busyLabel ?? '처리 중…') : (props.confirmLabel ?? '예')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
