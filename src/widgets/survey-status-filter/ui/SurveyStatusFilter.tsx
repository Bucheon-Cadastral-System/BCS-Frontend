import { useRef, useState } from 'react'
import {
  SURVEY_STATUS_DOT,
  SURVEY_STATUS_FILL,
  SURVEY_STATUS_LABEL,
  SURVEY_STATUS_ORDER,
  SURVEY_STATUS_TEXT_COLOR,
} from '@/entities/survey-record'
import type { SurveyStatus } from '@/entities/survey-record'
import { MAP_BAR_BTN, POPOVER_FLAT } from '@/shared/ui/classes'
import { useDismiss } from '@/shared/lib/useDismiss'

/**
 * 고른 칸의 글자·밑줄 색. 기타·미조사의 갈래 색은 목록에서 곁들이로 쓰려고 옅게 잡아 둔 값이라
 * 그대로 쓰면 고르지 않은 칸(ink-3)보다 흐려 보인다. 이 둘만 기본 잉크로 올린다.
 */
const SELECTED_TEXT: Record<SurveyStatus, string> = {
  ...SURVEY_STATUS_TEXT_COLOR,
  etc: 'text-ink-2',
  todo: 'text-ink-2',
}

/**
 * 기준점 상태 — 커맨드 바의 버튼과, 그 위로 열리는 말풍선.
 *
 * <p>패널 안에 두지 않는다. 켠 값은 지도와 두 패널에 함께 걸리는 화면 전역의 값이라, 패널마다 세우면
 * 어느 패널을 여느냐에 따라 조작할 수 있고 없고가 갈린다.
 *
 * <p>버튼은 말풍선을 접었다 폈다 할 뿐, 고른 갈래에는 손대지 않는다. 여는 손짓이 값까지 바꾸면
 * 전체를 해제해 둔 사람이 열어 볼 때마다 다섯 갈래가 도로 켜진다. 무엇을 볼지는 말풍선 안에서만 정한다.
 * 바깥을 눌렀을 때와 Esc 를 눌렀을 때도 접기만 한다.
 *
 * <p>표시를 내리는 자리는 말풍선 아래의 전체 해제다. 고를 것이 하나도 없는 채로 색만 켜져 있는 화면을
 * 두지 않으므로, 갈래를 모두 놓는 일과 표시를 내리는 일이 같은 뜻이 된다. 마지막 하나를 마저 끌 때도 함께 내려간다.
 * 이때 말풍선은 접지 않는다. 다시 고르는 자리가 그 안이라 닫으면 열던 걸음을 한 번 더 밟게 된다.
 *
 * <p>갈래마다 개수를 적지 않는다. 조사 상세의 분포 막대와 내역이 같은 수를 이미 적고, 아무 조사도 고르지 않은
 * 동안에는 전체 기준점을 기준으로 세게 되어 어느 범위의 수인지가 흐려진다. 말풍선은 고르는 일만 맡는다.
 *
 * <p>좁은 화면에서는 커맨드 바가 서지 않아 아래 독 안에 선다(variant='dock'). 그때는 손가락으로 짚는
 * 자리라 바의 24px 버튼 대신 38px 정사각을 쓰고, 독이 이미 면과 테두리를 두르고 있으므로 제 것은 두지 않는다.
 */
