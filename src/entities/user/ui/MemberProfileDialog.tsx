import { Modal } from '@/shared/ui/Modal'
import { BTN_SM_SECONDARY } from '@/shared/ui/classes'
import { Skeleton } from '@/shared/ui/Skeleton'
import { formatPhone } from '../model/phone'
import { useMemberIdentityQuery } from '../api/queries'
import { ProfileRow, ProfileValue } from './ProfileFields'
import { UserAvatar } from './UserAvatar'

/**
 * 정보 줄 — 차례는 내 프로필 패널과 같다. 같은 값을 두 자리에서 다른 차례로 세우면 눈이 매번 다시 찾는다.
 *
 * <p>권한은 세우지 않는다. 서버가 이 경로로 그 값을 내려 주지 않는다.
 */
const LABELS = ['전화번호', '이메일', '소속 구청', '소속 과', '소속 팀', '직위'] as const

/**
 * 다른 회원의 신원 — 작성자·조사원 이름을 눌렀을 때 선다.
 *
 * <p>말풍선이 아니라 창으로 띄운다. 이름이 서는 자리가 잘라 내는 패널 안이거나 아래에서 올라온 시트 안이라,
 * 붙여 세우면 그 상자에 잘린다.
 */
export function MemberProfileDialog(props: { memberId: string; onClose: () => void }) {
  const { data, isPending, isError } = useMemberIdentityQuery(props.memberId)

  return (
    <Modal
      title="회원 정보"
      onClose={props.onClose}
      footer={
        <button type="button" onClick={props.onClose} className={BTN_SM_SECONDARY}>
          닫기
        </button>
      }
    >
      {/* 창 본문의 위아래 여백(14·16)에 줄 안쪽 여백이 겹치지 않게 맞춘다 —
          신원과 목록 사이도 첫 줄 위 여백까지 더해 같은 14가 되게 둔다 */}
      <div>
      <div className="flex items-center gap-3 border-b border-line-row pb-3">
        {isPending ? (
          <Skeleton className="size-[42px] rounded-full" />
        ) : (
          <UserAvatar name={data?.name ?? ''} profileImageUrl={data?.profileImageUrl ?? null} className="size-[42px] text-[15px]" />
        )}
        <span className="min-w-0 flex-1">
          {isPending ? (
            <>
              <Skeleton className="h-[15px] w-20" />
              <Skeleton className="mt-1.5 h-3 w-28" />
            </>
          ) : (
            <>
              <span className="block truncate text-[15px] font-semibold text-ink">{data?.name}</span>
              <span className="block truncate text-[11.5px] text-ink-3">{[data?.team, data?.position].filter(Boolean).join(' ')}</span>
            </>
          )}
        </span>
      </div>

      {isError ? (
        <p className="py-6 text-center text-[12.5px] text-ink-3">회원 정보를 불러오지 못했습니다.</p>
      ) : (
        <dl className="-mb-2 pt-1.5">
          {isPending
            ? LABELS.map((label) => (
                <ProfileRow key={label} label={label}>
                  <Skeleton className="h-3 w-32" />
                </ProfileRow>
              ))
            : data && (
                <>
                  <ProfileRow label="전화번호">
                    <ContactLink href={`tel:${data.phone}`} text={formatPhone(data.phone)} />
                  </ProfileRow>
                  <ProfileRow label="이메일">
                    <ContactLink href={`mailto:${data.email}`} text={data.email} />
                  </ProfileRow>
                  <ProfileRow label="소속 구청">
                    <ProfileValue value={data.district} />
                  </ProfileRow>
                  <ProfileRow label="소속 과">
                    <ProfileValue value={data.department} />
                  </ProfileRow>
                  <ProfileRow label="소속 팀">
                    <ProfileValue value={data.team} />
                  </ProfileRow>
                  <ProfileRow label="직위">
                    <ProfileValue value={data.position} />
                  </ProfileRow>
                </>
              )}
        </dl>
      )}
      </div>
    </Modal>
  )
}

/** 눌러서 바로 연락하는 자리 — 값이 없으면 누를 것도 없어 글자로만 세운다 */
function ContactLink(props: { href: string; text: string }) {
  if (props.text === '') {
    return <ProfileValue value="" />
  }
  return (
    <a href={props.href} className="block truncate text-[13px] text-teal-text underline-offset-2 hover:underline">
      {props.text}
    </a>
  )
}
