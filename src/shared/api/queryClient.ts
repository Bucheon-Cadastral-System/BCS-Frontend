import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './http'

/**
 * 서버 상태 캐시 — 재시도는 연결 실패(응답 없음)·5xx만 1회(4xx는 재요청해도 결과가 같다).
 *
 * <p>staleTime을 두지 않으면(기본 0) 쿼리가 다시 마운트될 때마다(화면 이동 등) 매번 다시 받아온다.
 * 기준점 같은 마스터 데이터는 자주 바뀌지 않으므로 기본을 5분으로 두고, 자주 바뀌는 쪽만 각 쿼리에서 줄인다.
 *
 * <p>창으로 돌아올 때 낡은 것만 다시 받는다. 지도 화면은 한 번 뜨면 다시 마운트되지 않아, 이 계기가 없으면
 * 다른 사람이 만든 프로젝트·기준점이 새로고침 전까지 오지 않는다. staleTime이 살아 있어 포커스마다 받지는 않는다.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false
        return error instanceof ApiError && (error.status === 0 || error.status >= 500)
      },
      refetchOnWindowFocus: true,
      staleTime: 5 * 60_000,
    },
  },
})
