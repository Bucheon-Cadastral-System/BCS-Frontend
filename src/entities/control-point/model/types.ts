import type { TmEpsg } from '@/shared/lib/crs'

/** 지적기준점 종류 (1차: 3종) */
export const POINT_TYPES = ['지적삼각점', '지적삼각보조점', '지적도근점'] as const
export type PointType = (typeof POINT_TYPES)[number]

/**
 * 지적기준점 1개.
 * 성과 = TM 좌표(tmX, tmY, tmEpsg)가 권위값, lng/lat(WGS84)는 지도 표시용 파생값.
 */
export interface ControlPoint {
  id: string
  type: PointType
  name: string
  lng: number
  lat: number
  tmX: number
  tmY: number
  tmEpsg: TmEpsg
  /** 망실 여부 (프로토타입: 단일 플래그. 실서비스는 조사이력으로 관리 예정) */
  lost: boolean
  createdAt: string
}
