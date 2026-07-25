/** 조사 계기 — 정기적으로 도는 일반 조사와 굴착협의처럼 계기가 있는 조사를 구분한다. */
export type SurveyProjectType = 'GENERAL' | 'EXCAVATION_CONSULTATION'

export const SURVEY_PROJECT_TYPE_LABEL: Record<SurveyProjectType, string> = {
  GENERAL: '일반 조사',
  EXCAVATION_CONSULTATION: '굴착협의',
}

/** 조사 프로젝트 (예: "2026.7.1.자 조사") */
export interface SurveyProject {
  id: string
  type: SurveyProjectType
  name: string
}
