import { MapChip } from '@/shared/ui/MapChip'
import { percent } from '@/shared/lib/percent'

/**
 * 활성 조사 프로젝트 표시 칩. 배치(지도 좌상단)는 부모가 정하고 여기선 내용만 채운다.
 * 패널을 접어도 '어떤 프로젝트를 조사 중인지' 알 수 있게 항상 표시 → 클릭하면 프로젝트 패널을 연다.
 * (패널이 열려 있을 땐 패널이 같은 정보를 보여주므로 MapPage에서 숨김)
 */
export function ActiveProjectChip(props: {
  name: string
  surveyed: number
  total: number
  onOpen: () => void
  onClear: () => void
}) {
  const pct = percent(props.surveyed, props.total)
  return (
    <MapChip
      label="조사 프로젝트"
      value={props.name}
      title="조사 프로젝트 패널 열기"
      onClick={props.onOpen}
      leading={<span className="size-[9px] shrink-0 rounded-full bg-teal" aria-hidden />}
      trailing={
        <span className="shrink-0 rounded-full bg-teal-wash-strong px-2 py-0.5 font-mono text-[11px] font-semibold text-teal-text">
          {props.surveyed}/{props.total}
          <span className="ml-1 font-normal opacity-80">{pct}%</span>
        </span>
      }
      action={
        <button
          type="button"
          onClick={props.onClear}
          title="조사 선택 해제"
          aria-label="조사 선택 해제"
          className="flex size-6 items-center justify-center rounded-full text-ink-4 transition-colors hover:bg-hover hover:text-ink-2"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      }
    />
  )
}
