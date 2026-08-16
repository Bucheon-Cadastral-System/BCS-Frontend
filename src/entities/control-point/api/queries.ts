import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CONTROL_POINTS_KEY, LAST_SURVEYS_KEY, LIST_STALE_MS, lastSurveyKey } from '@/shared/api/queryKeys'
import { deleteControlPoint, fetchControlPoints, fetchLastSurvey, fetchLastSurveys, registerControlPoint, updateControlPoint } from './controlPointApi'

// 키는 아래 계층이 쥔다 — 엔티티끼리 서로 수입하지 않기 위해서다. 이 엔티티의 공개 API 로는 여기서 다시 내보낸다
export { CONTROL_POINTS_KEY, LAST_SURVEY_KEY, LAST_SURVEYS_KEY, lastSurveyKey, invalidateLastSurveys } from '@/shared/api/queryKeys'

/**
 * 기준점 목록 — 시 전체 점을 한 번에 실어 가장 무겁고, 점이 늘거나 지워지는 일은 드물다.
 *
 * <p>그래서 낡는 시간을 가장 길게 둔다. 새로 등록한 점을 바로 봐야 하면 패널의 새로고침으로 받는다.
 */
export function useControlPointsQuery() {
  return useQuery({ queryKey: CONTROL_POINTS_KEY, queryFn: fetchControlPoints, staleTime: 60 * 60_000 })
}

export function useRegisterControlPointMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: registerControlPoint,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTROL_POINTS_KEY }),
  })
}

export function useUpdateControlPointMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateControlPoint,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTROL_POINTS_KEY }),
  })
}

export function useDeleteControlPointMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteControlPoint,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTROL_POINTS_KEY }),
  })
}

/**
 * 최종조사 요약 — 고른 점 하나에 대해서만 읽는다. 목록은 점이 수천 개라 함께 싣지 않는다.
 *
 * <p>열 때마다 다시 받는다(staleTime 0). 사람이 그 점을 보겠다고 누른 순간이라 값은 작고 횟수는 손이 정한다.
 * 이 값이 목록이 들고 있는 판정과 어긋나면 목록이 낡았다는 뜻이므로, 그때 목록을 다시 받는다.
 */
export function useLastSurveyQuery(pointId: string | null) {
  return useQuery({
    queryKey: lastSurveyKey(pointId as string),
    queryFn: () => fetchLastSurvey(pointId as string),
    enabled: pointId !== null,
    staleTime: 0,
  })
}

/**
 * 점마다 최종조사 하나씩 — 지도가 조사 프로젝트와 무관하게 점의 최신 상태를 그릴 때만 읽는다.
 *
 * <p>상태 표시를 끄고 있거나 고른 회차의 결과를 보는 동안에는 이 표를 쓰지 않으므로 요청도 내지 않는다.
 */
export function useLastSurveysQuery(enabled: boolean) {
  return useQuery({
    queryKey: LAST_SURVEYS_KEY,
    queryFn: fetchLastSurveys,
    enabled,
    staleTime: LIST_STALE_MS,
  })
}
