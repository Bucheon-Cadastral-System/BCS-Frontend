import { PILL, PROGRESS_FILL } from '@/shared/ui/classes'
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
  /** 왼쪽 이름 — 「조사」·「기준점」 */
  label: string
  value: string
  /** 오른쪽 수치 — 조사는 진행률, 기준점은 개수 */
  trailing?: { surveyed: number; total: number } | { count: number }
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
          <Progress surveyed={trailing.surveyed} total={trailing.total} />
        ))}
    </button>
  )
}

function Progress(props: { surveyed: number; total: number }) {
  const done = percent(props.surveyed, props.total)
  return (
    <>
      {/* 진행률은 좌측 패널의 막대와 같은 규격이다 — 같은 값을 두 화면이 다르게 그리면 어느 쪽이 맞는지 의심하게 된다 */}
      <span className="h-1 w-16 shrink-0 overflow-hidden rounded-[2px] bg-track" aria-hidden>
        <span className={`block h-full rounded-[2px] ${PROGRESS_FILL}`} style={{ width: `${done}%` }} />
      </span>
      <span className="shrink-0 text-[11.5px] font-semibold text-teal-text">{done}%</span>
    </>
  )
}
