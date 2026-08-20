import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { useDialogBehavior } from '@/shared/lib/useDialogBehavior'
import { useFileDrop } from '@/shared/lib/useFileDrop'
import { MODAL_SHELL } from './classes'
import { FormActions } from './FormActions'

/**
 * 실행 전 한 번 묻는 확인 대화상자. Esc·배경클릭=취소.
 * danger=true(삭제 등 되돌릴 수 없는 작업)면 확인 버튼을 빨강으로 두고 기본 포커스를 취소에 준다.
 */
export function ConfirmDialog(props: {
  message: string
  /** 물음 아래 안내 — 확인을 누르면 무엇이 벌어지는지. 변경 요약처럼 여러 줄·강조가 필요하면 노드로 준다 */
  detail?: ReactNode
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
  const dialogRef = useRef<HTMLDialogElement>(null)
  // 확인 창이 둘 이상 떠 있을 수 있어 id 를 고정하면 보조기술이 먼저 만난 쪽의 문구를 읽는다
  const messageId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const danger = props.danger ?? false
  const busy = props.busy ?? false
  const close = busy ? () => undefined : props.onCancel
  // 되돌릴 수 없는 작업이면 실수로 확정하지 않게 취소에 포커스를 준다
  useDialogBehavior({ dialogRef, onClose: close, initialFocusRef: danger ? cancelRef : confirmRef })
  // 묻는 중에 떨어진 파일은 여기서 멈춘다 — 흘려보내면 답을 기다리는 사이 뒤쪽에서 다른 흐름이 시작된다
  const { dropHandlers } = useFileDrop(() => undefined)

  // showModal 로 연 dialog 는 top layer 로 올라가므로, 화면 기준을 맞추려고 body 로 내보내던 portal은 이제 필요 없다.
  return (
    <dialog ref={dialogRef} aria-labelledby={messageId} className="m-0 border-0 bg-transparent p-0">
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close} {...dropHandlers}>
        {/* 폭은 내용에 맞춘다(최소 320) — 안내 한 줄이 상한 안에 들면 어색하게 꺾이지 않고 한 줄로 선다.
            상한을 넘는 긴 글만 break-keep 으로 단어 경계에서 접는다. */}
        <div className={`panel-in w-fit min-w-[min(320px,100%)] max-w-[min(440px,100%)] p-5 ${MODAL_SHELL}`} onClick={(e) => e.stopPropagation()}>
          <p id={messageId} className="break-keep text-center text-[13.5px] font-medium text-ink">
            {props.message}
          </p>
          {/* div — 임의의 노드(변경 요약)를 받으므로 p 안에 블록이 중첩되지 않게 한다. 여러 줄 문자열은 pre-line 이 갈라 준다 */}
          {props.detail && <div className="mt-1.5 whitespace-pre-line break-keep text-center text-[12px] leading-5 text-ink-3">{props.detail}</div>}
          {/* 두 버튼의 자리와 색은 앱 전체가 한 규칙이다 — 창이라고 따로 짜면 그 규칙에서 조용히 빠진다 */}
          <div className="mt-4">
            <FormActions
              fill
              cancelRef={cancelRef}
              submitRef={confirmRef}
              cancelLabel={props.cancelLabel ?? '아니오'}
              submitLabel={props.confirmLabel ?? '예'}
              busyLabel={props.busyLabel ?? '처리 중'}
              submitTone={danger ? 'danger' : 'primary'}
              cancelTone={danger ? 'neutral' : 'discard'}
              busy={busy}
              submitDisabled={props.confirmDisabled}
              onSubmit={props.onConfirm}
              onCancel={props.onCancel}
            />
          </div>
        </div>
      </div>
    </dialog>
  )
}