export function SurveyStatusFilter(props: {
  /** 켜져 있는지 — 고른 갈래가 하나라도 있으면 지도 마커에 판정이 얹힌다 */
  visible: boolean
  selected: ReadonlySet<SurveyStatus>
  onToggle: (status: SurveyStatus) => void
  onClear: () => void
  onSelectAll: () => void
  variant?: 'bar' | 'dock'
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  // 버튼도 이 안에 있어 버튼 클릭이 접기와 겹쳐 두 번 뒤집히지 않는다
  useDismiss({ enabled: open, onDismiss: () => setOpen(false), ref: rootRef })
  const allSelected = props.selected.size === SURVEY_STATUS_ORDER.length
  const dock = props.variant === 'dock'

  return (
    <span ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-pressed={props.visible}
        aria-expanded={open}
        title="기준점 상태"
        aria-label="기준점 상태"
        className={
          dock
            ? `flex size-[38px] shrink-0 items-center justify-center rounded-ctl transition-colors ${
                props.visible ? 'bg-teal-wash-strong text-teal-text' : 'text-ink-3 hover:text-ink-2'
              }`
            : `${MAP_BAR_BTN} ${
                props.visible ? 'bg-teal-wash-strong font-semibold text-teal-text' : 'text-ink-2 hover:bg-hover hover:text-ink'
              }`
        }
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="m8.5 12 2.5 2.5 4.5-5" />
        </svg>
        {!dock && <span className="max-lg:hidden">상태</span>}
      </button>

      {open && (
        <div
          role="group"
          aria-label="기준점 상태 고르기"
          // 안쪽 여백을 두지 않는다 — 칸이 말풍선 변까지 닿아야 패널 안의 패널로 보이지 않는다.
          // 모서리는 첫·끝 칸이 스스로 깎는다
          // 독 안의 버튼은 오른쪽 변 가까이 서므로 오른쪽 변에 맞춘다 — 가운데로 열면 화면 밖으로 넘친다
          className={`absolute bottom-[calc(100%+8px)] flex w-[300px] flex-wrap ${
            dock ? 'right-0' : 'left-1/2 -translate-x-1/2'
          } ${POPOVER_FLAT}`}
        >
          {SURVEY_STATUS_ORDER.map((status, index) => {
            const on = props.selected.has(status)
            const last = index === SURVEY_STATUS_ORDER.length - 1
            return (
              <button
                key={status}
                type="button"
                onClick={() => props.onToggle(status)}
                aria-pressed={on}
                className={`flex min-w-0 flex-1 flex-col items-center gap-[6px] whitespace-nowrap px-[2px] py-[10px] transition-colors ${
                  index === 0 ? 'rounded-tl-pop' : 'border-l border-line-row'
                } ${last ? 'rounded-tr-pop' : ''} ${
                  on ? `${SURVEY_STATUS_FILL[status]} shadow-[inset_0_-2px_0_currentColor] ${SELECTED_TEXT[status]}` : 'hover:bg-hover'
                }`}
              >
                {/* 고른 칸은 체크, 아닌 칸은 도트 — 위아래 여백을 둬 둘의 높이를 맞춘다 */}
                {on ? (
                  <svg viewBox="0 0 24 24" className="size-[13px]" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                ) : (
                  <span className={`my-[2px] size-[9px] shrink-0 rounded-full ${SURVEY_STATUS_DOT[status]}`} aria-hidden />
                )}
                <span className={`text-[11.5px] ${on ? '' : 'text-ink-3'}`}>{SURVEY_STATUS_LABEL[status]}</span>
              </button>
            )
          })}

          {/* 버리는 동작은 왼쪽, 담는 동작은 오른쪽 — 대상 기준점 고르기의 아래 줄과 같은 규격·같은 말이다 */}
          <div className="flex w-full items-center justify-between gap-1.5 rounded-b-pop border-t border-line-soft bg-soft px-2 py-1.5">
            <button
              type="button"
              onClick={props.onClear}
              disabled={props.selected.size === 0}
              className="rounded-chip px-2 py-1 text-[11.5px] text-danger transition-colors hover:bg-danger-wash disabled:opacity-40"
            >
              전체 해제
            </button>
            <button
              type="button"
              onClick={props.onSelectAll}
              disabled={allSelected}
              className="rounded-chip px-2 py-1 text-[11.5px] text-teal-text transition-colors hover:bg-teal-wash disabled:opacity-40"
            >
              {SURVEY_STATUS_ORDER.length}개 전체 선택
            </button>
          </div>
        </div>
      )}
    </span>
  )
}
