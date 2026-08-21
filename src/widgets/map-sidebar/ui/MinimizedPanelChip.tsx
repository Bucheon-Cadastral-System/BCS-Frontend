import {
  StatusDistributionBar,
  SURVEY_STATUS_LABEL,
  SURVEY_STATUS_ORDER,
  SURVEY_STATUS_TEXT_COLOR,
  type SurveyProgress,
  type SurveyStatus,
} from '@/entities/survey-record'
import { MapChip } from '@/shared/ui/MapChip'
import { percent } from '@/shared/lib/percent'

/** 조사는 진행률과 갈래별 개수를, 기준점은 지도에 깔린 개수를 싣는다 */
type ChipDetail = SurveyProgress | { count: number }

/**
 * 접어 둔 패널을 대신하는 칩. 배치(지도 좌상단)는 부모가 정하고 여기선 내용만 채운다.
 * 누르면 패널이 다시 펼쳐지고, 오른쪽 위 X 는 고른 것을 놓고 패널을 끈다.
 *
 * <p>조사는 이름 줄에 진행률을 숫자로 적고 그 아래에 상태 분포 막대를 깐다. 진행률 막대를 따로 두지 않는 것은,
 * 분포 막대에서 칠하지 않은 몫이 곧 남은 일이라 둘이 같은 사실의 두 그림이기 때문이다.
 */
export function MinimizedPanelChip(props: {
  label: string
  value: string
  /** 이름 오른쪽에 붙는 수치 — 없으면 이름 줄만 선다 */
  trailing?: ChipDetail
  onOpen: () => void
  onClose: () => void
}) {
  const detail = props.trailing
  const survey = detail === undefined || 'count' in detail ? null : detail

  return (
    <MapChip
      label={props.label}
      value={props.value}
      title={`${props.label} 패널 열기`}
      onClick={props.onOpen}
      trailing={detail && <ChipValue detail={detail} />}
      below={survey && <StatusBreakdown countByStatus={survey.countByStatus} />}
      action={
        <button
          type="button"
          onClick={props.onClose}
          title="닫기"
          aria-label="닫기"
          className="flex size-6 items-center justify-center rounded-full text-ink-4 transition-colors hover:bg-danger-wash hover:text-danger"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      }
    />
  )
}

function ChipValue(props: { detail: ChipDetail }) {
  const detail = props.detail
  return (
    <span className="shrink-0 text-[11.5px] font-semibold tabular-nums text-teal-text">
      {'count' in detail ? `${detail.count}개` : `${percent(detail.surveyed, detail.total)}%`}
    </span>
  )
}

function StatusBreakdown(props: { countByStatus: Record<SurveyStatus, number> }) {
  return (
    <>
      <StatusDistributionBar countByStatus={props.countByStatus} />
      {/* 막대를 갈래별 개수로 풀어 적는다. 색은 막대·지도 마커와 같은 뜻이라 앞에 점을 따로 두지 않는다 */}
      <span className="flex w-full flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-ink-3">
        {SURVEY_STATUS_ORDER.map((status) => (
          <span key={status} className="whitespace-nowrap">
            {SURVEY_STATUS_LABEL[status]}{' '}
            <b className={`font-semibold tabular-nums ${SURVEY_STATUS_TEXT_COLOR[status]}`}>
              {props.countByStatus[status]}
            </b>
          </span>
        ))}
      </span>
    </>
  )
}
