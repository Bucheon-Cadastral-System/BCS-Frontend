import {
  SURVEY_STATUS_DOT,
  SURVEY_STATUS_LABEL,
  SURVEY_STATUS_ORDER,
  SURVEY_STATUS_TONE,
} from '@/entities/survey-record'
import type { SurveyStatus } from '@/entities/survey-record'

/**
 * 상태 거르개 — 고른 상태의 점만 지도와 이 목록에 남긴다.
 *
 * <p>여럿을 함께 고를 수 있다. 손봐야 할 점을 모아 보려면 망실과 조사불가를 같이 켜야 하고,
 * 남은 일을 보려면 미조사만 켜야 한다. 하나도 고르지 않은 상태가 곧 전체다.
 *
 * <p>칩은 지도 마커·내역과 같은 색을 쓴다. 여기서 켠 색이 지도에서 어떤 점으로 나타나는지 눈으로 잇는다.
 * 상태 표시를 켠 동안에만 세운다 — 그리지 않는 값으로 점이 빠지면 왜 없는지 알 길이 없다.
 */
export function StatusFilterChips(props: {
  selected: ReadonlySet<SurveyStatus>
  onToggle: (status: SurveyStatus) => void
  onClear: () => void
  /** 상태별 개수 — 거르기 전 전체를 센 값이라 칩을 켜고 꺼도 숫자가 흔들리지 않는다 */
  countByStatus: Record<SurveyStatus, number>
}) {
  const active = props.selected.size > 0

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SURVEY_STATUS_ORDER.map((status) => {
        const on = props.selected.has(status)
        return (
          <button
            key={status}
            type="button"
            onClick={() => props.onToggle(status)}
            aria-pressed={on}
            className={`flex items-center gap-1.5 rounded-chip border px-2 py-[3px] text-[11.5px] font-medium transition-colors ${
              on ? SURVEY_STATUS_TONE[status] : 'border-line-btn bg-btn text-ink-3 hover:bg-hover'
            }`}
          >
            <span className={`size-[7px] shrink-0 rounded-full ${SURVEY_STATUS_DOT[status]}`} aria-hidden />
            {SURVEY_STATUS_LABEL[status]}
            <span className={on ? '' : 'text-ink-4'}>{props.countByStatus[status]}</span>
          </button>
        )
      })}
      {/* 켠 것이 있을 때만 세운다 — 전체를 보는 중에는 되돌릴 것이 없다 */}
      {active && (
        <button
          type="button"
          onClick={props.onClear}
          className="rounded-chip px-1.5 py-[3px] text-[11.5px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
        >
          전체
        </button>
      )}
    </div>
  )
}
