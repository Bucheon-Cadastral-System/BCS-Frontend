import { QueryClient } from '@tanstack/react-query'

/** 서버 상태 캐시 — 갱신은 뮤테이션의 invalidate로만 일어나게 하고, 포커스 리페치는 지도 조작을 방해해 끈다. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
