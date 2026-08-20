import { POINT_TYPE_FROM_SERVER, type ServerPointType } from './serverPointType.ts'
import type { MappableControlPoint } from './types'

/** 게스트 화면이 다루는 공개 기준점. 회원 전용 성과·조사·버전 필드는 포함하지 않는다. */
export interface PublicControlPoint extends MappableControlPoint {
  regionCode: string
  regionName: string
  address: string
}

export interface PublicControlPointResponse {
  id: number
  pointNo: string
  type: ServerPointType
  name: string
  longitude: number
  latitude: number
  regionCode: string
  regionName: string
  address: string
}

export function toPublicControlPoint(point: PublicControlPointResponse): PublicControlPoint {
  return {
    id: String(point.id),
    pointNo: point.pointNo,
    type: POINT_TYPE_FROM_SERVER[point.type],
    name: point.name,
    lng: point.longitude,
    lat: point.latitude,
    regionCode: point.regionCode,
    regionName: point.regionName,
    address: point.address,
  }
}

export const PUBLIC_CONTROL_POINTS_PATH = '/api/control-points/public'

export function publicControlPointPath(pointNo: string): string {
  return `${PUBLIC_CONTROL_POINTS_PATH}/${encodeURIComponent(pointNo)}`
}
