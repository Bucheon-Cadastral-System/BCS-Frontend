import { useQuery } from '@tanstack/react-query'
import { fetchGuestControlPoint, fetchGuestControlPoints } from './guestControlPointApi'

export const GUEST_CONTROL_POINTS_KEY = ['public-control-points'] as const

export function useGuestControlPointsQuery() {
  return useQuery({
    queryKey: GUEST_CONTROL_POINTS_KEY,
    queryFn: fetchGuestControlPoints,
    staleTime: 60_000,
  })
}

export function useGuestControlPointQuery(pointNo: string | null) {
  return useQuery({
    queryKey: [...GUEST_CONTROL_POINTS_KEY, pointNo],
    queryFn: () => fetchGuestControlPoint(pointNo as string),
    enabled: pointNo !== null,
    staleTime: 60_000,
  })
}
