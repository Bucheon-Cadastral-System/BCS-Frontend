import type { SurveyResult } from './types'

/**
 * 프로젝트별 기준점 조사 상태. 규칙을 한 곳에 둔다.
 * 조사한 점은 기록의 result(정상·망실·조사불가·기타) 중 하나로 갈리고, 기록이 없으면 미조사다.
 * 다섯 갈래는 서로 겹치지 않고 더하면 대상 전체가 된다.
 * (지도 마커·클러스터 집계·목록·상세가 각자 이 판정을 다시 쓰면 한쪽만 바뀌었을 때 화면끼리 어긋난다.)
 */
export type SurveyStatus = 'todo' | 'done' | 'lost' | 'unavailable' | 'etc'

/**
 * 내역을 세우는 차례 — 조사한 갈래를 앞에 두고 미조사를 끝에 둔다.
 * 좌측 패널·챗봇 카드·차트가 같은 순서로 서야 같은 사실을 견줄 때 눈이 자리를 다시 찾지 않는다.
 */
export const SURVEY_STATUS_ORDER: SurveyStatus[] = ['done', 'lost', 'unavailable', 'etc', 'todo']

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

/**
 * 상태별 색 한 벌.
 *
 * <p>화면은 클래스로 칠하고, 캔버스에 그리는 자리(챗봇 차트)는 클래스를 받을 수 없어 토큰 이름으로 값을 읽는다.
 * 세 표현이 같은 색을 가리켜야 목록 마크와 차트가 같은 뜻으로 읽힌다. 한 줄에 나란히 두어 한쪽만 바뀌면 눈에 띈다.
 *
 * <p>내역 앞 점(dot)은 글자색과 값이 다르다. 글자는 배경 위에서 읽혀야 해 한 단계 연하고,
 * 점은 면을 통째로 칠하는 자리라 원색을 쓴다. 미조사는 아직 아무 일도 일어나지 않은 갈래라 속을 비운다.
 *
 * <p>클래스 이름은 글자 그대로 적는다. 조각을 이어 붙여 만들면 테일윈드가 그 클래스를 훑지 못해 색이 빠진다.
 */
const STATUS_COLOR: Record<SurveyStatus, { className: string; token: string; dot: string; fill: string }> = {
  done: { className: 'text-teal-text', token: '--color-teal-text', dot: 'bg-teal', fill: 'bg-teal-wash-strong' },
  lost: { className: 'text-danger', token: '--color-danger', dot: 'bg-danger', fill: 'bg-danger-wash' },
  unavailable: { className: 'text-amber', token: '--color-amber', dot: 'bg-amber', fill: 'bg-amber-wash' },
  etc: { className: 'text-ink-3', token: '--color-ink-3', dot: 'bg-ink-3', fill: 'bg-hover' },
  todo: { className: 'text-ink-4', token: '--color-ink-4', dot: 'border-[1.5px] border-idle', fill: 'bg-soft' },
}

/** 글자·아이콘 색 클래스 */
export const SURVEY_STATUS_TEXT_COLOR: Record<SurveyStatus, string> = pick('className')

/** 캔버스가 값으로 읽는 테마 토큰 이름 */
export const SURVEY_STATUS_COLOR_VAR: Record<SurveyStatus, string> = pick('token')

/** 내역 줄 앞에 서는 점 색 클래스 */
export const SURVEY_STATUS_DOT: Record<SurveyStatus, string> = pick('dot')

/**
 * 고른 칸을 채우는 옅은 면 — 테두리는 칸을 묶는 틀이 가지므로 여기서는 면만 정한다.
 * 글자·밑줄은 위 색을 쓰고 이 면이 그 뒤를 받친다.
 */
export const SURVEY_STATUS_FILL: Record<SurveyStatus, string> = pick('fill')

function pick(key: 'className' | 'token' | 'dot' | 'fill'): Record<SurveyStatus, string> {
  return Object.fromEntries(
    Object.entries(STATUS_COLOR).map(([status, color]) => [status, color[key]]),
  ) as Record<SurveyStatus, string>
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

const STATUS_BY_LABEL = new Map<string, SurveyStatus>(
  Object.entries(SURVEY_STATUS_LABEL).map(([status, label]) => [label, status as SurveyStatus]),
)

/**
 * 사람이 읽는 판정 문구를 갈래로 되돌린다 — 단건 최종조사 조회만 갈래가 아니라 문구를 내려주기 때문이다.
 *
 * <p>그 문구에는 파일이 적어 온 표기가 그대로 실려 올 수 있어 넷 중 어디에도 안 맞을 수 있다.
 * 그때 null 을 주는 것이 이 함수의 요점이다. 모르는 문구를 아무 갈래로 밀어 넣으면 목록과 견줄 때 헛짚는다.
 */
export function surveyStatusFromLabel(label: string | null): SurveyStatus | null {
  if (label === null) return null
  return STATUS_BY_LABEL.get(label) ?? null
}
