/** 현장 판정 — 서버 어휘를 그대로 쓴다. 대상지 파일의 기존조사내용도 같은 값으로 들어온다. */
export type SurveyResult = 'INTACT' | 'LOST' | 'UNAVAILABLE' | 'ETC'

export const SURVEY_RESULT_LABEL: Record<SurveyResult, string> = {
  INTACT: '완전',
  LOST: '망실',
  UNAVAILABLE: '조사불가',
  ETC: '기타',
}

/**
 * 조사기록 = 기준점 × 프로젝트 조인.
 * 레코드가 존재하면 해당 프로젝트에서 그 기준점은 조사한 것이다.
 * → 조사한 점은 정상과 망실로 갈리고, 같은 점이라도 프로젝트(조사회차)마다 다를 수 있다.
 */
export interface SurveyRecord {
  projectId: string
  pointId: string
  surveyedAt: string
  result: SurveyResult
  /** 망실 여부 — 지도 표시가 정상·망실 두 갈래라 결과에서 미리 갈라 둔다 */
  lost: boolean
  /** 마지막으로 판정한 조사원 표시명 — 인증 없이 남긴 기록·파일로 들어온 기록은 null */
  surveyorName: string | null
}
