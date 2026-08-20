import { Modal } from '@/shared/ui/Modal'
import { BTN_SM_SECONDARY } from '@/shared/ui/classes'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useMemberProfileQuery } from '../api/queries'
import { formatPhone } from '../model/phone'
import { ROLE_LABEL } from '../model/user'
import { ProfileRow, ProfileValue } from './ProfileFields'
import { UserAvatar } from './UserAvatar'

/** 정보 줄 — 프로필 패널이 세우는 항목에서 이 사람에게 물을 수 없는 것만 뺀 나머지다 */
const LABELS = ['소속 구청', '소속 과', '소속 팀', '직위', '전화번호', '이메일'] as const

/**
 * 다른 회원의 신원 — 작성자·조사원 이름을 눌렀을 때 선다.
 *
 * <p>말풍선이 아니라 창으로 띄운다. 이름이 서는 자리가 잘라 내는 패널 안이거나 아래에서 올라온 시트 안이라,
 * 붙여 세우면 그 상자에 잘린다.
 */
export function MemberProfileDialog(props: { memberId: string; onClose: () => void }) {
  const { data, isPending, isError } = useMemberProfileQuery(props.memberId)

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
      <div className="flex items-center gap-3">
        {isPending ? (
          <Skeleton className="size-[42px] rounded-full" />
        ) : (
          <UserAvatar name={data?.name ?? ''} className="size-[42px] text-[15px]" />
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
        {data?.role === 'ADMIN' && (
          <span className="shrink-0 rounded-chip bg-teal-wash-strong px-[7px] py-[3px] text-[10.5px] font-semibold text-teal-text">
            {ROLE_LABEL.ADMIN}
          </span>
        )}
      </div>

      {isError ? (
        <p className="py-6 text-center text-[12.5px] text-ink-3">회원 정보를 불러오지 못했습니다.</p>
      ) : (
        <dl>
          {isPending
            ? LABELS.map((label) => (
                <ProfileRow key={label} label={label}>
                  <Skeleton className="h-3 w-32" />
                </ProfileRow>
              ))
            : data && (
                <>
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
                  <ProfileRow label="전화번호">
                    <ProfileValue value={formatPhone(data.phone)} />
                  </ProfileRow>
                  <ProfileRow label="이메일">
                    <ProfileValue value={data.email} />
                  </ProfileRow>
                </>
              )}
        </dl>
      )}
    </Modal>
  )
}
