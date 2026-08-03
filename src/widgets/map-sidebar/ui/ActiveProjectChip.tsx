import { MapChip } from '@/shared/ui/MapChip'
import { percent } from '@/shared/lib/percent'

/**
 * 접어 둔 판을 대신하는 칩. 배치(지도 좌상단)는 부모가 정하고 여기선 내용만 채운다.
 * 누르면 판이 다시 펼쳐지고, 오른쪽 X 는 고른 것을 놓고 판을 끈다.
 */
export function MinimizedPanelChip(props: {
  label: string
  value: string
  /** 값 오른쪽에 붙는 수치 — 조사는 진행률, 기준점은 개수 */
  trailing?: { surveyed: number; total: number } | { count: number }
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <MapChip
      label={props.label}
      value={props.value}
      title={`${props.label} 판 열기`}
      onClick={props.onOpen}
      leading={<span className="size-[9px] shrink-0 rounded-full bg-teal" aria-hidden />}
      trailing={props.trailing && <ChipCount {...props.trailing} />}
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

function ChipCount(props: { surveyed: number; total: number } | { count: number }) {
  const text =
    'count' in props
      ? `${props.count}개`
      : `${props.surveyed}/${props.total}`
  return (
    <span className="shrink-0 rounded-full bg-teal-wash-strong px-2 py-0.5 font-mono text-[11px] font-semibold text-teal-text">
      {text}
      {'count' in props ? null : (
        <span className="ml-1 font-normal opacity-80">{percent(props.surveyed, props.total)}%</span>
      )}
    </span>
  )
}
