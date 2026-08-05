import type { TmEpsg } from '@/shared/lib/crs'

/** 지적기준점 종류 (1차: 3종) */
export const POINT_TYPES = ['지적삼각점', '지적삼각보조점', '지적도근점'] as const
export type PointType = (typeof POINT_TYPES)[number]

/**
 * 지적기준점 1개.
 * 성과 = TM 좌표(northing, easting, tmEpsg)가 권위값, lng/lat(WGS84)는 지도 표시용 파생값.
 * 축은 이름으로 못박는다 — 지적 성과 표기는 측량 관례(X=북, Y=동)라 GIS 축 순서(x=동)와 반대이므로
 * x·y 로 부르면 어느 쪽인지 코드만 봐서는 알 수 없다.
 */
export interface ControlPoint {
  id: string
  pointNo: string
  type: PointType
  name: string
  lng: number
  lat: number
  northing: number
  easting: number
  tmEpsg: TmEpsg
  /** 최근 조사 요약 — 파일의 최종조사 열 문구 그대로(어휘를 강제하지 않는다). 없으면 null */
  lastSurveyResult: string | null
  /** 최종조사일(ISO 날짜). 없으면 null */
  lastSurveyedOn: string | null
}
