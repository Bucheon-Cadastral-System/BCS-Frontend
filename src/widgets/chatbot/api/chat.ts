import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, http } from '@/shared/api/http'
import type { ChatMessage } from '../model/types'

interface ChatResponse {
  answer: string
  /** 서버가 잰 생성 시간 — 옛 서버는 담지 않으므로 없을 수 있다 */
  elapsedMs?: number
}

/** 답변과 그것을 받기까지 걸린 시간 */
export interface ChatAnswer {
  text: string
  elapsedMs: number
}

/**
 * 요청을 끊는 시간.
 *
 * <p>모델이 도구를 여러 번 부르면 1분을 넘기도 한다. 여기서 끊더라도 서버는 답을 마저 만들어 이력에 남기므로,
 * 화면은 실패로 단정하지 않고 그 이력을 기다린다(waitForAnswer).
 */
const SEND_TIMEOUT_MS = 120_000

/** 대화는 계정에 딸린 서버 데이터다 — 브라우저에 남기지 않으므로 캐시가 화면과 서버를 잇는 유일한 자리다. */
export const CHAT_MESSAGES_KEY = ['chat', 'messages'] as const

/** 챗봇 질문 전송 — POST /api/chat. 서버가 질문과 답변을 그 계정의 대화로 남긴다. */
export async function sendChat(message: string): Promise<ChatAnswer> {
  const startedAt = Date.now()
  const { data } = await http.post<ChatResponse>('/api/chat', { message }, { timeout: SEND_TIMEOUT_MS })
  return { text: data.answer, elapsedMs: data.elapsedMs ?? Date.now() - startedAt }
}

/**
 * 답을 못 받은 것이 서버의 거절 때문인지 가린다.
 *
 * <p>응답이 아예 없는 실패(status 0)는 시간 제한이나 연결 끊김이고, 그때 서버는 답을 마저 만들고 있다.
 * 서버가 상태 코드를 돌려준 실패는 답이 없다는 뜻이라 기다릴 이유가 없다.
 */
export function serverMayStillAnswer(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0
}

export function useSendChatMutation() {
  return useMutation({ mutationFn: sendChat })
}

/** 그 계정의 대화를 오래된 것부터 받는다 — 로그인 전에는 빈 목록이다. */
export async function fetchChatMessages(): Promise<ChatMessage[]> {
  const { data } = await http.get<ChatMessage[]>('/api/chat/messages')
  return data
}

export function useChatHistoryQuery(enabled = true) {
  // 화면이 대화의 최신 상태를 들고 있으므로 다시 받아올 이유가 없다 — 복원은 첫 진입 한 번이면 된다
  return useQuery({ queryKey: CHAT_MESSAGES_KEY, queryFn: fetchChatMessages, staleTime: Infinity, enabled })
}

export async function clearChatMessages(): Promise<void> {
  await http.delete('/api/chat/messages')
}

export function useClearChatMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: clearChatMessages,
    onSuccess: () => queryClient.setQueryData(CHAT_MESSAGES_KEY, []),
  })
}
