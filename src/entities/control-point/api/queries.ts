import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteControlPoint, fetchControlPoints, fetchLastSurveyorName, registerControlPoint, updateControlPoint } from './controlPointApi'

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

/** 최종조사원 이름 — 고른 점 하나에 대해서만 읽는다. */
export function useLastSurveyorNameQuery(pointId: string | null) {
  return useQuery({
    queryKey: ['control-point', 'last-surveyor', pointId],
    queryFn: () => fetchLastSurveyorName(pointId as string),
    enabled: pointId !== null,
    staleTime: 60_000,
  })
}
