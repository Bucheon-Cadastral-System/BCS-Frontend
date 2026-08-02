import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useDialogBehavior } from '@/shared/lib/useDialogBehavior'
import { useFileDrop } from '@/shared/lib/useFileDrop'
import { FileDropOverlay } from '@/shared/ui/FileDropOverlay'

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
  /** 잠시 감추기 — 지도에서 위치를 찍는 동안처럼, 입력값을 유지한 채 화면만 비켜 줄 때 */
  hidden?: boolean
  /**
   * 창 옆에 따로 세우는 판(진행 현황 등). 창 본문에 넣으면 내용이 길어질수록 입력 칸이 아래로 밀리므로
   * 별도의 판으로 뺀다. 좁은 화면에서는 자리가 없어 감춘다.
   */
  aside?: ReactNode
  /**
   * 창 위에 떨어뜨린 파일을 받는다. 창이 화면을 덮고 있으므로 어디에 놓아도 이 창이 받는다 —
   * 창을 접고 다른 창을 띄우는 대신 지금 보고 있는 자리에서 이어 가게 한다.
   */
  onDropFile?: (files: File[]) => void
  onClose: () => void
  onSubmit?: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onDropFile = props.onDropFile
  const { dragging, dropHandlers } = useFileDrop((files) => onDropFile?.(files))
  // 감춰진 동안엔 Esc·포커스 트랩을 끈다 — 안 보이는 창이 Esc를 가로채 입력하던 값을 날리면 안 된다
  useDialogBehavior({ panelRef, onClose: props.onClose, busy: props.busy, enabled: !props.hidden })

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 ${props.hidden ? 'hidden' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={props.title}
      onClick={() => {
        if (!props.busy) props.onClose()
      }}
      {...(onDropFile ? dropHandlers : {})}
    >
      {/* 창과 옆판을 함께 감싼다 — 포커스 순환이 두 판을 함께 돌고, 바깥 클릭으로 닫히는 범위에서도 함께 빠진다.
          옆판은 이 자리에 얹기만 하므로 창은 옆판이 있든 없든 화면 한가운데 그대로 선다. */}
      <div ref={panelRef} className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
      <div className="relative overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            props.onSubmit?.()
          }}
        >
          {/* 본문이 길면 스크롤되면서 제목 밑으로 지나가므로 경계를 그어 둔다 — 아래쪽 버튼 줄과 같은 처리다.
              본문 안쪽 구분선보다 굵게 잡아 창을 가르는 선과 내용을 가르는 선을 구별한다. */}
          <div className="border-b-2 border-gray-200 px-5 pb-3.5 pt-5 dark:border-gray-700">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{props.title}</h2>
            {props.description && (
              <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">{props.description}</p>
            )}
          </div>
          {/* overscroll-contain — 목록을 끝까지 굴린 뒤 더 굴려도 그 움직임이 뒤쪽 화면으로 넘어가지 않게 한다 */}
          <div className="max-h-[70vh] space-y-3 overflow-y-auto overscroll-contain px-5 py-4">{props.children}</div>
          <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-900/40">
            {props.footer}
          </div>
        </form>
      </div>
      {props.aside && (
        // 창 오른쪽 바깥에 따로 세운다. 높이는 내용만큼만 쓰고 창 높이를 넘지 않는다 —
        // 창에 맞춰 늘이면 건이 적을 때 빈 판이 길게 남고, 창이 화면 안이므로 이 상한이면 옆판도 화면을 넘지 않는다.
        <aside className="absolute left-full top-0 ml-4 hidden max-h-full w-64 flex-col overflow-hidden rounded-xl bg-white shadow-2xl lg:flex dark:bg-gray-800">
          {props.aside}
        </aside>
      )}
      </div>
      {/* 창이 이벤트를 멈춰 화면 안내가 뜨지 않으므로, 받는 쪽이 어디인지 이 창이 직접 알린다.
          문구는 기본값을 쓴다 — 공용 껍데기라 무슨 파일을 받는지 모른다 */}
      {onDropFile && dragging && <FileDropOverlay />}
    </div>
  )
}

/** 모달 폼의 라벨 + 입력 한 줄. */
export function ModalField(props: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-gray-700 dark:text-gray-300">
        {props.label}
        {/* 별표는 장식이라 읽어 줄 필요가 없다. 필수 여부는 입력 요소의 required 가 보조기술에 알린다 */}
        {props.required && (
          <span aria-hidden="true" className="ml-0.5 text-red-500">
            *
          </span>
        )}
      </span>
      {props.children}
    </label>
  )
}

export const MODAL_INPUT =
  'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

/** 모달 안 셀렉트 — 다크 툴바용 selectCls와 배경 계열이 달라 따로 둔다. 화살표는 select-chevron이 그린다(오른쪽 여백 확보) */
export const MODAL_SELECT =
  'select-chevron w-full rounded-md border border-gray-300 bg-white py-1.5 pl-2.5 pr-9 text-[13px] text-gray-900 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

export const MODAL_CANCEL_BTN =
  'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'

/** 되돌릴 수 없는 동작(취소·폐기)용 — 주 동작과 색으로 갈라 실수로 누르지 않게 한다 */
export const MODAL_DANGER_BTN =
  'rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-40 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25'

export const MODAL_SUBMIT_BTN =
  'rounded-md bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-500 disabled:opacity-40'
