import type { TmEpsg } from '@/shared/lib/crs'

/**
 * 서버가 주고받는 좌표계 표기와 EPSG 코드 사이의 유일한 해석 지점.
 *
 * <p>회원 조회와 공개 조회가 같은 표기를 받으므로 표를 하나만 둔다.
 * 형만 들여오므로 이 파일은 실행 시점에 다른 계층을 부르지 않는다.
 */
export type ServerCrs = 'GRS80_WEST' | 'GRS80_CENTRAL' | 'GRS80_EAST' | 'GRS80_EAST_SEA' | 'BESSEL_CENTRAL'

export const EPSG_FROM_CRS: Record<ServerCrs, TmEpsg> = {
  GRS80_WEST: 'EPSG:5185',
  GRS80_CENTRAL: 'EPSG:5186',
  GRS80_EAST: 'EPSG:5187',
  GRS80_EAST_SEA: 'EPSG:5188',
  BESSEL_CENTRAL: 'EPSG:5174',
}

export const CRS_FROM_EPSG: Record<TmEpsg, ServerCrs> = {
  'EPSG:5185': 'GRS80_WEST',
  'EPSG:5186': 'GRS80_CENTRAL',
  'EPSG:5187': 'GRS80_EAST',
  'EPSG:5188': 'GRS80_EAST_SEA',
  'EPSG:5174': 'BESSEL_CENTRAL',
}
