import type { QueryClient } from '@tanstack/react-query'

/**
 * 조회 캐시 키 — 여러 엔티티가 함께 보는 것만 여기 둔다.
 *
 * <p>한 번의 쓰기가 여러 엔티티의 캐시를 낡게 만든다. 사진 한 장이 조사기록과 최종조사를 함께 바꾸고,
 * 조사 삭제가 프로젝트 목록과 최종조사를 함께 바꾼다. 키를 각 엔티티가 쥐고 있으면 그 무효화를 쓰려고
 * 엔티티끼리 서로를 수입하게 되고, 실제로 세 엔티티가 고리를 이뤄 어느 하나도 홀로 서지 못했다.
 *
 * <p>문자열을 자리마다 다시 적는 것도 답이 아니다 — 키가 바뀌면 무효화가 조용히 어긋난다.
 * 그래서 키는 아래 계층인 여기에 두고, 엔티티는 자기 공개 API 로 다시 내보내기만 한다.
 */
export const CONTROL_POINTS_KEY = ['control-points'] as const

/**
 * 최종조사 캐시의 공통 접두 — 단건 요약과 점 전체 표가 이 아래에 함께 선다.
 * 어느 점이 바뀌었는지 셀 수 없는 자리(조사 삭제·대상 재지정·파일 임포트)는 이 접두로 통째로 비운다.
 */
export const LAST_SURVEY_KEY = ['control-point', 'last-survey'] as const

/** 점 하나의 최종조사 요약 키. 점 id 는 숫자 문자열이라 아래 전체 표 키와 마지막 자리가 겹치지 않는다 */
export function lastSurveyKey(pointId: string) {
  return [...LAST_SURVEY_KEY, pointId] as const
}

/** 점 전체의 최종조사 표 키 */
export const LAST_SURVEYS_KEY = [...LAST_SURVEY_KEY, 'all'] as const

export const SURVEY_PROJECTS_KEY = ['survey-projects'] as const
export const SURVEY_TARGETS_KEY = ['survey-targets'] as const

/** 조사기록 캐시 키의 공통 접두 — 프로젝트 무관 일괄 무효화(프로젝트 삭제 등)가 이 값으로 맞춘다 */
export const SURVEY_RECORDS_KEY = ['survey-records'] as const

export function surveyRecordsKey(projectId: string) {
  return [...SURVEY_RECORDS_KEY, projectId] as const
}

/**
 * 그 점의 조사 기록이 바뀌었을 때 비울 최종조사 캐시 — 단건 요약과 점 전체 표가 함께 옛 값이 된다.
 *
 * <p>점 전체 표는 상태 표시를 켠 동안에만 살아 있으므로, 꺼 둔 사이의 무효화는 표시를 켜는 자리에서 갚는다.
 */
export function invalidateLastSurveys(queryClient: QueryClient, pointId: string) {
  void queryClient.invalidateQueries({ queryKey: lastSurveyKey(pointId) })
  void queryClient.invalidateQueries({ queryKey: LAST_SURVEYS_KEY })
}
