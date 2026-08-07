import type { TmEpsg } from '@/shared/lib/crs'

/** 지적기준점 종류 (1차: 3종) — 배열 순서가 화면 정렬 순서다(등급 위계: 삼각 → 삼각보조 → 도근) */
export const POINT_TYPES = ['지적삼각점', '지적삼각보조점', '지적도근점'] as const
export type PointType = (typeof POINT_TYPES)[number]

// 이름의 숫자는 자릿수가 아니라 값으로 견준다 — "도근 2"가 "도근 10" 앞에 온다
const nameCollator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' })

/**
 * 기준점 목록의 기본 정렬 = 종류 순 → 이름 순.
 * 서버는 등록 순서대로 내리므로(임포트 파일 순) 화면마다 제각각 늘어놓지 않게 여기 한 곳에서 못박는다.
 */
export function compareControlPoints(a: ControlPoint, b: ControlPoint): number {
  if (a.type !== b.type) return POINT_TYPES.indexOf(a.type) - POINT_TYPES.indexOf(b.type)
  return nameCollator.compare(a.name, b.name)
}

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
  // 최종조사 요약(결과·조사일·조사원)은 이 모델에 없다.
  // 점 하나를 고른 뒤 상세 카드만 쓰는 값이라 그때 따로 읽는다(LastSurvey).
}
