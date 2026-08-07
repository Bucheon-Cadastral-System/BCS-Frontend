import { StatusIcon } from '@/shared/ui/StatusIcon'

/**
 * 조사여부 마크: 정상은 체크, 망실과 미조사는 X.
 * 모양은 공용 StatusIcon 이 그리고, 색만 조사 상태에서 온다(망실과 미조사는 같은 X 지만 색으로 가른다).
 */
export function StatusMark({ status }: { status: string }) {
  const color =
    status === '정상' ? 'text-teal-text' : status === '망실' ? 'text-danger' : 'text-ink-4'
  return <StatusIcon shape={status === '정상' ? 'check' : 'cross'} label={status} color={color} />
}
