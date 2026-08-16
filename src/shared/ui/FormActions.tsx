import type { ReactNode } from 'react'
import { BTN_SM_DANGER, BTN_SM_PRIMARY, BTN_SM_SECONDARY } from './classes'
import { Spinner } from './Spinner'

/**
 * 입력을 확정하거나 버리는 두 버튼 한 줄.
 *
 * <p>자리와 색이 규칙이다. 버리는 쪽이 왼쪽이고, 적은 것을 되돌릴 수 없이 버리므로 빨강이다.
 * 확정하는 쪽이 오른쪽이고 강조색이다. 사람이 두 버튼의 자리를 몸으로 익히므로 창이든 카드 안이든 같아야 한다.
 *
 * <p>규칙을 컴포넌트로 둔다. 색 이름만 공용으로 두면 창 밖에 손으로 짠 버튼 줄이 생길 때마다
 * 자리와 색이 조금씩 어긋난다.
 */
export function FormActions(props: {
  /** 확정 버튼 글자 */
  submitLabel: string
  /** 보내는 중에 대신 보일 글자 */
  busyLabel?: string
  cancelLabel?: string
  busy?: boolean
  submitDisabled?: boolean
  /** 폼 안이면 submit 으로 두어 엔터 제출을 살린다. 그 밖에는 button 으로 두고 onSubmit 을 받는다 */
  submitType?: 'submit' | 'button'
  onSubmit?: () => void
  onCancel: () => void
  /**
   * 버리는 쪽의 색. 적은 것을 버리면 discard(빨강), 이미 벌어진 일을 두고 나가기만 하면 neutral(중립)이다.
   * 확인 대화상자의 '아니오'처럼 버릴 것이 없는 자리도 중립이다.
   */
  cancelTone?: 'discard' | 'neutral'
  /** 확정 버튼 옆에 세우는 안내 — 못 채운 칸이 있다는 한 줄 등 */
  notice?: ReactNode
  /** 창 아래가 아니라 카드 안에 놓을 때 — 두 버튼이 자리를 반씩 나눈다 */
  fill?: boolean
}) {
  const busy = props.busy ?? false
  const cancelClass = props.cancelTone === 'neutral' ? BTN_SM_SECONDARY : BTN_SM_DANGER

  const cancel = (
    <button
      type="button"
      onClick={props.onCancel}
      disabled={busy}
      className={`${cancelClass} ${props.fill === true ? 'flex-1' : ''} disabled:cursor-not-allowed`}
    >
      {props.cancelLabel ?? '취소'}
    </button>
  )

  const submit = (
    <button
      type={props.submitType ?? 'button'}
      onClick={props.submitType === 'submit' ? undefined : props.onSubmit}
      disabled={busy || props.submitDisabled === true}
      className={`${BTN_SM_PRIMARY} ${props.fill === true ? 'flex-1' : ''} ${props.submitDisabled === true ? 'disabled:cursor-not-allowed' : 'disabled:cursor-wait'}`}
    >
      {busy ? (
        <span className="flex items-center gap-1.5">
          <Spinner className="size-3.5" current />
          {props.busyLabel ?? `${props.submitLabel} 중`}
        </span>
      ) : (
        props.submitLabel
      )}
    </button>
  )

  if (props.fill === true) {
    return (
      <div className="flex gap-1.5">
        {cancel}
        {submit}
      </div>
    )
  }

  // 창 아래 줄은 바깥이 이미 가로 배치를 잡아 준다 — 확정 쪽만 오른쪽 끝으로 민다
  return (
    <>
      {cancel}
      <div className="ml-auto flex min-w-0 items-center gap-3">
        {props.notice}
        {submit}
      </div>
    </>
  )
}
