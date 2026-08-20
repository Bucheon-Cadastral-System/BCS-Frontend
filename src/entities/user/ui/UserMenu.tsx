import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '@/shared/api/auth'
import { BTN_DANGER, BTN_PRIMARY, CHIP_BTN } from '@/shared/ui/classes'
import { FormActions } from '@/shared/ui/FormActions'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useUpdateMyProfileMutation } from '../api/queries'
import { formatPhone } from '../model/phone'
import { DISTRICTS, POSITIONS, ROLE_LABEL, TEAMS } from '../model/user'
import type { District, Position, Team, UserProfile } from '../model/user'
import { ProfileField, ProfileRow, ProfileSelectField, ProfileValue } from './ProfileFields'
import { UserAvatar } from './UserAvatar'

/** 고칠 수 있는 값만 뽑아 둔 초안 — 이름·이메일은 이 길로 고칠 수 없어 담지 않는다 */
interface Draft {
  phone: string
  district: string
  team: string
  position: string
}

const draftOf = (user: UserProfile): Draft => ({
  phone: user.phone,
  district: user.district,
  team: user.team,
  position: user.position,
})

/** 소속 한 줄 — 구청과 과는 늘 함께 읽히므로 한 값으로 세운다 */
function affiliationOf(user: UserProfile): string {
  return [user.district, user.department].filter(Boolean).join(' · ')
}

/** 팀·직위 한 줄 — 머리말의 아랫줄과 정보 줄이 같은 문구를 쓴다 */
function dutyOf(user: UserProfile): string {
  return [user.team, user.position].filter(Boolean).join(' ')
}

/**
 * 프로필 패널의 내용 — 신원 머리말, 정보 줄, 들어가는 길, 로그아웃.
 *
 * <p>껍데기(말풍선·시트)는 부르는 쪽이 씌운다. 넓은 화면은 알약 아래 말풍선으로, 좁은 화면은 아래에서
 * 올라오는 시트로 같은 내용을 세우므로 자리와 무관한 것만 여기 둔다. 치수 차이는 `max-lg:` 로 얹는다.
 *
 * <p>정보 수정은 이 패널의 두 번째 상태다. 읽는 줄이 그 자리에서 입력칸이 되고, 그동안 들어가는 길과
 * 로그아웃은 걷는다 — 저장하기 전에 패널을 떠나게 두지 않는다.
 */
