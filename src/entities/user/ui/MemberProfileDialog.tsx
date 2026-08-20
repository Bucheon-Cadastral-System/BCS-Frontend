import { Modal } from '@/shared/ui/Modal'
import { BTN_SM_SECONDARY } from '@/shared/ui/classes'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useMemberIdentityQuery } from '../api/queries'
import { ProfileRow, ProfileValue } from './ProfileFields'
import { UserAvatar } from './UserAvatar'

/**
 * 정보 줄 — 이 사람이 누구인지까지다.
 *
 * <p>연락처와 권한은 세우지 않는다. 서버가 이 경로로 그 값을 내려 주지 않는다.
 */
const LABELS = ['소속 구청', '소속 과', '소속 팀', '직위'] as const

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
                </>
              )}
        </dl>
      )}
    </Modal>
  )
}
