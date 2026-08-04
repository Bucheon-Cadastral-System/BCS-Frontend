import { Spinner } from '@/shared/ui/Spinner'
import { StatusIcon } from '@/shared/ui/StatusIcon'
import { SEND_LABEL } from '../model/send'
import type { SendStatus } from '../model/send'

/** 확인·등록 목록의 건별 상태 표시 — 도형은 목록 공용 표시를 쓰고, 대기·진행만 직접 그린다 */
export function SendMark({ status, discarded = false }: { status: SendStatus; discarded?: boolean }) {
  if (discarded) return <StatusIcon shape="cross" label="폐기" />
  if (status === 'done') return <StatusIcon shape="check" label="완료" />
  if (status === 'failed') return <StatusIcon shape="warn" label="실패" />
  if (status === 'sending') return <Spinner label={SEND_LABEL.sending} />
  return <span className="size-4 shrink-0 rounded-full border-2 border-idle" aria-hidden />
}
