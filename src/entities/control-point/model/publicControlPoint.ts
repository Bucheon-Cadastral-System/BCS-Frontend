import type { PointType } from './types'

type ServerPointType = 'TRIANGULATION' | 'TRIANGULATION_AUX' | 'DOGEUN'

const TYPE_FROM_SERVER: Record<ServerPointType, PointType> = {
  TRIANGULATION: '지적삼각점',
  TRIANGULATION_AUX: '지적삼각보조점',
  DOGEUN: '지적도근점',
}

/** 게스트 화면이 다루는 공개 기준점. 회원 전용 성과·조사·버전 필드는 포함하지 않는다. */
export interface PublicControlPoint {
  id: string
  pointNo: string
  type: PointType
  name: string
  lng: number
  lat: number
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

/** 공개 응답 필드만 화면 모델로 옮긴다. */
export function toPublicControlPoint(point: PublicControlPointResponse): PublicControlPoint {
  return {
    id: String(point.id),
    pointNo: point.pointNo,
    type: TYPE_FROM_SERVER[point.type],
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
