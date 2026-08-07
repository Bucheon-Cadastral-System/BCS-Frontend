import type { SurveyResult } from './types'

/**
 * 프로젝트별 기준점 조사 상태. 규칙을 한 곳에 둔다.
 * 조사한 점은 기록의 result(정상·망실·조사불가·기타) 중 하나로 갈리고, 기록이 없으면 미조사다.
 * 다섯 갈래는 서로 겹치지 않고 더하면 대상 전체가 된다.
 * (지도 마커·클러스터 집계·목록·상세가 각자 이 판정을 다시 쓰면 한쪽만 바뀌었을 때 화면끼리 어긋난다.)
 */
export type SurveyStatus = 'todo' | 'done' | 'lost' | 'unavailable' | 'etc'

export const SURVEY_STATUS_LABEL: Record<SurveyStatus, string> = {
  todo: '미조사',
  done: '정상',
  lost: '망실',
  unavailable: '조사불가',
  etc: '기타',
}

/** 상태별 칩 색. 화면 여러 곳이 같은 판정을 쓰므로 색도 여기서 소유한다. */
export const SURVEY_STATUS_TONE: Record<SurveyStatus, string> = {
  done: 'border-teal-btn-edge bg-teal-wash-strong text-teal-text',
  lost: 'border-danger-btn-edge bg-danger-wash text-danger',
  unavailable: 'border-amber/40 bg-amber-wash text-amber',
  etc: 'border-line-btn bg-hover text-ink',
  todo: 'border-line-btn bg-soft text-ink-3',
}

const STATUS_BY_RESULT: Record<SurveyResult, SurveyStatus> = {
  INTACT: 'done',
  LOST: 'lost',
  UNAVAILABLE: 'unavailable',
  ETC: 'etc',
}

/** 망실도 조사불가도 기타도 '조사됨'으로 센다(모두 조사 결과의 한 종류라서). 기록이 없으면(result가 undefined) 미조사다. */
export function deriveSurveyStatus(result: SurveyResult | undefined): SurveyStatus {
  return result === undefined ? 'todo' : STATUS_BY_RESULT[result]
}
