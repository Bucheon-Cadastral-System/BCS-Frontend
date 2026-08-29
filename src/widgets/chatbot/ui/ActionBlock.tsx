import type { ReactNode } from 'react'
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

/**
 * 표 칸에 서는 바로가기 — 「bcs:selectProject:3」 같은 주소를 지도 상호작용으로 바꾼다.
 *
 * <p>표 한 행마다 버튼이 서야 하는데 액션 블록은 본문 아래에만 설 수 있다. 마크다운 링크는 칸 안에 들어가므로
 * 그 주소를 액션으로 읽는다. 아는 주소가 아니면 글자만 남긴다 — 대화에 바깥으로 나가는 길을 만들지 않는다.
 */
export function ActionLink({
  href,
  children,
  onAction,
}: {
  href?: string
  children?: ReactNode
  onAction?: (action: ChatAction) => void
}) {
  const action = parseHref(href)
  if (action === null) return <>{children}</>
  return (
    <button
      type="button"
      onClick={() => onAction?.(action)}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-chip border border-teal-edge bg-teal-wash px-2 py-1 text-[12px] font-medium leading-none text-teal-text transition-colors hover:bg-teal-wash-strong"
    >
      {children}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-3 shrink-0">
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </svg>
    </button>
  )
}

function parseHref(href: string | undefined): ChatAction | null {
  if (href === undefined || !href.startsWith('bcs:')) return null
  const [, type, value] = href.split(':')
  if (value === undefined || value === '') return null
  if (type === 'selectProject') return { type: 'selectProject', projectId: value }
  if (type === 'focusPoint') return { type: 'focusPoint', pointNo: value }
  return null
}

/** ```action 블록 → 지도 상호작용 버튼(기준점 포커스 / 프로젝트 선택). 형식이 깨지면 렌더하지 않는다. */
export function ActionBlock({ json, onAction }: { json: string; onAction?: (action: ChatAction) => void }) {
  const action = parseAction(json)
  if (!action) return null
  return (
    <button
      type="button"
      onClick={() => onAction?.(action)}
      className="mt-1 inline-flex items-center gap-1.5 rounded-chip border border-teal-edge bg-teal-wash px-3 py-1.5 text-[13px] font-medium text-teal-text transition-colors hover:bg-teal-wash-strong"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </svg>
      {action.label ?? (action.type === 'focusPoint' ? '지도에서 보기' : '이 프로젝트 선택')}
    </button>
  )
}
