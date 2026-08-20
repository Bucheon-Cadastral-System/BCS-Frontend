/** 조사 프로젝트 (예: "2026.7.1.자 조사") */
export interface SurveyProject {
  id: string
  name: string
  /** 조사 기간 (YYYY-MM-DD). 종료일이 비어 있으면 진행 중인 조사다. */
  startedOn: string
  endedOn: string | null
  note: string | null
  /** 대상·조사 수 — 목록 응답(요약)에만 실려 온다. 완료 여부는 이 둘로 판정한다 */
  targetCount?: number
  surveyedCount?: number
  /** 작성자 회원 id — 이름을 눌러 신원을 물을 때 쓴다. 목록(요약) 응답에만 실려 온다 */
  authorId?: string | null
  /** 작성자 표시명 — 인증이 붙기 전에는 기록이 없어 null 이다 */
  authorName?: string | null
}

/** 조사 완료 여부 — 대상이 있고 전부 조사됐을 때. 요약(counts)이 없는 응답이면 미완으로 본다 */
export function isProjectComplete(project: SurveyProject): boolean {
  return (project.targetCount ?? 0) > 0 && (project.surveyedCount ?? 0) >= (project.targetCount ?? 0)
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
