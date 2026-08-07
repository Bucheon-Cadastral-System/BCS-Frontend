import { SURVEY_STATUS_LABEL, type SurveyStatus } from '@/entities/survey-record'
import { StatusIcon } from '@/shared/ui/StatusIcon'
import type { StatusShape } from '@/shared/ui/statusRow'

/**
 * 목록 줄의 조사 상태 마크.
 *
 * <p>다섯 갈래가 모두 다르게 보여야 한다. 정상은 체크, 망실은 X, 조사불가는 경고, 기타와 미조사는
 * 같은 모양이지만 색으로 갈린다. 모양은 공용 StatusIcon 이 그리고 색만 여기서 정한다.
 */
const SHAPE: Record<SurveyStatus, StatusShape> = {
  done: 'check',
  lost: 'cross',
  unavailable: 'warn',
  etc: 'caution',
  todo: 'cross',
}

const COLOR: Record<SurveyStatus, string> = {
  done: 'text-teal-text',
  lost: 'text-danger',
  unavailable: 'text-amber',
  etc: 'text-ink-2',
  todo: 'text-ink-4',
}

export function StatusMark({ status }: { status: SurveyStatus }) {
  return <StatusIcon shape={SHAPE[status]} label={SURVEY_STATUS_LABEL[status]} color={COLOR[status]} />
}
