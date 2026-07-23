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
