import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useDialogBehavior } from '@/shared/lib/useDialogBehavior'

/**
 * 입력·확인 대화상자의 공통 셸 — 배경 딤·Esc·배경 클릭 닫기, 열릴 때 첫 요소로 포커스 이동, 닫으면 트리거로 복원.
 * 내용(폼)은 children이 채우고, 제출·취소 버튼은 footer로 받는다.
 */
export function Modal(props: {
  title: string
  description?: string
  children: ReactNode
  footer: ReactNode
  /** 제출 중 — 닫기 경로(Esc·배경 클릭)를 막아 응답이 오기 전 창이 사라지지 않게 한다 */
  busy?: boolean
  onClose: () => void
  onSubmit?: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogBehavior({ panelRef, onClose: props.onClose, busy: props.busy })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={props.title}
      onClick={() => {
        if (!props.busy) props.onClose()
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            props.onSubmit?.()
          }}
        >
          <div className="px-5 pt-5">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{props.title}</h2>
            {props.description && (
              <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">{props.description}</p>
            )}
          </div>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">{props.children}</div>
          <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-900/40">
            {props.footer}
          </div>
        </form>
      </div>
    </div>
  )
}

/** 모달 폼의 라벨 + 입력 한 줄. */
export function ModalField(props: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-gray-700 dark:text-gray-300">{props.label}</span>
      {props.children}
      {props.hint && <span className="mt-1 block text-[11px] text-gray-500 dark:text-gray-400">{props.hint}</span>}
    </label>
  )
}

export const MODAL_INPUT =
  'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

/** 모달 안 셀렉트 — 다크 툴바용 selectCls와 배경 계열이 달라 따로 둔다 */
export const MODAL_SELECT =
  'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] text-gray-900 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

export const MODAL_CANCEL_BTN =
  'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'

export const MODAL_SUBMIT_BTN =
  'rounded-md bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-500 disabled:opacity-40'
