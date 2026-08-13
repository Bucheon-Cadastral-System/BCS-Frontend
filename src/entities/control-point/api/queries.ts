import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { deleteControlPoint, fetchControlPoints, fetchLastSurvey, fetchLastSurveys, registerControlPoint, updateControlPoint } from './controlPointApi'

export const CONTROL_POINTS_KEY = ['control-points'] as const

export function useControlPointsQuery() {
  return useQuery({ queryKey: CONTROL_POINTS_KEY, queryFn: fetchControlPoints })
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
 * 최종조사 캐시 키의 공통 접두.
 *
 * <p>최종조사는 저장된 값이 아니라 볼 때 계산하는 값이라, 그 점의 기록이 바뀌면 답이 바뀐다.
 * 한 점만 바뀌는 자리는 아래 키로 그 점만 비우고, 어느 점이 바뀌었는지 셀 수 없는 자리
 * (조사 삭제·대상 재지정·파일 임포트)는 이 접두로 통째로 비운다.
 */
export const LAST_SURVEY_KEY = ['control-point', 'last-survey'] as const

/** 최종조사 캐시 키 — 그 점의 조사 기록이 바뀌면 서버가 이 값을 다시 계산하므로 기록 쪽에서 비운다. */
export function lastSurveyKey(pointId: string) {
  return [...LAST_SURVEY_KEY, pointId] as const
}

/** 최종조사 요약 — 고른 점 하나에 대해서만 읽는다. 목록은 점이 수천 개라 함께 싣지 않는다. */
export function useLastSurveyQuery(pointId: string | null) {
  return useQuery({
    queryKey: lastSurveyKey(pointId as string),
    queryFn: () => fetchLastSurvey(pointId as string),
    enabled: pointId !== null,
    staleTime: 60_000,
  })
}

/**
 * 점 전체의 최종조사 캐시 키 — 단건 요약과 같은 접두 아래에 둔다.
 *
 * <p>어느 점이 바뀌었는지 셀 수 없어 위 접두로 통째로 비우는 자리(조사 삭제·대상 재지정·파일 임포트)가
 * 이 표까지 함께 비우게 하려는 것이다. 점 하나만 바뀌는 자리는 아래 {@link invalidateLastSurveys} 를 쓴다.
 * 점 id 는 숫자 문자열이라 마지막 자리가 겹치지 않는다.
 */
export const LAST_SURVEYS_KEY = [...LAST_SURVEY_KEY, 'all'] as const

/**
 * 그 점의 조사 기록이 바뀌었을 때 비울 최종조사 캐시 — 단건 요약과 점 전체 표가 함께 옛 값이 된다.
 *
 * <p>점 전체 표는 상태 표시를 켠 동안에만 살아 있으므로, 꺼 둔 사이의 무효화는 표시를 켜는 자리에서 갚는다.
 */
export function invalidateLastSurveys(queryClient: QueryClient, pointId: string) {
  void queryClient.invalidateQueries({ queryKey: lastSurveyKey(pointId) })
  void queryClient.invalidateQueries({ queryKey: LAST_SURVEYS_KEY })
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
    staleTime: 30_000,
  })
}
