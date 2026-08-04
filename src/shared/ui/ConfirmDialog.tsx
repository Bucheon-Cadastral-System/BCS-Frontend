import { useRef } from 'react'
import { useDialogBehavior } from '@/shared/lib/useDialogBehavior'
import { useFileDrop } from '@/shared/lib/useFileDrop'
import { BTN_SM_DANGER, BTN_SM_PRIMARY, BTN_SM_SECONDARY, MODAL_SHELL } from './classes'

/**
 * 실행 전 한 번 묻는 확인 대화상자. Esc·배경클릭=취소.
 * danger=true(삭제 등 되돌릴 수 없는 작업)면 확인 버튼을 빨강으로 두고 기본 포커스를 취소에 준다.
 */
export function ConfirmDialog(props: {
  message: string
  /** 물음 아래 한 줄 — 확인을 누르면 무엇이 벌어지는지 */
  detail?: string
  /** 실행이 실패한 이유 — 창을 닫지 않고 이 자리에서 알린다. 뒤쪽 화면에 띄우면 배경 딤에 가려 보이지 않는다. */
  error?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  busyLabel?: string
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-message"
      onClick={close}
      {...dropHandlers}
    >
      <div ref={panelRef} className={`panel-in w-[320px] max-w-full p-5 ${MODAL_SHELL}`} onClick={(e) => e.stopPropagation()}>
        <p id="confirm-dialog-message" className="text-center text-[13.5px] font-medium text-ink">
          {props.message}
        </p>
        {props.detail && <p className="mt-1.5 text-center text-[12px] leading-5 text-ink-3">{props.detail}</p>}
        {props.error && (
          <p className="mt-2.5 rounded-chip bg-danger-wash px-2.5 py-1.5 text-center text-[11.5px] text-danger" role="alert">
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
            disabled={busy}
            className={`${danger ? BTN_SM_DANGER : BTN_SM_PRIMARY} flex-1 disabled:cursor-wait`}
            onClick={props.onConfirm}
          >
            {busy ? (props.busyLabel ?? '처리 중…') : (props.confirmLabel ?? '예')}
          </button>
        </div>
      </div>
    </div>
  )
}
