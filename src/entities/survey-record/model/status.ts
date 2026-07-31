/**
 * 프로젝트별 기준점 조사 상태 — 규칙을 한 곳에 둔다.
 * 망실은 별도 축이 아니라 '조사해보니 없어졌다'는 조사 결과이므로, 기록이 있으면 조사됨이고 그중 망실이 우선한다.
 * (지도 마커·클러스터 집계·목록·상세가 각자 이 판정을 다시 쓰면 한쪽만 바뀌었을 때 화면끼리 어긋난다.)
 */
export type SurveyStatus = 'todo' | 'done' | 'lost'

export const SURVEY_STATUS_LABEL: Record<SurveyStatus, string> = {
  todo: '미조사',
  done: '조사완료',
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
