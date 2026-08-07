import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { POPOVER } from '@/shared/ui/classes'
import type { SurveyResult } from '../model/types'
import { SURVEY_STATUS_LABEL, SURVEY_STATUS_TONE, deriveSurveyStatus } from '../model/status'

/** 목록에 세우는 갈래. 미조사를 고르면 기록을 지운다. */
const CHOICES: (SurveyResult | 'NONE')[] = ['INTACT', 'LOST', 'UNAVAILABLE', 'ETC', 'NONE']

/**
 * 조사 결과 고르기.
 *
 * <p>자리를 하나만 쓴다. 지금 상태를 담은 칩을 누르면 아래로 목록이 열리고, 고르면 닫힌다.
 * 고른 값을 알리기만 하고 그다음은 쓰는 쪽이 정한다. 기타의 사유 입력은 카드 안에서 펼쳐야 하므로 여기 두지 않는다.
 *
 * <p>목록을 body 로 내보내 화면 좌표에 세운다. 이 컴포넌트가 놓이는 상세 카드와 좌측 패널이
 * 둘 다 넘치는 부분을 잘라 내는 상자라, 안에서 띄우면 목록이 잘려 보이지 않는다.
 */
export function SurveyResultPicker(props: {
  /** 지금 기록된 결과. 기록이 없으면(미조사) null */
  result: SurveyResult | null
  /** 아직 반영되지 않았지만 고른 값. 주면 칩이 이 값을 보여 준다 */
  pending?: SurveyResult | null
  /** 보낸 값의 답을 기다리는 동안 잠근다 — 겹쳐 고르면 마지막 선택과 다른 값이 남는다 */
  disabled?: boolean
  /** 미조사는 'NONE' 으로 온다 */
  onSelect: (choice: SurveyResult | 'NONE') => void
}) {
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const open = box !== null
  // 저장 전에 고른 값이 있으면 그것을 보여 준다. 이전 값이 남아 있으면 무엇을 골랐는지 알 수 없다
  const shown = props.pending !== undefined ? props.pending : props.result
  const status = deriveSurveyStatus(shown ?? undefined)

  function close() {
    setBox(null)
  }

  function toggle() {
    if (props.disabled === true) return
    if (open) {
      close()
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect === undefined) return
    setBox({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }

  // 잠기면 펼쳐 둔 목록도 접는다 — 열어 둔 채로 잠그면 누를 수 없는 목록이 남는다
  useEffect(() => {
    if (props.disabled === true) close()
  }, [props.disabled])

  // 바깥을 누르거나 Esc, 그리고 판이 움직이면 닫는다. 좌표로 세운 목록이라 스크롤을 따라가지 않는다
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  function choose(choice: SurveyResult | 'NONE') {
    props.onSelect(choice)
    close()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        disabled={props.disabled}
        aria-expanded={open}
        className={`flex w-full items-center gap-1.5 rounded-chip border px-2.5 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-60 ${
          shown === null || shown === undefined
            ? 'border-line-btn bg-btn text-ink-3 hover:bg-hover'
            : SURVEY_STATUS_TONE[status]
        }`}
      >
        <span className="flex-1 text-left">{SURVEY_STATUS_LABEL[status]}</span>
        <svg
          viewBox="0 0 24 24"
          className={`size-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {box !== null &&
        createPortal(
          <div
            ref={listRef}
            style={{ position: 'fixed', top: box.top, left: box.left, width: box.width }}
            className={`z-[60] overflow-hidden ${POPOVER}`}
          >
            {CHOICES.map((choice) => {
                const optionStatus = choice === 'NONE' ? 'todo' : deriveSurveyStatus(choice)
                const active = optionStatus === deriveSurveyStatus(props.result ?? undefined)
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => choose(choice)}
                    className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-[12px] transition-colors hover:bg-hover ${
                      active ? 'text-ink' : 'text-ink-2'
                    }`}
                  >
                    <span className={`size-2 shrink-0 rounded-full border ${SURVEY_STATUS_TONE[optionStatus]}`} aria-hidden="true" />
                    <span className="flex-1">{SURVEY_STATUS_LABEL[optionStatus]}</span>
                  </button>
                )
              })}
          </div>,
          document.body,
        )}
    </>
  )
}
