import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { POPOVER } from '@/shared/ui/classes'
import type { SurveyResult } from '../model/types'
import { SURVEY_STATUS_LABEL, SURVEY_STATUS_TONE, deriveSurveyStatus } from '../model/status'

/** 목록에 세우는 갈래. 미조사를 고르면 기록을 지운다. */
const CHOICES: (SurveyResult | 'NONE')[] = ['INTACT', 'LOST', 'UNAVAILABLE', 'ETC', 'NONE']

/** 칩과 목록 사이(px) */
const GAP = 4
/** 화면 가장자리에 붙이지 않고 남기는 여백(px) */
const EDGE = 8

/**
 * 조사 결과 고르기.
 *
 * <p>자리를 하나만 쓴다. 지금 상태를 담은 칩을 누르면 아래로 목록이 열리고, 고르면 닫힌다.
 * 고른 값을 알리기만 하고 그다음은 쓰는 쪽이 정한다. 기타의 비고 입력은 카드 안에서 펼쳐야 하므로 여기 두지 않는다.
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
  /**
   * 미조사도 고를 수 있는지. 기본은 고를 수 있다(기록을 지우는 길).
   * 현장 사진과 함께 고르는 자리처럼 '안 봤다'가 성립하지 않는 곳에서는 끈다.
   */
  allowNone?: boolean
  /** 미조사는 'NONE' 으로 온다 */
  onSelect: (choice: SurveyResult | 'NONE') => void
}) {
  /** 칩의 화면 좌표 — 목록을 어디에 세울지는 이것과 목록 높이로 정한다 */
  const [box, setBox] = useState<{ top: number; bottom: number; left: number; width: number } | null>(null)
  /** 재서 정한 자리. 첫 프레임은 칩 아래로 두고, 그리기 전에 이 값으로 고친다 */
  const [place, setPlace] = useState<{ top: number; maxHeight: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  /**
   * 목록을 내보낼 자리.
   *
   * <p>기본은 body 다. 다만 이 컴포넌트가 showModal 로 띄운 대화상자 안에 놓이면 body 로 내보낸 목록은
   * 대화상자 뒤에 깔린다 — top layer 에 올라간 요소는 z-index 와 무관하게 그 밖의 모든 것보다 위다.
   * 그 경우 대화상자 안으로 내보내 같은 층에 서게 한다.
   */
  const container = useRef<HTMLElement | null>(null)

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
    container.current = triggerRef.current?.closest('dialog') ?? document.body
    setPlace(null)
    setBox({ top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width })
  }

  /**
   * 아래가 좁으면 칩 위로 뒤집는다.
   *
   * <p>칩이 화면 아래쪽에 있으면 그 아래로 펼친 목록이 화면 밖으로 나간다. 화면 좌표로 세운 목록이라
   * 굴려서 따라갈 수도 없어, 아래 갈래는 누를 방법이 없어진다(시트가 짧게 설 때 늘 그렇다).
   */
  useLayoutEffect(() => {
    const list = listRef.current
    if (box === null || list === null) return
    const height = list.offsetHeight
    // 실제로 보이는 구간으로 잰다 — 아이폰 사파리의 window.innerHeight 는 아래 도구막대에 가린 만큼까지
    // 포함해서, 그 값으로 재면 다 들어간다고 보고 목록을 막대 뒤에 세운다
    const view = window.visualViewport
    const seenTop = view?.offsetTop ?? 0
    const seenBottom = seenTop + (view?.height ?? window.innerHeight)
    const below = seenBottom - box.bottom - GAP - EDGE
    const above = box.top - seenTop - GAP - EDGE
    const flip = height > below && above > below
    const room = Math.max(120, flip ? above : below)
    const top = flip ? Math.max(seenTop + EDGE, box.top - GAP - Math.min(height, room)) : box.bottom + GAP
    setPlace((current) => (current !== null && current.top === top && current.maxHeight === room ? current : { top, maxHeight: room }))
  }, [box])

  // 잠기면 펼쳐 둔 목록도 접는다 — 열어 둔 채로 잠그면 누를 수 없는 목록이 남는다
  useEffect(() => {
    if (props.disabled === true) close()
  }, [props.disabled])

  // 바깥을 누르거나 Esc, 그리고 패널이 움직이면 닫는다. 좌표로 세운 목록이라 스크롤을 따라가지 않는다
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
            // 띄운 쪽(시트)의 바깥 클릭 판정에서 이 층을 빼기 위한 표시
            data-popover=""
            style={{
              position: 'fixed',
              top: place?.top ?? box.bottom + GAP,
              left: box.left,
              width: box.width,
              maxHeight: place?.maxHeight,
            }}
            className={`z-[60] overflow-y-auto overscroll-contain ${POPOVER}`}
          >
            {(props.allowNone === false ? CHOICES.filter((c) => c !== 'NONE') : CHOICES).map((choice) => {
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
          container.current ?? document.body,
        )}
    </>
  )
}
