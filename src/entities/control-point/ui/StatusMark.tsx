/**
 * 조사여부 마크: 조사완료=체크(V) / 미조사·망실=X. 색은 상태별 고정(파랑/회색/빨강).
 * onLight=흰 배경(라이트 팝오버)용 진한 톤, 기본=다크 chrome(사이드바)용 밝은 톤.
 */
export function StatusMark({ status, onLight = false }: { status: string; onLight?: boolean }) {
  const color =
    status === '조사완료'
      ? onLight
        ? 'text-blue-600'
        : 'text-blue-400'
      : status === '망실'
        ? onLight
          ? 'text-red-600'
          : 'text-red-400'
        : onLight
          ? 'text-gray-400'
          : 'text-gray-500'
  const path = status === '조사완료' ? 'm5 12 5 5 9-10' : 'M6 6l12 12M18 6 6 18'
  return (
    <span role="img" className={`inline-block h-4 w-4 shrink-0 ${color}`} title={status} aria-label={status}>
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={path} />
      </svg>
    </span>
  )
}
