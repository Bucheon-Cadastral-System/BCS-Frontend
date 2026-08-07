import { SURVEY_STATUS_LABEL, SURVEY_STATUS_TEXT_COLOR, type SurveyStatus } from '@/entities/survey-record'
import { StatusIcon } from '@/shared/ui/StatusIcon'
import type { StatusShape } from '@/shared/ui/statusRow'

/**
 * 목록 줄의 조사 상태 마크.
 *
 * <p>다섯 갈래가 모두 다르게 보여야 한다. 모양으로 넷을 가르고(체크·X·경고·주의), 남은 하나인 미조사는
 * 망실과 같은 X 를 쓰되 색으로 갈린다. 모양은 공용 StatusIcon 이 그리고 색은 조사 상태 규칙이 소유한다.
 */
const SHAPE: Record<SurveyStatus, StatusShape> = {
  done: 'check',
  lost: 'cross',
  unavailable: 'warn',
  etc: 'caution',
  todo: 'cross',
}

export function StatusMark({ status }: { status: SurveyStatus }) {
  return (
    <StatusIcon shape={SHAPE[status]} label={SURVEY_STATUS_LABEL[status]} color={SURVEY_STATUS_TEXT_COLOR[status]} />
  )
}
