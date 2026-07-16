import { wgs84ToTm } from '@/shared/lib/crs'
import type { TmEpsg } from '@/shared/lib/crs'
import type { ControlPoint, PointType } from './types'

export interface CreateControlPointArgs {
  type: PointType
  name: string
  lng: number
  lat: number
  tmEpsg: TmEpsg
}

/** WGS84 입력으로 기준점 생성 — TM 성과좌표를 함께 계산해 저장한다. */
export function createControlPoint(args: CreateControlPointArgs): ControlPoint {
  const { x, y } = wgs84ToTm(args.lng, args.lat, args.tmEpsg)
  return {
    id: crypto.randomUUID(),
    type: args.type,
    name: args.name,
    lng: args.lng,
    lat: args.lat,
    tmX: x,
    tmY: y,
    tmEpsg: args.tmEpsg,
    lost: false,
    createdAt: new Date().toISOString(),
  }
}
