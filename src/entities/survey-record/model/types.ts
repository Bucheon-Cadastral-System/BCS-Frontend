/**
 * 조사기록 = 기준점 × 프로젝트 조인.
 * 레코드가 존재하면 해당 프로젝트에서 그 기준점은 "조사완료".
 * 조사 결과(현장 판정)는 `lost` 로 구분: false=정상, true=망실.
 * → 망실은 "조사해봤더니 없어졌다"는 조사 결과이므로 조사완료의 한 종류이며, 프로젝트(조사회차)별로 다를 수 있다.
 */
export interface SurveyRecord {
  projectId: string
  pointId: string
  surveyedAt: string
  /** 조사 결과: true=망실, false=정상 */
  lost: boolean
}
