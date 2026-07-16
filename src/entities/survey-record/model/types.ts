/**
 * 조사기록 = 기준점 × 프로젝트 조인.
 * 레코드가 존재하면 해당 프로젝트에서 그 기준점은 "조사완료", 없으면 "미조사".
 * (망실은 기준점 자체의 속성으로 별도 관리)
 */
export interface SurveyRecord {
  projectId: string
  pointId: string
  surveyedAt: string
}
