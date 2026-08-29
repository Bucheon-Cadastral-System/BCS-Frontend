import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '@/shared/api/auth'
import { IMAGE_PICKER_ACCEPT, prepareWebpImage } from '@/shared/lib/controlPointImage'
import { BTN_DANGER, BTN_PRIMARY, CHIP_BTN } from '@/shared/ui/classes'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { FormActions } from '@/shared/ui/FormActions'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useDeleteMyProfileImageMutation, useUpdateMyProfileMutation, useUploadMyProfileImageMutation } from '../api/queries'
import { formatPhone } from '../model/phone'
import { DISTRICTS, POSITIONS, ROLE_LABEL, TEAMS } from '../model/user'
import type { District, Position, Team, UserProfile } from '../model/user'
import { ProfileField, ProfileLockedField, ProfileRow, ProfileSelectField } from './ProfileFields'
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

/** 머리말 아랫줄에 세우는 신원 한 줄 — 이름 아래에 붙는 소개라 정보 줄과 달리 붙여 읽는다 */
function dutyOf(user: UserProfile): string {
  return [user.team, user.position].filter(Boolean).join(' ')
}

/** 정보 줄 — 읽는 상태와 고치는 상태가 같은 라벨을 같은 차례로 세운다 */
const INFO_LABELS = ['전화번호', '이메일', '소속 구청', '소속 과', '소속 팀', '직위'] as const

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
  onProfileUpdated?: () => void | Promise<unknown>
  /** 항목을 고른 뒤 부르는 쪽이 패널을 접도록 알린다 */
  onDone?: () => void
}) {
  const navigate = useNavigate()
  const user = props.user
  const guest = props.guest === true
  const sheet = props.variant === 'sheet'
  const [draft, setDraft] = useState<Draft | null>(null)
  // 저장은 다른 사람도 보는 값을 바꾸는 일이라 한 번 묻는다
  const [confirming, setConfirming] = useState(false)
  const [confirmingImageDelete, setConfirmingImageDelete] = useState(false)
  const [imageNotice, setImageNotice] = useState<{ message: string; error: boolean } | null>(null)
  const [preparingImage, setPreparingImage] = useState(false)
  const updateProfile = useUpdateMyProfileMutation()
  const uploadImage = useUploadMyProfileImageMutation()
  const deleteImage = useDeleteMyProfileImageMutation()
  const imageBusy = preparingImage || uploadImage.isPending || deleteImage.isPending

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
          setConfirming(false)
          setDraft(null)
          props.onProfileUpdated?.()
        },
        // 실패 안내는 버튼 곁에 선다 — 묻는 창을 덮어 둔 채로는 그 안내가 가려진다
        onError: () => setConfirming(false),
      },
    )
  }

  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    // 같은 파일을 실패 후 다시 고를 수 있게 선택값은 바로 비운다.
    event.currentTarget.value = ''
    if (file === undefined) return
    setImageNotice(null)
    setPreparingImage(true)
    try {
      // 기준점 사진과 같은 길로 최대 800px·품질 85% WebP를 만든 뒤 그 결과만 서버에 보낸다.
      const prepared = await prepareWebpImage(file)
      await uploadImage.mutateAsync(prepared)
      setImageNotice({ message: '프로필 이미지가 변경되었습니다.', error: false })
      await props.onProfileUpdated?.()
    } catch (error) {
      setImageNotice({
        message: error instanceof Error ? error.message : '사진을 처리하지 못했습니다. 다른 사진으로 다시 시도해 주세요.',
        error: true,
      })
    } finally {
      setPreparingImage(false)
    }
  }

  function removeImage() {
    deleteImage.mutate(undefined, {
      onSuccess: async () => {
        setConfirmingImageDelete(false)
        setImageNotice(null)
        await props.onProfileUpdated?.()
      },
      onError: (error) => {
        setConfirmingImageDelete(false)
        setImageNotice({ message: error.message, error: true })
      },
    })
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
          {INFO_LABELS.map((label) => (
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
        avatar={<UserAvatar name={user.name} profileImageUrl={user.profileImageUrl} className={AVATAR[sheet ? 'sheet' : 'popover']} />}
        name={user.name}
        duty={dutyOf(user)}
        admin={user.role === 'ADMIN'}
      >
        {/* 고치는 동안에는 나가는 길을 걷는다 */}
        {!editing && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <label
                className={`${CHIP_BTN} flex flex-1 items-center justify-center gap-1.5 text-[12.5px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-teal-edge ${
                  imageBusy ? 'pointer-events-none opacity-40' : 'cursor-pointer'
                } ${sheet ? 'h-11' : 'h-9'}`}
              >
                <input type="file" accept={IMAGE_PICKER_ACCEPT} className="sr-only" disabled={imageBusy} onChange={(event) => void chooseImage(event)} />
                <IconImage />
                {preparingImage || uploadImage.isPending ? '처리 중' : user.profileImageUrl === null ? '사진 등록' : '사진 변경'}
              </label>
              {user.profileImageUrl !== null && (
                <button
                  type="button"
                  disabled={imageBusy}
                  onClick={() => setConfirmingImageDelete(true)}
                  className={`${CHIP_BTN} flex flex-1 items-center justify-center gap-1.5 text-[12.5px] text-danger disabled:cursor-not-allowed disabled:opacity-40 ${sheet ? 'h-11' : 'h-9'}`}
                >
                  <IconTrash />
                  사진 삭제
                </button>
              )}
            </div>
            <div className="flex gap-2">
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
            {imageNotice !== null && (
              <p className={`text-[11px] ${imageNotice.error ? 'text-danger' : 'text-ink-3'}`} role="status">{imageNotice.message}</p>
            )}
          </div>
        )}
      </PanelHead>

      {/* 두 상태가 같은 줄을 같은 차례로 세운다 — 고치기로 들어갈 때 줄이 늘거나 자리를 바꾸지 않는다.
          이름은 머리말이 이미 세우므로 줄로 두지 않는다 */}
      <dl className="px-4 py-1">
        <ProfileField
          label="전화번호"
          editing={editing}
          value={draft === null ? formatPhone(user.phone) : draft.phone}
          onChange={(v) => setDraft((cur) => (cur === null ? cur : { ...cur, phone: v.replace(/\D/g, '').slice(0, 11) }))}
        />
        <ProfileLockedField label="이메일" editing={editing} value={user.email} />
        <ProfileSelectField
          label="소속 구청"
          editing={editing}
          value={draft?.district ?? user.district}
          options={DISTRICTS}
          onChange={(v) => setDraft((cur) => (cur === null ? cur : { ...cur, district: v }))}
        />
        {/* 소속 과는 고칠 수 없다 — 지금 이 시스템은 민원지적과 하나만 받는다 */}
        <ProfileLockedField label="소속 과" editing={editing} value={user.department} />
        <ProfileSelectField
          label="소속 팀"
          editing={editing}
          value={draft?.team ?? user.team}
          options={TEAMS}
          onChange={(v) => setDraft((cur) => (cur === null ? cur : { ...cur, team: v }))}
        />
        <ProfileSelectField
          label="직위"
          editing={editing}
          value={draft?.position ?? user.position}
          options={POSITIONS}
          onChange={(v) => setDraft((cur) => (cur === null ? cur : { ...cur, position: v }))}
        />
      </dl>

      {editing ? (
        <div className="px-4 pb-3.5 pt-2">
          <FormActions
            fill
            submitLabel="저장"
            busy={updateProfile.isPending}
            onSubmit={() => setConfirming(true)}
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

      {confirming && (
        <ConfirmDialog
          message="변경 내용을 저장할까요?"
          confirmLabel="저장"
          cancelLabel="취소"
          busy={updateProfile.isPending}
          busyLabel="저장 중"
          onConfirm={save}
          onCancel={() => setConfirming(false)}
        />
      )}

      {confirmingImageDelete && (
        <ConfirmDialog
          message="프로필 이미지를 삭제할까요?"
          confirmLabel="삭제"
          cancelLabel="취소"
          busy={deleteImage.isPending}
          busyLabel="삭제 중"
          danger
          onConfirm={removeImage}
          onCancel={() => setConfirmingImageDelete(false)}
        />
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

function IconImage() {
  return (
    <svg viewBox="0 0 24 24" className="size-[14px] shrink-0 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m21 15-5-5L5 20" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" className="size-[14px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v5M14 11v5" />
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
