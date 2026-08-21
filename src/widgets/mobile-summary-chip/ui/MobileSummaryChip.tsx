import { StatusDistributionBar, type SurveyProgress } from '@/entities/survey-record'
import { PILL } from '@/shared/ui/classes'
import { percent } from '@/shared/lib/percent'

/**
 * 좁은 화면의 요약 칩 — 지도 위 상단, 헤더 바로 아래에 떠 있다.
 *
 * <p>넓은 화면은 헤더와 좌측 패널이 지금 무엇을 보고 있는지 늘 알려 주지만, 좁은 화면은 그 둘이 모두
 * 접혀 있다. 시트를 내리거나 줄여도 이 한 줄은 남아 어느 회차를, 또는 무엇을 지도에 깔고 있는지 알린다.
 *
 * <p>넓은 화면에서 접힌 패널을 대신하는 칩(MinimizedPanelChip)과 같은 자리를 맡는다. 이름(label)과
 * 값(value), 오른쪽 수치까지 규격이 같고 모양만 좁은 화면의 알약을 따른다.
 */
export function MobileSummaryChip(props: {
  /** 왼쪽 이름 — 「프로젝트」·「기준점」 */
  label: string
  value: string
  /** 오른쪽 수치 — 조사는 진행 상황, 기준점은 개수 */
  trailing?: SurveyProgress | { count: number }
  onOpen: () => void
}) {
  const trailing = props.trailing

  return (
    <button
      type="button"
      onClick={props.onOpen}
      className={`flex h-[38px] w-full items-center gap-[9px] px-3 text-left ${PILL}`}
    >
      <span className="shrink-0 text-[11px] font-semibold tracking-[.06em] text-teal-text">{props.label}</span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">{props.value}</span>
      {trailing !== undefined &&
        ('count' in trailing ? (
          <span className="shrink-0 text-[11.5px] font-semibold text-teal-text">{trailing.count}개</span>
        ) : (
          <Progress {...trailing} />
        ))}
    </button>
  )
}

function Progress(props: SurveyProgress) {
  return (
    <>
      {/* 좌측 패널·접힌 칩과 같은 막대를 쓴다 — 같은 값을 화면마다 다르게 그리면 어느 쪽이 맞는지 의심하게 된다.
          칠한 길이가 곧 조사한 만큼이라 진행률로 읽히면서 무엇이 정상이고 무엇이 망실인지까지 드러난다 */}
      <span className="block w-16 shrink-0">
        <StatusDistributionBar countByStatus={props.countByStatus} />
      </span>
      <span className="shrink-0 text-[11.5px] font-semibold tabular-nums text-teal-text">
        {percent(props.surveyed, props.total)}%
      </span>
    </>
  )
}
