import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserAvatar } from '@/entities/user'
import type { UserProfile } from '@/entities/user'
import { logout } from '@/shared/api/auth'
import { useDismiss } from '@/shared/lib/useDismiss'
import { useElementWidth } from '@/shared/lib/useElementWidth'
import { BrandMark } from '@/shared/ui/BrandMark'
import { PILL, POPOVER } from '@/shared/ui/classes'

/** 헤더 탭 한 칸 — 화면이 무엇을 세울지 정한다(지도의 판 전환, 관리자 화면의 자리 전환) */
export interface HeaderTab {
  key: string
  label: string
  icon: ReactNode
  active: boolean
  onClick: () => void
}

/**
 * 화면 위에 떠 있는 헤더.
 * 좌측은 브랜드와 지금 보고 있는 자리(지도 화면은 판 전환 탭, 그 밖의 화면은 화면 이름),
 * 우측은 검색 자리와 사용자 메뉴다. 화면이 바뀌어도 같은 자리에 같은 크기로 서야 해서 모든 화면이 이 하나를 쓴다.
 * 화면을 가로지르는 띠 대신 알약 두 개로 두어 지도를 덜 가린다.
 */
export function AppHeader(props: {
  /** 브랜드를 누르면 돌아갈 곳 — 지도 화면은 이미 그 화면이라 주지 않는다 */
  onHome?: () => void
  /** 브랜드 옆 탭 — 지도는 판 전환, 관리자 화면은 자리 전환에 쓴다 */
  tabs?: HeaderTab[]
  /** 우측 알약 왼쪽 자리 — 무엇을 검색할지는 화면이 정한다 */
  search?: ReactNode
  /** 지금 로그인한 사용자 — 아직 받아오지 못했으면 자리만 지킨다 */
  user: UserProfile | null
  /** 공개 기준점만 보는 비로그인 상태 */
  guest?: boolean
  /** 주지 않으면 사용자 메뉴에 그 항목을 두지 않는다(이미 그 화면인 경우) */
  onOpenUserManagement?: () => void
  /** 좌측 알약의 폭 — 그 아래 서는 칩·판이 같은 너비를 쓰도록 알린다 */
  onBrandWidthChange?: (px: number) => void
  /** 우측 묶음(검색+사용자)의 폭 — 그 아래 서는 대화 판이 같은 너비를 쓰도록 알린다 */
  onUtilityWidthChange?: (px: number) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)
  useDismiss({ enabled: menuOpen, onDismiss: () => setMenuOpen(false), ref: userRef })
  const navigate = useNavigate()

  const user = props.user
  const guest = props.guest === true
  const isAdmin = user?.role === 'ADMIN'

  // 서버 호출이 실패해도 이 브라우저의 인증은 이미 끊어진 상태이므로 로그인 화면으로 이동한다.
  async function handleLogout() {
    setMenuOpen(false)
    try {
      await logout()
    } catch {
      // 실패해도 아래에서 로그인 화면으로 이동한다.
    }
    navigate('/guest', { replace: true })
  }

  // 켜진 탭 밑을 따라 미끄러지는 면 — 탭마다 면을 따로 켜고 끄면 자리가 옮겨 간다는 것이 보이지 않는다
  const tabsRef = useRef<HTMLDivElement>(null)
  const activeKey = props.tabs?.find((tab) => tab.active)?.key ?? null
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(null)
  useLayoutEffect(() => {
    const el = activeKey === null ? null : tabsRef.current?.querySelector<HTMLElement>(`[data-tab="${activeKey}"]`)
    if (!el) return // 꺼진 동안에는 마지막 자리를 그대로 두고 흐리게만 한다
    const next = { left: el.offsetLeft, width: el.offsetWidth }
    // 같은 값으로 다시 넣으면 렌더가 끝없이 돈다(탭 배열은 렌더마다 새 참조)
    setMarker((current) => (current && current.left === next.left && current.width === next.width ? current : next))
  }, [activeKey, props.tabs])

  const brandRef = useRef<HTMLDivElement>(null)
  const utilityRef = useRef<HTMLDivElement>(null)
  const brandWidth = useElementWidth(brandRef)
  const utilityWidth = useElementWidth(utilityRef)
  const { onBrandWidthChange, onUtilityWidthChange } = props
  useEffect(() => {
    onBrandWidthChange?.(brandWidth)
  }, [brandWidth, onBrandWidthChange])
  useEffect(() => {
    onUtilityWidthChange?.(utilityWidth)
  }, [utilityWidth, onUtilityWidthChange])

  // 누를 수 있는 브랜드와 그냥 놓인 브랜드가 같은 자리에 오도록 안쪽 여백 없이 같은 배치를 쓴다
  const brand = (
    <>
      <BrandMark />
      <span className="leading-[1.15]">
        <span className="block text-[14px] font-bold tracking-[-.02em] text-ink">BCS</span>
        <span className="block text-[11px] text-ink-3 max-sm:hidden">부천시 지적기준점 관리 시스템</span>
      </span>
    </>
  )

  return (
    <>
      <div ref={brandRef} className={`absolute left-4 top-4 z-20 flex h-11 items-center gap-2 py-0 pl-3.5 pr-2 ${PILL}`}>
        {props.onHome ? (
          <button
            type="button"
            onClick={props.onHome}
            title="지도로 돌아가기"
            className="flex items-center gap-2 text-left transition-opacity hover:opacity-70"
          >
            {brand}
          </button>
        ) : (
          <span className="flex items-center gap-2">{brand}</span>
        )}

        {props.tabs && props.tabs.length > 0 && (
          <>
            <span className="mx-[3px] h-[22px] w-px bg-line-field" aria-hidden />
            <div ref={tabsRef} className="relative flex items-center gap-1">
              {marker && (
                <span
                  aria-hidden="true"
                  style={{ left: marker.left, width: marker.width }}
                  className={`absolute top-0 h-[34px] rounded-ctl bg-teal-wash-strong transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    activeKey === null ? 'opacity-0' : 'opacity-100'
                  }`}
                />
              )}
              {props.tabs.map(({ key, ...tab }) => (
                <Tab key={key} tabKey={key} {...tab} />
              ))}
            </div>
          </>
        )}
      </div>

      <div ref={utilityRef} className="absolute right-4 top-4 z-[45] flex items-center gap-2 max-sm:right-3">
        {props.search}
        <div ref={userRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            // 오른쪽 화살표는 제 상자 안에서 이미 3px 가까이 비워 두므로 왼쪽보다 적게 준다 — 값이 아니라 보이는 여백을 맞춘다
            className={`flex h-11 items-center gap-2 py-0 pl-[7px] pr-2 transition-colors hover:border-line-field ${PILL}`}
          >
            {user ? (
              <UserAvatar name={user.name} className="size-[30px] text-[11.5px]" />
            ) : (
              <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-soft text-[11.5px] font-semibold text-teal-text" aria-hidden="true">
                {guest ? 'G' : '·'}
              </span>
            )}
            {/* 브랜드 알약과 같은 규칙 — 윗줄은 크고 굵게, 아랫줄은 작고 흐리게.
                폭은 고정한다. 이름·소속 길이를 따라 알약이 늘고 줄면 그 폭을 쓰는 대화 판까지 흔들리고,
                프로필을 받아오는 순간에도 자리가 튄다. 94px 는 가장 긴 소속(부동산관리팀 주무관 90.9px)이 들어가는 값. */}
            <span className="w-[94px] shrink-0 text-left leading-[1.15]">
              <span className="block truncate text-[14px] font-bold tracking-[-.02em] text-ink">{user?.name ?? (guest ? '게스트' : '사용자')}</span>
              <span className="block truncate text-[11px] text-ink-3">
                {user ? `${user.team} ${user.position}` : guest ? '공개 정보만 보기' : '정보를 불러오는 중…'}
              </span>
            </span>
            <svg viewBox="0 0 24 24" className="size-[13px] shrink-0 text-ink-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {menuOpen && (
            <div className={`panel-in absolute right-0 top-[50px] z-40 w-56 overflow-hidden ${POPOVER}`}>
              <div className="flex items-center justify-between gap-2 px-[13px] pb-[9px] pt-2.5">
                <span className="text-[12px] text-ink-3">권한</span>
                <span className="text-[11px] font-semibold tracking-[.1em] text-teal-text">
                  {guest ? 'GUEST' : (user?.role ?? 'USER')}
                </span>
              </div>
              {isAdmin && props.onOpenUserManagement && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
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
                  onClick={() => navigate('/login')}
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
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/** 헤더 탭 — 켜진 탭이 곧 지금 보고 있는 자리다. 켜진 표시(면)는 위에서 미끄러지는 하나가 맡는다 */
function Tab({ tabKey, label, icon, active, onClick }: Omit<HeaderTab, 'key'> & { tabKey: string }) {
  return (
    <button
      type="button"
      data-tab={tabKey}
      onClick={onClick}
      aria-pressed={active}
      className={`relative z-10 flex h-[34px] items-center gap-[7px] rounded-ctl px-3 text-[12px] font-semibold transition-colors ${
        active ? 'text-teal-text' : 'text-ink-3 hover:bg-hover hover:text-ink-2'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

/** 탭·메뉴가 함께 쓰는 그림 — 같은 뜻은 같은 그림으로 */
function TabIcon({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'size-[18px]'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export function ProjectIcon({ className }: { className?: string }) {
  return (
    <TabIcon className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </TabIcon>
  )
}

export function PointIcon({ className }: { className?: string }) {
  return (
    <TabIcon className={className}>
      <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </TabIcon>
  )
}

/** 활동 로그 — 시각을 되짚는다는 뜻의 시계 */
export function ActivityIcon({ className }: { className?: string }) {
  return (
    <TabIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </TabIcon>
  )
}

/** 사용자 관리 아이콘 — 헤더 탭과 사용자 메뉴가 같은 그림을 쓴다 */
export function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

/** 로그아웃 아이콘. 문 밖으로 나가는 화살표 모양이다 */
function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
