import { useMutation } from '@tanstack/react-query'
import { http } from '@/shared/api/http'

interface ChatResponse {
  answer: string
}

/** 챗봇 질문 전송 — POST /api/chat, 응답 answer 텍스트를 돌려준다. */
export async function sendChat(message: string): Promise<string> {
  // 응답이 오래 걸리면 무한 로딩 대신 실패로 끊는다. 서버 read-timeout(20s)보다 살짝 크게 잡아 정상 응답은 안 자른다
  const { data } = await http.post<ChatResponse>('/api/chat', { message }, { timeout: 25_000 })
  return data.answer
}

export function useSendChatMutation() {
  return useMutation({ mutationFn: sendChat })
}
