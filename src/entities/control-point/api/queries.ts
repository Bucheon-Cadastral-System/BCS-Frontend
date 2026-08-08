import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteControlPoint, fetchControlPoints, fetchLastSurvey, registerControlPoint, updateControlPoint } from './controlPointApi'

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
