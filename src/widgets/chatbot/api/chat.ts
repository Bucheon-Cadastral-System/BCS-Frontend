import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/shared/api/http'
import type { ChatMessage } from '../model/types'

interface ChatResponse {
  answer: string
}

/** 대화는 계정에 딸린 서버 데이터다 — 브라우저에 남기지 않으므로 캐시가 화면과 서버를 잇는 유일한 자리다. */
export const CHAT_MESSAGES_KEY = ['chat', 'messages'] as const

/** 챗봇 질문 전송 — POST /api/chat, 응답 answer 텍스트를 돌려준다. 서버가 질문과 답변을 그 계정의 대화로 남긴다. */
export async function sendChat(message: string): Promise<string> {
  // 응답이 오래 걸리면 무한 로딩 대신 실패로 끊는다. 서버 read-timeout(20s)보다 살짝 크게 잡아 정상 응답은 안 자른다
  const { data } = await http.post<ChatResponse>('/api/chat', { message }, { timeout: 25_000 })
  return data.answer
}

export function useSendChatMutation() {
  return useMutation({ mutationFn: sendChat })
}

/** 그 계정의 대화를 오래된 것부터 받는다 — 로그인 전에는 빈 목록이다. */
export async function fetchChatMessages(): Promise<ChatMessage[]> {
  const { data } = await http.get<ChatMessage[]>('/api/chat/messages')
  return data
}

export function useChatHistoryQuery() {
  // 화면이 대화의 최신 상태를 들고 있으므로 다시 받아올 이유가 없다 — 복원은 첫 진입 한 번이면 된다
  return useQuery({ queryKey: CHAT_MESSAGES_KEY, queryFn: fetchChatMessages, staleTime: Infinity })
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
