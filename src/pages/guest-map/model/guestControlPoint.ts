/** 공개 API가 내려주는 기준점 종류. 회원용 모델과 값만 공유하고 필드는 섞지 않는다. */
export type GuestPointType = '지적삼각점' | '지적삼각보조점' | '지적도근점'

type ServerPointType = 'TRIANGULATION' | 'TRIANGULATION_AUX' | 'DOGEUN'

const TYPE_FROM_SERVER: Record<ServerPointType, GuestPointType> = {
  TRIANGULATION: '지적삼각점',
  TRIANGULATION_AUX: '지적삼각보조점',
  DOGEUN: '지적도근점',
}

export interface GuestControlPoint {
  id: string
  pointNo: string
  type: GuestPointType
  name: string
  lng: number
  lat: number
  regionCode: string
  regionName: string
  address: string
}

export interface GuestControlPointResponse {
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

/** 공개 응답에 없는 회원용 필드는 만들지 않는다. */
export function toGuestControlPoint(point: GuestControlPointResponse): GuestControlPoint {
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
