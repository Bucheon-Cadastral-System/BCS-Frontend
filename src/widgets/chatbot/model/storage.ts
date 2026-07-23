import { safeStorage } from '@/shared/lib/safeStorage'
import type { ChatMessage, ChatMode, PersistedChatUi, Size } from './types'

const UI_KEY = 'bcs.chat.ui'
const MESSAGES_KEY = 'bcs.chat.messages'
const MAX_PERSISTED_MESSAGES = 50

export const DEFAULT_FLOAT_SIZE: Size = { width: 380, height: 520 }
export const DEFAULT_DOCK_WIDTH = 400

const DEFAULT_UI: PersistedChatUi = {
  open: false,
  mode: 'corner',
  floatSize: DEFAULT_FLOAT_SIZE,
  dockWidth: DEFAULT_DOCK_WIDTH,
}

function isSize(v: unknown): v is Size {
  return typeof v === 'object' && v !== null
    && typeof (v as Record<string, unknown>).width === 'number'
    && typeof (v as Record<string, unknown>).height === 'number'
}

/** 저장된 창 배치를 읽어 기본값과 병합한다. 코너(플로팅)는 새로고침 시 닫힌 채 시작하고 우측 도킹만 복원한다. */
export function loadChatUi(): PersistedChatUi {
  const raw = safeStorage.get(UI_KEY)
  if (!raw) return DEFAULT_UI
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedChatUi>
    const mode: ChatMode = parsed.mode === 'right' ? 'right' : 'corner'
    return {
      open: parsed.open === true && mode === 'right',
      mode,
      floatSize: isSize(parsed.floatSize) ? parsed.floatSize : DEFAULT_FLOAT_SIZE,
      dockWidth: typeof parsed.dockWidth === 'number' ? parsed.dockWidth : DEFAULT_DOCK_WIDTH,
    }
  } catch {
    return DEFAULT_UI
  }
}

export function saveChatUi(ui: PersistedChatUi): void {
  safeStorage.set(UI_KEY, JSON.stringify({ ...ui, open: ui.open && ui.mode === 'right' }))
}

function isChatMessage(v: unknown): v is ChatMessage {
  const m = v as Record<string, unknown>
  return typeof v === 'object' && v !== null
    && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string'
}

export function loadChatMessages(): ChatMessage[] {
  const raw = safeStorage.get(MESSAGES_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isChatMessage) : []
  } catch {
    return []
  }
}

export function saveChatMessages(messages: ChatMessage[]): void {
  safeStorage.set(MESSAGES_KEY, JSON.stringify(messages.slice(-MAX_PERSISTED_MESSAGES)))
}
