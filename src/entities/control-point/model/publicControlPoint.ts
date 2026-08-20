import { EPSG_FROM_CRS, type ServerCrs } from './serverCrs.ts'
import { POINT_TYPE_FROM_SERVER, type ServerPointType } from './serverPointType.ts'
import type { MappableControlPoint } from './types'
import type { TmEpsg } from '@/shared/lib/crs'

/**
 * 게스트 화면이 다루는 공개 기준점.
 *
 * <p>성과(TM 좌표)는 담고 관리 정보는 담지 않는다. 설치일자·판 번호·조사 이력은 관리하는 쪽의 값이다.
 */
export interface PublicControlPoint extends MappableControlPoint {
  tmEpsg: TmEpsg
  northing: number
  easting: number
  regionCode: string
  regionName: string
  address: string
}

export interface PublicControlPointResponse {
  id: number
  pointNo: string
  type: ServerPointType
  name: string
  crs: ServerCrs
  northing: number
  easting: number
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
    tmEpsg: EPSG_FROM_CRS[point.crs],
    northing: point.northing,
    easting: point.easting,
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
