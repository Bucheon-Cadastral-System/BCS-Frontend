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
}) {
  const pct = percent(props.surveyed, props.total)
  return (
    <MapChip
      label="조사 프로젝트"
      value={props.name}
      title="조사 프로젝트 패널 열기"
      onClick={props.onOpen}
      leading={<span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" aria-hidden />}
      trailing={
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[12px] font-bold tabular-nums text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
          {props.surveyed}/{props.total}
          <span className="ml-1 font-normal text-blue-500/80 dark:text-blue-400/80">{pct}%</span>
        </span>
      }
    />
  )
}
