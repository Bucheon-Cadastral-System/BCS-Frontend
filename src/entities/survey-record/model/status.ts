/**
 * 프로젝트별 기준점 조사 상태 — 규칙을 한 곳에 둔다.
 * 조사한 점은 정상과 망실로 갈린다. 기록이 있으면 조사한 것이고, 그중 망실로 적힌 것이 망실이다.
 * 정상과 망실을 더하면 조사한 수가 되고, 미조사까지 더하면 대상 전체가 된다(어느 것도 겹치지 않는다).
 * (지도 마커·클러스터 집계·목록·상세가 각자 이 판정을 다시 쓰면 한쪽만 바뀌었을 때 화면끼리 어긋난다.)
 */
export type SurveyStatus = 'todo' | 'done' | 'lost'

export const SURVEY_STATUS_LABEL: Record<SurveyStatus, string> = {
  todo: '미조사',
  done: '정상',
  lost: '망실',
}

export function deriveSurveyStatus(pointId: string, surveyedIds: Set<string>, lostIds: Set<string>): SurveyStatus {
  if (lostIds.has(pointId)) return 'lost'
  return surveyedIds.has(pointId) ? 'done' : 'todo'
}

/** 망실도 '조사됨'으로 센다(조사 결과의 한 종류라서). */
export function isSurveyed(status: SurveyStatus): boolean {
  return status !== 'todo'
}
