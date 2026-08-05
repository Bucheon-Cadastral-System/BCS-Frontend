import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteControlPoint, fetchControlPoints, registerControlPoint, updateControlPoint } from './controlPointApi'

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
