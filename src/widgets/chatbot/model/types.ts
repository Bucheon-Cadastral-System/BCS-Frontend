/** 창 표시 모드 — 코너 플로팅 카드 / 우측 도킹(전체 높이). */
export type ChatMode = 'corner' | 'right'

export interface Size {
  width: number
  height: number
}

/** 대화 메시지 — 역할과 본문만. */
export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

/** localStorage에 저장하는 창 배치 상태(대화 내용은 별도 키). */
export interface PersistedChatUi {
  open: boolean
  mode: ChatMode
  floatSize: Size
  dockWidth: number
}

/** 차트 블록 스펙 — 모델이 ```chart JSON으로 내려주고 Chart.js로 렌더한다. */
export interface ChartSpec {
  type: 'bar' | 'line' | 'pie' | 'doughnut'
  title?: string
  labels: string[]
  datasets: { label: string; data: number[] }[]
}

/** 화면 액션 — 지도 앱이라 라우팅 대신 지도 상호작용으로 매핑한다(기준점 포커스·조사 프로젝트 선택). */
export type ChatAction =
  | { type: 'focusPoint'; pointNo: string; label?: string }
  | { type: 'selectProject'; projectId: number | string; label?: string }
