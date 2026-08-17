import { useNavigate } from 'react-router-dom'
import { logout } from '@/shared/api/auth'
import type { UserProfile } from '../model/user'

/**
 * 사용자 메뉴의 내용 — 권한 줄과 사용자 관리·로그아웃.
 *
 * <p>껍데기(말풍선·시트)는 부르는 쪽이 씌운다. 화면 위쪽 헤더에서도, 좁은 화면의 아래쪽 내비에서도
 * 같은 항목이 서야 하므로 자리와 무관한 내용만 여기 둔다.
 */
export function UserMenu(props: {
  user: UserProfile | null
  /** 공개 기준점만 보는 비로그인 상태 */
  guest?: boolean
  /** 사용자 관리로 들어가는 길 — 관리자에게만 보인다 */
  onOpenUserManagement?: () => void
  /** 항목을 고른 뒤 부르는 쪽이 메뉴를 접도록 알린다 */
  onDone?: () => void
}) {
  const navigate = useNavigate()
  const guest = props.guest === true
  const isAdmin = props.user?.role === 'ADMIN'

  // 서버 호출이 실패해도 이 브라우저의 인증은 이미 끊어진 상태이므로 로그인 화면으로 이동한다.
  async function handleLogout() {
    props.onDone?.()
    try {
      await logout()
    } catch {
      // 실패해도 아래에서 로그인 화면으로 이동한다.
    }
    navigate('/guest', { replace: true })
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-[13px] pb-[9px] pt-2.5">
        <span className="text-[12px] text-ink-3">권한</span>
        <span className="text-[11px] font-semibold tracking-[.1em] text-teal-text">{guest ? 'GUEST' : (props.user?.role ?? 'USER')}</span>
      </div>
      {isAdmin && props.onOpenUserManagement && (
        <button
          type="button"
          onClick={() => {
            props.onDone?.()
            props.onOpenUserManagement?.()
          }}
          className="flex w-full items-center gap-[9px] border-t border-line-soft px-[13px] py-2.5 text-left text-[12.5px] text-ink-2 transition-colors hover:bg-hover"
        >
          <UsersIcon className="size-[15px] shrink-0 text-ink-3" />
          사용자 관리
          <svg viewBox="0 0 24 24" className="ml-auto size-3.5 shrink-0 text-ink-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      )}
      {guest ? (
        <button
          type="button"
          onClick={() => {
            props.onDone?.()
            navigate('/login')
          }}
          className="flex w-full items-center justify-center gap-[7px] border-t border-line-soft px-[13px] py-2.5 text-[12.5px] font-semibold text-teal-text transition-colors hover:bg-teal-wash"
        >
          로그인하기
        </button>
      ) : (
        <button
          type="button"
          onClick={handleLogout}
          // 다른 화면으로 들어가는 항목이 아니라 실행되는 동작이라 진입 화살표를 두지 않고 가운데에 세운다
          className="flex w-full items-center justify-center gap-[7px] border-t border-line-soft px-[13px] py-2.5 text-[12.5px] text-danger transition-colors hover:bg-danger-wash"
        >
          <LogoutIcon className="size-[15px] shrink-0" />
          로그아웃
        </button>
      )}
    </>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  )
}
