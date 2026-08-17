import { publicHttp } from '@/shared/api/http'
import {
  PUBLIC_CONTROL_POINTS_PATH,
  publicControlPointPath,
  toPublicControlPoint,
  type PublicControlPoint,
  type PublicControlPointResponse,
} from '../model/publicControlPoint'

interface PublicControlPointListResponse {
  content: PublicControlPointResponse[]
}

/** 게스트 목록은 인증 헤더와 토큰 갱신이 없는 공개 클라이언트만 사용한다. */
export async function fetchPublicControlPoints(): Promise<PublicControlPoint[]> {
  const { data } = await publicHttp.get<PublicControlPointListResponse>(PUBLIC_CONTROL_POINTS_PATH)
  return data.content.map(toPublicControlPoint)
}

/** 공개 상세의 식별자는 내부 id가 아니라 관리번호(pointNo)다. */
export async function fetchPublicControlPoint(pointNo: string): Promise<PublicControlPoint> {
  const { data } = await publicHttp.get<PublicControlPointResponse>(publicControlPointPath(pointNo))
  return toPublicControlPoint(data)
}
