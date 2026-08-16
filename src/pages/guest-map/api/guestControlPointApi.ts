import { publicHttp } from '@/shared/api/http'
import {
  PUBLIC_CONTROL_POINTS_PATH,
  publicControlPointPath,
  toGuestControlPoint,
  type GuestControlPoint,
  type GuestControlPointResponse,
} from '../model/guestControlPoint'

type PublicListResponse = GuestControlPointResponse[] | { content: GuestControlPointResponse[] }

export async function fetchGuestControlPoints(): Promise<GuestControlPoint[]> {
  const { data } = await publicHttp.get<PublicListResponse>(PUBLIC_CONTROL_POINTS_PATH)
  const points = Array.isArray(data) ? data : data.content
  return points.map(toGuestControlPoint)
}

export async function fetchGuestControlPoint(pointNo: string): Promise<GuestControlPoint> {
  const { data } = await publicHttp.get<GuestControlPointResponse>(publicControlPointPath(pointNo))
  return toGuestControlPoint(data)
}
