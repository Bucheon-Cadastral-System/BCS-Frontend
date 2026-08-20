import type { PointType } from './types'

/**
 * 서버 표기와 화면 어휘 사이의 유일한 해석 지점 — 회원용 조회와 공개 조회가 같은 표기를 받는다.
 *
 * <p>표를 둘로 두면 종류가 늘 때 한쪽만 고쳐도 컴파일은 통과하고 다른 쪽만 undefined 로 읽힌다.
 *
 * <p>이 파일은 경로 별칭을 쓰지 않는다 — 테스트 러너(node --test)가 별칭을 풀지 못해,
 * 별칭을 쓰는 파일에 들어가면 이 표를 검사할 수 없다. 이 표를 쓰는 순수 모듈도 확장자까지 적어 수입한다.
 */
export type ServerPointType = 'TRIANGULATION' | 'TRIANGULATION_AUX' | 'DOGEUN'

export const POINT_TYPE_FROM_SERVER: Record<ServerPointType, PointType> = {
  TRIANGULATION: '지적삼각점',
  TRIANGULATION_AUX: '지적삼각보조점',
  DOGEUN: '지적도근점',
}

export const POINT_TYPE_TO_SERVER: Record<PointType, ServerPointType> = {
  지적삼각점: 'TRIANGULATION',
  지적삼각보조점: 'TRIANGULATION_AUX',
  지적도근점: 'DOGEUN',
}
