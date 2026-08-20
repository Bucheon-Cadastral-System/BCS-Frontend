import { publicHttp } from '@/shared/api/http'
import {
  PUBLIC_CONTROL_POINTS_PATH,
  publicControlPointPath,
  toPublicControlPoint,
  type PublicControlPoint,
  type PublicControlPointResponse,
} from '../model/publicControlPoint'
import { compareControlPoints } from '../model/types'

interface PublicControlPointListResponse {
  content: PublicControlPointResponse[]
}

/**
 * 게스트 목록은 인증 헤더와 토큰 갱신이 없는 공개 클라이언트만 사용한다.
 *
 * <p>정렬은 회원 목록과 같이 받아 오는 이 자리에서만 건다 — 화면이 저마다 다시 늘어놓으면 순서가 갈린다.
 */
export async function fetchPublicControlPoints(): Promise<PublicControlPoint[]> {
  const { data } = await publicHttp.get<PublicControlPointListResponse>(PUBLIC_CONTROL_POINTS_PATH)
  return data.content.map(toPublicControlPoint).sort(compareControlPoints)
}

/** 공개 상세의 식별자는 내부 id가 아니라 관리번호(pointNo)다. */
export async function fetchPublicControlPoint(pointNo: string): Promise<PublicControlPoint> {
  const { data } = await publicHttp.get<PublicControlPointResponse>(publicControlPointPath(pointNo))
  return toPublicControlPoint(data)
}
