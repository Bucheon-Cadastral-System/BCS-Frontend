import type { ChatAction } from '../model/types'

// ```action JSON을 안전하게 파싱. BCS는 라우터 없는 지도앱이라 지도 상호작용 액션만 허용한다.
function parseAction(raw: string): ChatAction | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const label = typeof o.label === 'string' ? o.label : undefined
    if (o.type === 'focusPoint' && typeof o.pointNo === 'string') return { type: 'focusPoint', pointNo: o.pointNo, label }
    if (o.type === 'selectProject' && (typeof o.projectId === 'string' || typeof o.projectId === 'number'))
      return { type: 'selectProject', projectId: o.projectId, label }
    return null
  } catch {
    return null
  }
}

/** ```action 블록 → 지도 상호작용 버튼(기준점 포커스 / 조사 프로젝트 선택). 형식이 깨지면 렌더하지 않는다. */
export function ActionBlock({ json, onAction }: { json: string; onAction?: (action: ChatAction) => void }) {
  const action = parseAction(json)
  if (!action) return null
  return (
    <button
      type="button"
      onClick={() => onAction?.(action)}
      className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-blue-500/40 bg-blue-500/5 px-3 py-1.5 text-[13px] font-medium text-blue-600 transition-colors hover:bg-blue-500/10 dark:border-blue-400/40 dark:text-blue-400"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </svg>
      {action.label ?? (action.type === 'focusPoint' ? '지도에서 보기' : '이 조사 선택')}
    </button>
  )
}
