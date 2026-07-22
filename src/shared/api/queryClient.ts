import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './http'

/** 서버 상태 캐시 — 재시도는 연결 실패(응답 없음)·5xx만 1회(4xx는 재요청해도 결과가 같다). 포커스 리페치는 지도 조작을 방해해 끈다. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false
        return error instanceof ApiError && (error.status === 0 || error.status >= 500)
      },
      refetchOnWindowFocus: false,
    },
  },
})
