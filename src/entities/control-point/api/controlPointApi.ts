import { http } from '@/shared/api/http'
import type { TmEpsg } from '@/shared/lib/crs'
import type { ControlPoint, PointType } from '../model/types'

/** 서버 enum 표기 ↔ 프론트 표기 매핑 */
type ServerPointType = 'TRIANGULATION' | 'TRIANGULATION_AUX' | 'DOGEUN'
type ServerCrs = 'GRS80_WEST' | 'GRS80_CENTRAL' | 'GRS80_EAST' | 'GRS80_EAST_SEA' | 'BESSEL_CENTRAL'

const TYPE_FROM_SERVER: Record<ServerPointType, PointType> = {
  TRIANGULATION: '지적삼각점',
  TRIANGULATION_AUX: '지적삼각보조점',
  DOGEUN: '지적도근점',
}

const TYPE_TO_SERVER: Record<PointType, ServerPointType> = {
  지적삼각점: 'TRIANGULATION',
  지적삼각보조점: 'TRIANGULATION_AUX',
  지적도근점: 'DOGEUN',
}

const EPSG_FROM_CRS: Record<ServerCrs, TmEpsg> = {
  GRS80_WEST: 'EPSG:5185',
  GRS80_CENTRAL: 'EPSG:5186',
  GRS80_EAST: 'EPSG:5187',
  GRS80_EAST_SEA: 'EPSG:5188',
  BESSEL_CENTRAL: 'EPSG:5174',
}

const CRS_FROM_EPSG: Record<TmEpsg, ServerCrs> = {
  'EPSG:5185': 'GRS80_WEST',
  'EPSG:5186': 'GRS80_CENTRAL',
  'EPSG:5187': 'GRS80_EAST',
  'EPSG:5188': 'GRS80_EAST_SEA',
  'EPSG:5174': 'BESSEL_CENTRAL',
}

interface ServerControlPoint {
  id: number
  pointNo: string
  type: ServerPointType
  name: string
  crs: ServerCrs
  northing: number
  easting: number
  longitude: number
  latitude: number
}

/** 서버 응답 → 프론트 모델. 축 주의: 서버 northing=북/easting=동, 프론트 tmX=동(easting)/tmY=북(northing). */
function toControlPoint(server: ServerControlPoint): ControlPoint {
  return {
    id: String(server.id),
    pointNo: server.pointNo,
    type: TYPE_FROM_SERVER[server.type],
    name: server.name,
    lng: server.longitude,
    lat: server.latitude,
    tmX: server.easting,
    tmY: server.northing,
    tmEpsg: EPSG_FROM_CRS[server.crs],
  }
}

export async function fetchControlPoints(): Promise<ControlPoint[]> {
  const res = await http.get<{ content: ServerControlPoint[] }>('/api/control-points')
  return res.data.content.map(toControlPoint)
}

export interface RegisterControlPointArgs {
  pointNo: string
  type: PointType
  name: string
  lng: number
  lat: number
  tmX: number
  tmY: number
  tmEpsg: TmEpsg
}

export async function registerControlPoint(args: RegisterControlPointArgs): Promise<ControlPoint> {
  const res = await http.post<ServerControlPoint>('/api/control-points', {
    pointNo: args.pointNo,
    type: TYPE_TO_SERVER[args.type],
    name: args.name,
    crs: CRS_FROM_EPSG[args.tmEpsg],
    northing: args.tmY,
    easting: args.tmX,
    longitude: args.lng,
    latitude: args.lat,
  })
  return toControlPoint(res.data)
}
