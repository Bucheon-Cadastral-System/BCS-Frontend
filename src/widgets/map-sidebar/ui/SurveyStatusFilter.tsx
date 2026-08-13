import { Fragment } from 'react'
import type { ReactNode } from 'react'
import {
  SURVEY_STATUS_DOT,
  SURVEY_STATUS_LABEL,
  SURVEY_STATUS_ORDER,
  SURVEY_STATUS_TEXT_COLOR,
} from '@/entities/survey-record'
import type { SurveyStatus } from '@/entities/survey-record'

/**
 * 조사 상태 구역 — 머리줄을 누르면 상태가 지도에 켜지면서 그 아래 다섯 갈래가 펼쳐진다.
 *
 * <p>낱개의 칩을 늘어놓지 않는다. 다섯 갈래는 서로 겹치지 않고 더하면 전체가 되는 한 벌이라,
 * 테두리 하나로 묶고 칸을 나눠 한 덩어리로 보이게 한다. 칸은 남는 폭을 고르게 나눠 가지므로
 * 판이 좁아져도 줄이 접히지 않는다.
 *
 * <p>고른 갈래는 여러 개일 수 있다. 손봐야 할 점을 모아 보려면 망실과 조사불가를 함께 켜야 하고,
 * 남은 일을 보려면 미조사만 켜야 한다. 하나도 고르지 않은 상태가 곧 전체다.
 *
 * <p>색은 지도 마커와 같은 뜻으로 쓴다. 켠 칸만 면이 차고 글자와 점이 제 색을 낸다.
 */
export function SurveyStatusFilter(props: {
  /** 상태 표시가 켜져 있는지 — 켜면 지도 마커에 판정이 얹히고 이 구역이 펼쳐진다 */
  visible: boolean
  onToggleVisible: () => void
  selected: ReadonlySet<SurveyStatus>
  onToggle: (status: SurveyStatus) => void
  onClear: () => void
  /** 갈래별 개수 — 거르기 전 전체를 센 값이라 켜고 꺼도 숫자가 흔들리지 않는다 */
  countByStatus: Record<SurveyStatus, number>
  /** 접었을 때 그 자리에 대신 세울 것 — 조사 상세는 진행률 내역을 접어 두고도 보여 준다 */
  collapsed?: ReactNode
}) {
  const filtering = props.selected.size > 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={props.onToggleVisible}
          aria-expanded={props.visible}
          className={`flex items-center gap-1 text-[11px] font-medium tracking-[.08em] transition-colors ${
            props.visible ? 'text-teal-text' : 'text-ink-3 hover:text-ink'
          }`}
        >
          조사 상태
          <span
            className={`size-[15px] shrink-0 transition-transform ${props.visible ? 'rotate-180' : ''}`}
            aria-hidden
          >
            <IconChevronDown />
          </span>
        </button>
        {/* 켠 것이 있을 때만 세운다 — 전체를 보는 중에는 되돌릴 것이 없다 */}
        {props.visible && filtering && (
          <button
            type="button"
            onClick={props.onClear}
            className="ml-auto rounded-chip px-1.5 py-[2px] text-[11px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            전체
          </button>
        )}
      </div>

      {props.visible ? (
        <div className="flex overflow-hidden rounded-ctl border border-line-field">
          {SURVEY_STATUS_ORDER.map((status, index) => {
            const on = props.selected.has(status)
            return (
              <Fragment key={status}>
                {index > 0 && <span className="w-px shrink-0 bg-line" aria-hidden />}
                <button
                  type="button"
                  onClick={() => props.onToggle(status)}
                  aria-pressed={on}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-px whitespace-nowrap px-1 py-[5px] transition-colors ${
                    on ? 'bg-hover' : 'hover:bg-hover'
                  }`}
                >
                  <span
                    className={`flex items-center gap-1 text-[10.5px] ${
                      on ? SURVEY_STATUS_TEXT_COLOR[status] : 'text-ink-3'
                    }`}
                  >
                    <span
                      className={`size-[5px] shrink-0 rounded-full ${SURVEY_STATUS_DOT[status]} ${on ? '' : 'opacity-40'}`}
                      aria-hidden
                    />
                    {SURVEY_STATUS_LABEL[status]}
                  </span>
                  <span
                    className={`text-[12px] font-semibold ${on ? SURVEY_STATUS_TEXT_COLOR[status] : 'text-ink-2'}`}
                  >
                    {props.countByStatus[status]}
                  </span>
                  {/* 켠 칸 아래에 제 색의 밑줄을 둔다 — 면 색만으로는 다섯 칸 중 무엇이 켜졌는지 한눈에 갈리지 않는다.
                      색은 글자색을 물려 쓴다(bg-current). 미조사는 점이 속 빈 모양이라 그 클래스로는 면을 채울 수 없다 */}
                  <span
                    className={`mt-[3px] h-[2px] w-full rounded-full ${
                      on ? `${SURVEY_STATUS_TEXT_COLOR[status]} bg-current` : 'bg-transparent'
                    }`}
                    aria-hidden
                  />
                </button>
              </Fragment>
            )
          })}
        </div>
      ) : (
        props.collapsed
      )}
    </div>
  )
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
