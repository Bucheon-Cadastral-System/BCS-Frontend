import { safeStorage } from '@/shared/lib/safeStorage'
import type { ChatMode, PersistedChatUi, Size } from './types'

const UI_KEY = 'bcs.chat.ui'

/** 대화를 브라우저에 담던 시절의 키 — 계정이 바뀌어도 남아 있으므로 한 번 지운다. */
const LEGACY_MESSAGES_KEY = 'bcs.chat.messages'

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

/**
 * 이 브라우저에 남은 예전 대화를 지운다.
 * 대화는 계정에 딸린 서버 데이터가 됐으므로, 남겨 두면 계정을 바꿔도 앞사람 대화가 그대로 보인다.
 */
export function clearLegacyChatMessages(): void {
  safeStorage.remove(LEGACY_MESSAGES_KEY)
}

/**
 * 이 브라우저에 남은 챗봇 흔적을 모두 지운다 — 계정이 바뀌는 자리에서 부른다.
 *
 * <p>창을 어디에 어떻게 띄워 두었는지는 그 사람의 작업 방식이다. 같은 기기를 나눠 쓰는 곳에서
 * 남겨 두면 다음 사람이 앞사람의 배치로 시작한다. 화면 테마는 계정이 아니라 기기의 것이라 건드리지 않는다.
 */
export function clearChatStorage(): void {
  safeStorage.remove(UI_KEY)
  safeStorage.remove(LEGACY_MESSAGES_KEY)
}
