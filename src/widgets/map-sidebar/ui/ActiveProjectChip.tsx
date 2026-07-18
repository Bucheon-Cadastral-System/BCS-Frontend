/**
 * 활성 조사 프로젝트 표시 칩 (지도 좌상단 오버레이).
 * 패널을 접어도 '어떤 프로젝트를 조사 중인지' 알 수 있게 항상 표시 → 클릭하면 프로젝트 패널을 연다.
 * (패널이 열려 있을 땐 패널이 같은 정보를 보여주므로 MapPage에서 숨김)
 * 테마는 클래스 기반 다크모드(.dark 조상 → dark:) 로 대응.
 */
export function ActiveProjectChip(props: {
  name: string
  surveyed: number
  total: number
  onOpen: () => void
}) {
  const pct = props.total ? Math.round((props.surveyed / props.total) * 100) : 0
  return (
    <button
      type="button"
      onClick={props.onOpen}
      title="조사 프로젝트 패널 열기"
      className="absolute left-3 top-3 z-[5] flex max-w-[260px] items-center gap-2.5 rounded-lg border border-gray-200 bg-white/95 py-2 pl-2.5 pr-3 shadow-lg backdrop-blur hover:bg-white dark:border-gray-700 dark:bg-gray-800/95 dark:hover:bg-gray-800"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />
      <span className="min-w-0 text-left">
        <span className="block text-[10px] font-medium leading-tight text-gray-500 dark:text-gray-400">조사 프로젝트</span>
        <span className="block truncate text-[13px] font-semibold leading-tight text-gray-900 dark:text-gray-100">{props.name}</span>
      </span>
      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
        {props.surveyed}/{props.total}
        <span className="ml-1 font-normal text-blue-500/80 dark:text-blue-400/80">{pct}%</span>
      </span>
    </button>
  )
}
