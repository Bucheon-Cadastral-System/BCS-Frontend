import { useRef } from 'react'
import { useDialogBehavior } from '@/shared/lib/useDialogBehavior'

/**
 * 실행 전 한 번 묻는 확인 대화상자. Esc·배경클릭=취소.
 * danger=true(삭제 등 되돌릴 수 없는 작업)면 확인 버튼을 빨강으로 두고 기본 포커스를 취소에 준다.
 */
export function ConfirmDialog(props: {
  message: string
  detail?: string
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-message"
      onClick={close}
    >
      <div ref={panelRef} className="w-full max-w-xs rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
        <p id="confirm-dialog-message" className="text-center text-[14px] font-medium text-gray-900 dark:text-gray-100">
          {props.message}
        </p>
        {props.detail && <p className="mt-1 text-center text-[12px] text-gray-500 dark:text-gray-400">{props.detail}</p>}
        <div className="mt-4 flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            className="flex-1 rounded-md border border-gray-300 bg-white py-2 text-[13px] text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            onClick={props.onCancel}
          >
            {props.cancelLabel ?? '아니오'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={busy}
            className={`flex-1 rounded-md py-2 text-[13px] font-medium text-white ${
              danger ? 'border border-red-600 bg-red-600 hover:bg-red-500' : 'border border-blue-600 bg-blue-600 hover:bg-blue-500'
            } disabled:cursor-wait disabled:opacity-60`}
            onClick={props.onConfirm}
          >
            {busy ? (props.busyLabel ?? '처리 중…') : (props.confirmLabel ?? '예')}
          </button>
        </div>
      </div>
    </div>
  )
}
