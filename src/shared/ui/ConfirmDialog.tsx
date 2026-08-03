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
      <div ref={panelRef} className="panel-in w-[320px] max-w-full rounded-pill border border-line bg-panel-strong p-5 shadow-modal backdrop-blur-[14px]" onClick={(e) => e.stopPropagation()}>
        <p id="confirm-dialog-message" className="text-center text-[13.5px] font-medium text-ink">
          {props.message}
        </p>
        {props.detail && <p className="mt-1.5 text-center text-[11.5px] text-ink-4">{props.detail}</p>}
        <div className="mt-4 flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            className="h-9 flex-1 rounded-ctl border-[1.5px] border-line-btn text-[12.5px] font-semibold text-ink-2 transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
            onClick={props.onCancel}
          >
            {props.cancelLabel ?? '아니오'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={busy}
            className={`h-9 flex-1 rounded-ctl border-[1.5px] text-[12.5px] font-semibold transition-colors disabled:cursor-wait disabled:opacity-40 ${
              danger
                ? 'border-danger-edge bg-danger-wash text-danger hover:bg-danger-wash-strong'
                : 'border-teal-btn-edge bg-teal-wash text-teal-label hover:border-teal-text hover:bg-teal-wash-strong'
            }`}
            onClick={props.onConfirm}
          >
            {busy ? (props.busyLabel ?? '처리 중…') : (props.confirmLabel ?? '예')}
          </button>
        </div>
      </div>
    </div>
  )
}