export function UserMenu(props: {
  /** 어느 껍데기에 담기는지 — 말풍선과 시트는 치수와 로그아웃이 서는 자리가 다르다 */
  variant?: 'popover' | 'sheet'
  user: UserProfile | null
  /** 공개 기준점만 보는 비로그인 상태 */
  guest?: boolean
  /** 사용자 관리로 들어가는 길 — 관리자에게만 보인다 */
  onOpenUserManagement?: () => void
  /** 내 정보를 고친 뒤 — 헤더가 쥔 프로필을 다시 받도록 알린다 */
  onProfileUpdated?: () => void
  /** 항목을 고른 뒤 부르는 쪽이 패널을 접도록 알린다 */
  onDone?: () => void
}) {
  const navigate = useNavigate()
  const user = props.user
  const guest = props.guest === true
  const sheet = props.variant === 'sheet'
  const [draft, setDraft] = useState<Draft | null>(null)
  const updateProfile = useUpdateMyProfileMutation()

  // 화면을 옮기는 일은 하지 않는다 — 토큰이 풀리는 순간 울타리가 사유대로 옮기므로,
  // 여기서 또 옮기면 그 사유가 주소에서 지워진다. 서버 호출이 실패해도 이 브라우저의 인증은 이미 끊긴 상태다.
  async function handleLogout() {
    props.onDone?.()
    try {
      await logout()
    } catch {
      // 인증은 이미 끊겼으므로 알릴 것이 없다
    }
  }

  function save() {
    if (draft === null) return
    updateProfile.mutate(
      {
        phone: draft.phone,
        district: draft.district as District,
        team: draft.team as Team,
        position: draft.position as Position,
      },
      {
        onSuccess: () => {
          setDraft(null)
          props.onProfileUpdated?.()
        },
      },
    )
  }

  if (guest) {
    return (
      <>
        <PanelHead sheet={sheet} avatar={<UserAvatar name="" guest className={AVATAR[sheet ? 'sheet' : 'popover']} />} name="게스트" />
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              props.onDone?.()
              navigate('/login')
            }}
            className={`${BTN_PRIMARY} w-full`}
          >
            로그인
          </button>
        </div>
      </>
    )
  }

  if (user === null) {
    // 줄 수와 높이를 그대로 지킨다 — 값이 도착할 때 자리가 튀지 않는다
    return (
      <>
        <PanelHead sheet={sheet} avatar={<Skeleton className={`${AVATAR[sheet ? 'sheet' : 'popover']} rounded-full`} />} name={null} />
        <dl className="px-4 py-1">
          {['소속', '팀 · 직위', '전화번호', '이메일'].map((label) => (
            <ProfileRow key={label} label={label}>
              <Skeleton className="h-3 w-32" />
            </ProfileRow>
          ))}
        </dl>
      </>
    )
  }

  const editing = draft !== null
  const showUserManagement = user.role === 'ADMIN' && props.onOpenUserManagement !== undefined

  return (
    <>
      <PanelHead
        sheet={sheet}
        avatar={<UserAvatar name={user.name} className={AVATAR[sheet ? 'sheet' : 'popover']} />}
        name={user.name}
        duty={dutyOf(user)}
        admin={user.role === 'ADMIN'}
      >
        {/* 고치는 동안에는 나가는 길을 걷는다 */}
        {!editing && (
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setDraft(draftOf(user))} className={`${CHIP_BTN} flex flex-1 items-center justify-center gap-1.5 text-[12.5px] ${sheet ? 'h-11' : 'h-9'}`}>
              <IconPencil />
              정보 수정
            </button>
            {showUserManagement && (
              <button
                type="button"
                onClick={() => {
                  props.onDone?.()
                  props.onOpenUserManagement?.()
                }}
                className={`${CHIP_BTN} flex flex-1 items-center justify-center gap-1.5 text-[12.5px] ${sheet ? 'h-11' : 'h-9'}`}
              >
                <IconUsers />
                사용자 관리
              </button>
            )}
          </div>
        )}
      </PanelHead>

      <dl className="px-4 py-1">
        {editing ? (
          <>
            <ProfileRow label="이름">
              <ProfileValue value={user.name} />
            </ProfileRow>
            <ProfileField
              label="전화번호"
              editing
              value={draft.phone}
              onChange={(v) => setDraft({ ...draft, phone: v.replace(/\D/g, '').slice(0, 11) })}
            />
            <ProfileRow label="이메일">
              <ProfileValue value={user.email} />
            </ProfileRow>
            <ProfileSelectField label="소속 구청" editing value={draft.district} options={DISTRICTS} onChange={(v) => setDraft({ ...draft, district: v })} />
            {/* 소속 과는 고칠 수 없다 — 지금 이 시스템은 민원지적과 하나만 받는다 */}
            <ProfileRow label="소속 과">
              <ProfileValue value={user.department} />
            </ProfileRow>
            <ProfileSelectField label="소속 팀" editing value={draft.team} options={TEAMS} onChange={(v) => setDraft({ ...draft, team: v })} />
            <ProfileSelectField label="직위" editing value={draft.position} options={POSITIONS} onChange={(v) => setDraft({ ...draft, position: v })} />
          </>
        ) : (
          <>
            <ProfileRow label="소속">
              <ProfileValue value={affiliationOf(user)} />
            </ProfileRow>
            <ProfileRow label="팀 · 직위">
              <ProfileValue value={dutyOf(user)} />
            </ProfileRow>
            <ProfileRow label="전화번호">
              <ProfileValue value={formatPhone(user.phone)} />
            </ProfileRow>
            <ProfileRow label="이메일">
              <ProfileValue value={user.email} />
            </ProfileRow>
          </>
        )}
      </dl>

      {editing ? (
        <div className="px-4 pb-3.5 pt-2">
          <FormActions
            fill
            submitLabel="저장"
            busy={updateProfile.isPending}
            onSubmit={save}
            onCancel={() => setDraft(null)}
            notice={updateProfile.isError ? <span className="text-[11.5px] text-danger">저장하지 못했습니다. 잠시 후 다시 시도해 주세요.</span> : undefined}
          />
        </div>
      ) : sheet ? (
        // 시트는 발치가 손에 닿는 자리라 버튼으로 세운다
        <div className="p-3 pb-6">
          <button type="button" onClick={handleLogout} className={`${BTN_DANGER} w-full`}>
            <IconLogout />
            로그아웃
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleLogout}
          // 다른 화면으로 들어가는 항목이 아니라 실행되는 동작이라 진입 화살표를 두지 않고 가운데에 세운다
          className="flex w-full items-center justify-center gap-[7px] border-t border-line-soft bg-soft px-4 py-2.5 text-[12.5px] text-danger transition-colors hover:bg-danger-wash"
        >
          <IconLogout />
          로그아웃
        </button>
      )}
    </>
  )
}

/** 아바타 크기 — 넓은 화면 42, 좁은 화면 48 */
const AVATAR = { popover: 'size-[42px] text-[15px]', sheet: 'size-[48px] text-[17px]' } as const

/**
 * 패널 머리말 — 아바타·이름·팀 직위, 그리고 관리자만 다는 표시.
 *
 * <p>아래 경계는 앱 공통 규칙인 청록 두 겹 선이다.
 */
function PanelHead(props: {
  sheet: boolean
  avatar: React.ReactNode
  name: string | null
  duty?: string
  admin?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="border-b-2 border-b-teal px-4 pb-3 pt-3.5">
      <div className="flex items-center gap-3">
        {props.avatar}
        <span className="min-w-0 flex-1">
          {props.name === null ? (
            <>
              <Skeleton className="h-[15px] w-20" />
              <Skeleton className="mt-1.5 h-3 w-28" />
            </>
          ) : (
            <>
              <span className={`block truncate font-semibold text-ink ${props.sheet ? 'text-[17px]' : 'text-[15px]'}`}>{props.name}</span>
              {props.duty !== undefined && props.duty !== '' && (
                <span className={`block truncate text-ink-3 ${props.sheet ? 'text-[12.5px]' : 'text-[11.5px]'}`}>{props.duty}</span>
              )}
            </>
          )}
        </span>
        {props.admin === true && (
          <span className="shrink-0 rounded-chip bg-teal-wash-strong px-[7px] py-[3px] text-[10.5px] font-semibold text-teal-text">{ROLE_LABEL.ADMIN}</span>
        )}
      </div>
      {props.children}
    </div>
  )
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" className="size-[14px] shrink-0 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" className="size-[14px] shrink-0 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" className="size-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  )
}
