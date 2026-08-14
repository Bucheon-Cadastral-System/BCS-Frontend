import { useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useDialogBehavior } from '@/shared/lib/useDialogBehavior'
import { useFileDrop } from '@/shared/lib/useFileDrop'
import { FIELD_LABEL } from '@/shared/ui/classes'
import { FileDropOverlay } from '@/shared/ui/FileDropOverlay'
import { MODAL_SHELL } from './classes'

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
   * 창 옆에 따로 세우는 패널(진행 현황 등). 창 본문에 넣으면 내용이 길어질수록 입력 칸이 아래로 밀리므로
   * 별도의 패널로 뺀다. 좁은 화면에서는 자리가 없어 감춘다.
   */
  aside?: ReactNode
  /**
   * 창 위에 떨어뜨린 파일을 받는다. 창이 화면을 덮고 있으므로 어디에 놓아도 이 창이 받는다 —
   * 창을 접고 다른 창을 띄우는 대신 지금 보고 있는 자리에서 이어 가게 한다.
   *
   * 주지 않으면 이 창은 파일을 받지 않는다. 그때도 떨어진 파일은 여기서 멈춘다 —
   * 흘려보내면 뒤쪽 화면의 규칙이 받아 창이 열려 있는 동안 엉뚱한 흐름이 시작된다.
   */
  onDropFile?: (files: File[]) => void
  /**
   * 창 안의 폼 — 못 채운 칸을 화면 안에서 알리려면(useFormNotice) 이 폼을 잡아야 한다.
   * 브라우저 기본 말풍선은 언제나 끈다.
   */
  formRef?: RefObject<HTMLFormElement | null>
  /**
   * 본문 스크롤을 안쪽 목록에 맡긴다.
   * 본문이 스스로 구르면 목록을 굴릴 때 그 위의 요약까지 함께 밀려 무엇을 보고 있는지 놓친다.
   */
  scrollInside?: boolean
  onClose: () => void
  onSubmit?: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onDropFile = props.onDropFile
  // 받든 안 받든 이 창이 가로챈다 — 받지 않을 때는 삼키기만 한다
  const { dragging, dropHandlers } = useFileDrop((files) => onDropFile?.(files))
  // 감춰진 동안엔 대화상자를 닫아 둔다. 안 보이는 창이 Esc를 가로채 입력하던 값을 날리면 안 된다
  useDialogBehavior({ dialogRef, onClose: props.onClose, busy: props.busy, enabled: !props.hidden })

  // showModal 로 연 dialog 는 top layer 로 올라가 조상의 transform, overflow 등의 영향을 받지 않는다.
  // 화면 기준을 맞추려고 body 로 내보내던 portal은 이제 필요 없다.
  return (
    <dialog ref={dialogRef} aria-label={props.title} className="m-0 border-0 bg-transparent p-0">
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={() => {
          if (!props.busy) props.onClose()
        }}
        {...dropHandlers}
      >
        {/* 창과 옆 패널을 함께 감싼다 — 포커스 순환이 두 패널을 함께 돌고, 바깥 클릭으로 닫히는 범위에서도 함께 빠진다.
            옆 패널은 이 자리에 얹기만 하므로 창은 옆 패널이 있든 없든 화면 한가운데 그대로 선다. */}
        {/* 창 높이는 화면을 넘지 않는다 — 넘기면 가운데 정렬이 창을 위로 밀어 머리말이 화면 밖으로 잘린다.
            늘어나는 것은 본문뿐이고 머리말·버튼 줄은 언제나 제자리에 남는다. */}
        <div className="relative flex max-h-full w-full max-w-[448px] flex-col" onClick={(e) => e.stopPropagation()}>
        <div className={`panel-in relative flex min-h-0 flex-col overflow-clip ${MODAL_SHELL}`}>
          <form
            ref={props.formRef}
            noValidate
            className="flex min-h-0 flex-col"
            onSubmit={(e) => {
              e.preventDefault()
              props.onSubmit?.()
            }}
          >
            <div className={MODAL_HEADER}>
              <h2 className="text-[15px] font-semibold text-ink">{props.title}</h2>
              {props.description && <p className="mt-[5px] text-[11.5px] text-ink-3">{props.description}</p>}
            </div>
            {/* overscroll-contain — 목록을 끝까지 굴린 뒤 더 굴려도 그 움직임이 뒤쪽 화면으로 넘어가지 않게 한다 */}
            <div
              className={`min-h-0 flex-1 space-y-3 px-[18px] pb-4 pt-3.5 ${
                props.scrollInside ? 'flex flex-col overflow-hidden' : 'overflow-y-auto overscroll-contain'
              }`}
            >
              {props.children}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line-soft bg-soft px-[18px] py-3">
              {props.footer}
            </div>
          </form>
        </div>
        {props.aside && (
          // 창 오른쪽 바깥에 따로 세운다. 높이는 내용만큼만 쓰고 창 높이를 넘지 않는다 —
          // 창에 맞춰 늘이면 건이 적을 때 빈 패널이 길게 남고, 창이 화면 안이므로 이 상한이면 옆 패널도 화면을 넘지 않는다.
          // overflow-clip 은 잘라 내되 굴릴 수는 없다. hidden 으로 두면 이 패널도 '굴릴 수 있는 상자'가 되어,
          // 안쪽 목록이 제 자리를 찾을 때(scrollIntoView) 이 패널까지 함께 굴러 머리말이 화면 밖으로 밀려난다.
          <aside className={`panel-in absolute left-full top-0 ml-4 hidden max-h-full w-64 flex-col overflow-clip lg:flex ${MODAL_SHELL}`}>
            {props.aside}
          </aside>
        )}
        </div>
        {/* 창이 이벤트를 멈춰 화면 안내가 뜨지 않으므로, 받는 쪽이 어디인지 이 창이 직접 알린다.
            문구는 기본값을 쓴다 — 공용 껍데기라 무슨 파일을 받는지 모른다 */}
        {onDropFile && dragging && <FileDropOverlay />}
      </div>
    </dialog>
  )
}

/** 모달 폼의 라벨 + 입력 한 줄. */
export function ModalField(props: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className={FIELD_LABEL}>
        {props.label}
        {/* 별표는 장식이라 읽어 줄 필요가 없다. 필수 여부는 입력 요소의 required 가 보조기술에 알린다 */}
        {props.required && (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        )}
      </span>
      {props.children}
    </label>
  )
}

/** 창 머리말 — 아래 청록 선이 본문과의 경계다(좌측 패널·대화 패널과 같은 규칙) */
export const MODAL_HEADER = 'shrink-0 border-b-2 border-b-teal px-[18px] pb-[13px] pt-4'

/** 창 본문의 좌우·위아래 여백을 되물려 패널 끝까지 닿는 목록 — 여백 값이 바뀌면 여기만 고친다 */
export const MODAL_BLEED = '-mx-[18px] -mb-4 -mt-3.5 w-[calc(100%+36px)]'

export {
  FIELD as MODAL_INPUT,
  // 여러 줄 칸은 한 줄 칸과 규격이 다르다 — 고정 높이·가운데 정렬 대신 위아래 여백과 넉넉한 줄 간격을 쓴다
  FIELD_AREA as MODAL_TEXTAREA,
  FIELD_SELECT as MODAL_SELECT,
  FIELD_READONLY as MODAL_READONLY,
  BTN_SM_SECONDARY as MODAL_CANCEL_BTN,
  BTN_SM_DANGER as MODAL_DANGER_BTN,
  BTN_SM_PRIMARY as MODAL_SUBMIT_BTN,
} from './classes'
