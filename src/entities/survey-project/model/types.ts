/** 조사 프로젝트 (예: "2026.7.1.자 조사") */
export interface SurveyProject {
  id: string
  name: string
  note: string | null
}

/**
 * 새 조사·대상지 파일 불러오기 폼이 채우는 값.
 * 비어 있을 수 있는 항목은 null 로 두어 '미지정'과 빈 문자열을 구분한다.
 * 조사 유형은 담지 않는다 — 조사마다 그때그때 이름을 붙이는 값이라 되풀이되는 분류로 쓸 수 없고, 조사명이 그 역할을 한다.
 */
export interface SurveyProjectDraft {
  name: string
  /** 조사 기간 (YYYY-MM-DD) — 언제 시작한 조사인지는 반드시 남기고, 종료일은 진행 중이면 비운다 */
  startedOn: string
  endedOn: string | null
  note: string | null
}
