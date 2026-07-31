import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './http'

/**
 * 서버 상태 캐시 — 재시도는 연결 실패(응답 없음)·5xx만 1회(4xx는 재요청해도 결과가 같다). 포커스 리페치는 지도 조작을 방해해 끈다.
 * staleTime을 두지 않으면(기본 0) 쿼리가 다시 마운트될 때마다(화면 이동 등) 매번 다시 받아온다.
 * 기준점 같은 마스터 데이터는 자주 바뀌지 않으므로 기본을 5분으로 두고, 자주 바뀌는 쪽만 각 쿼리에서 줄인다.
 * 내 변경은 뮤테이션의 invalidate가 즉시 반영하므로 staleTime이 화면을 낡게 만들지 않는다.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false
        return error instanceof ApiError && (error.status === 0 || error.status >= 500)
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60_000,
    },
  },
})
