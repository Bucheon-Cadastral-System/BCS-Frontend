import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { UserAvatar, UserMenu } from '@/entities/user'
import type { UserProfile } from '@/entities/user'
import { useBottomSheet } from '@/shared/lib/useBottomSheet'
import { useDismiss } from '@/shared/lib/useDismiss'
import { useNarrowScreen } from '@/shared/lib/useNarrowScreen'
import { useViewportHeight } from '@/shared/lib/useViewportHeight'
import { useTabSlide } from '@/shared/lib/useTabSlide'
import { useElementWidth } from '@/shared/lib/useElementWidth'
import { BrandMark } from '@/shared/ui/BrandMark'
import { Skeleton } from '@/shared/ui/Skeleton'
import { PILL, POPOVER } from '@/shared/ui/classes'

/** 헤더 탭 한 칸 — 화면이 무엇을 세울지 정한다(지도의 패널 전환, 관리자 화면의 자리 전환) */
export interface HeaderTab {
  key: string
  label: string
  icon: ReactNode
  active: boolean
  onClick: () => void
}

/**
 * 화면 위에 떠 있는 헤더.
 * 좌측은 브랜드와 지금 보고 있는 자리(지도 화면은 패널 전환 탭, 그 밖의 화면은 화면 이름),
 * 우측은 검색 자리와 사용자 메뉴다. 화면이 바뀌어도 같은 자리에 같은 크기로 서야 해서 모든 화면이 이 하나를 쓴다.
 * 화면을 가로지르는 띠 대신 알약 두 개로 두어 지도를 덜 가린다.
 */
export function AppHeader(props: {
  /** 브랜드를 누르면 돌아갈 곳 — 지도 화면은 이미 그 화면이라 주지 않는다 */
  onHome?: () => void
  /** 브랜드 옆 탭 — 지도는 패널 전환, 관리자 화면은 자리 전환에 쓴다 */
  tabs?: HeaderTab[]
  /** 우측 알약 왼쪽 자리 — 무엇을 검색할지는 화면이 정한다 */
  search?: ReactNode
  /** 지금 로그인한 사용자 — 아직 받아오지 못했으면 자리만 지킨다 */
  user: UserProfile | null
  /** 공개 기준점만 보는 비로그인 상태 */
  guest?: boolean
  /** 주지 않으면 사용자 메뉴에 그 항목을 두지 않는다(이미 그 화면인 경우) */
  onOpenUserManagement?: () => void
  /** 좌측 알약의 폭 — 그 아래 서는 칩·패널이 같은 너비를 쓰도록 알린다 */
  onBrandWidthChange?: (px: number) => void
  /** 우측 묶음(검색+사용자)의 폭 — 그 아래 서는 대화 패널이 같은 너비를 쓰도록 알린다 */
  onUtilityWidthChange?: (px: number) => void
  /** 내 정보를 고친 뒤 — 화면이 쥔 프로필을 다시 받도록 알린다 */
  onProfileUpdated?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)
  const narrow = useNarrowScreen()
  const viewportHeight = useViewportHeight()
  // 바깥 클릭·Esc 로 닫는 것은 말풍선만이다 — 시트는 제 손잡이와 뒤 덮개가 닫는다
  useDismiss({ enabled: menuOpen && !narrow, onDismiss: () => setMenuOpen(false), ref: userRef })
  const profileSheet = useBottomSheet({
    open: menuOpen && narrow,
    onClosed: () => setMenuOpen(false),
    viewportHeight,
    minHeight: 320,
  })

  const user = props.user
  const guest = props.guest === true

  // 켜진 탭 밑을 따라 미끄러지는 면 — 탭마다 면을 따로 켜고 끄면 자리가 옮겨 간다는 것이 보이지 않는다
  const [tabsRow, setTabsRow] = useState<HTMLDivElement | null>(null)
  const activeKey = props.tabs?.find((tab) => tab.active)?.key ?? null
  // 끌어서 훑는 동안에는 손 아래 탭을 보여 준다. 실제로 켜지는 것은 손을 뗄 때다
  const tabs = props.tabs
  const sliding = useTabSlide({
    row: tabsRow,
    attr: 'data-tab',
    onSelect: (key) => tabs?.find((tab) => tab.key === key)?.onClick(),
  })
  const shownKey = sliding?.key ?? activeKey
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(null)
  useLayoutEffect(() => {
    const el = shownKey === null ? null : tabsRow?.querySelector<HTMLElement>(`[data-tab="${shownKey}"]`)
    if (!el || tabsRow === null) return // 꺼진 동안에는 마지막 자리를 그대로 두고 흐리게만 한다
    const next = { left: el.offsetLeft, width: el.offsetWidth }
    // 훑는 동안에는 손끝을 그대로 따라간다. 양끝은 탭 줄 안에 잡아 둔다
    if (sliding !== null) {
      const all = [...tabsRow.querySelectorAll<HTMLElement>('[data-tab]')]
      const first = all[0]?.offsetLeft ?? next.left
      const lastTab = all.at(-1)
      const last = lastTab === undefined ? next.left + next.width : lastTab.offsetLeft + lastTab.offsetWidth
      next.left = Math.min(Math.max(sliding.x - next.width / 2, first), last - next.width)
    }
    // 같은 값으로 다시 넣으면 렌더가 끝없이 돈다(탭 배열은 렌더마다 새 참조)
    setMarker((current) => (current && current.left === next.left && current.width === next.width ? current : next))
  }, [shownKey, tabsRow, sliding, props.tabs])

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
      <BrandMark className="size-6 shrink-0 max-lg:size-[22px]" />
      {/* max-lg: 좁은 화면은 하단 내비가 탭을 맡아 브랜드 알약은 로고만 남긴다 */}
      <span className="leading-[1.15] max-lg:hidden">
        <span className="block text-[14px] font-bold tracking-[-.02em] text-ink">BCS</span>
        <span className="block text-[11px] text-ink-3">부천시 지적기준점 관리 시스템</span>
      </span>
    </>
  )

  return (
    // 좁은 화면에서는 브랜드·검색·프로필이 상자 하나에 담긴다. 넓은 화면에서는 이 상자가 사라지고(contents)
    // 안의 둘이 지금처럼 좌우로 떨어져 각자 알약으로 선다 — 상자의 면·테두리·그늘도 함께 사라진다.
    // 자리는 전부 px 로 못박는다. 글자 크기 설정이 기본이 아닌 기기에서 상자 안의 자리가 어긋나지 않게 한다
    <div
      className={`lg:contents max-lg:absolute max-lg:inset-x-[12px] max-lg:top-[10px] max-lg:z-[45] max-lg:flex max-lg:h-[46px] max-lg:items-center max-lg:gap-[10px] max-lg:pl-[12px] max-lg:pr-[9px] ${PILL}`}
    >
      <div
        ref={brandRef}
        // 좁은 화면에서는 상자 안의 기호 하나로 줄어든다 — 제 알약(면·테두리·그늘·자리)을 모두 내려놓는다
        className={`absolute left-4 top-4 z-20 flex h-11 items-center gap-2 py-0 pl-3.5 pr-2 max-lg:static max-lg:h-auto max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none ${PILL}`}
      >
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

        {(props.tabs?.length ?? 0) > 0 && (
          <>
            <span className="mx-[3px] h-[22px] w-px bg-line-field max-lg:hidden" aria-hidden />
            <div ref={setTabsRow} className="relative flex touch-none items-center gap-1 max-lg:hidden">
              {marker && (
                <span
                  aria-hidden="true"
                  style={{ left: marker.left, width: marker.width }}
                  // 훑는 동안에는 전이를 뗀다 — 손끝(포인터)과 면이 어긋나면 그 어긋남이 곧 지연으로 읽힌다
                  className={`absolute top-0 h-[34px] rounded-ctl bg-teal-wash-strong ${
                    sliding === null ? 'transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]' : ''
                  } ${shownKey === null ? 'opacity-0' : 'opacity-100'}`}
                />
              )}
              {props.tabs?.map(({ key, ...tab }) => (
                <Tab key={key} tabKey={key} {...tab} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 좁은 화면에서는 이 묶음도 상자 안의 한 자리로 선다 — 검색이 남은 폭을 채우고 그 오른쪽에 프로필이 붙는다.
          기호와 검색 사이의 구분선은 상자가 세운다(넓은 화면에는 없다) */}
      <span className="h-[22px] w-px shrink-0 bg-line-field lg:hidden" aria-hidden />
      <div
        ref={utilityRef}
        className="absolute right-4 top-4 z-[45] flex items-center gap-2 max-lg:static max-lg:min-w-0 max-lg:flex-1 max-lg:gap-[10px]"
      >
        <div className="max-lg:h-[46px] max-lg:min-w-0 max-lg:flex-1">{props.search}</div>
        <div ref={userRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={guest ? '게스트 메뉴' : '내 정보'}
            // 오른쪽 화살표는 제 상자 안에서 이미 3px 가까이 비워 두므로 왼쪽보다 적게 준다 — 값이 아니라 보이는 여백을 맞춘다.
            // 좁은 화면에서는 상자 안의 아바타 하나로 줄어든다. 과녁은 아바타(30)보다 크게 34 로 잡고,
            // 상자가 오른쪽에 남긴 9px 까지 더해 손가락이 닿는 자리를 넓힌다
            className={`flex h-11 items-center gap-2 py-0 pl-[7px] pr-2 transition-colors hover:border-line-field max-lg:size-[34px] max-lg:shrink-0 max-lg:justify-center max-lg:border-0 max-lg:bg-transparent max-lg:px-0 max-lg:shadow-none ${PILL}`}
          >
            {user ? (
              <UserAvatar name={user.name} className="size-[30px] text-[11.5px]" />
            ) : guest ? (
              <UserAvatar name="" guest className="size-[30px] text-[11px]" />
            ) : (
              <Skeleton className="size-[30px] shrink-0 rounded-full" />
            )}
            {/* 브랜드 알약과 같은 규칙 — 윗줄은 크고 굵게, 아랫줄은 작고 흐리게.
                폭은 고정한다. 이름·소속 길이를 따라 알약이 늘고 줄면 그 폭을 쓰는 대화 패널까지 흔들리고,
                프로필을 받아오는 순간에도 자리가 튄다. 94px 는 가장 긴 소속(부동산관리팀 주무관 90.9px)이 들어가는 값. */}
            <span className="w-[94px] shrink-0 text-left leading-[1.15] max-lg:hidden">
              {user ? (
                <>
                  <span className="block truncate text-[14px] font-bold tracking-[-.02em] text-ink">{user.name}</span>
                  <span className="block truncate text-[11px] text-ink-3">{`${user.team} ${user.position}`}</span>
                </>
              ) : guest ? (
                <span className="block truncate text-[14px] font-bold tracking-[-.02em] text-ink">게스트</span>
              ) : (
                <span className="flex flex-col gap-1 py-[3px]">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-2.5 w-[74px]" />
                </span>
              )}
            </span>
            <svg viewBox="0 0 24 24" className="size-[13px] shrink-0 text-ink-4 max-lg:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {/* 넓은 화면은 알약 아래 말풍선. 좁은 화면은 손이 닿는 아래에서 시트로 올라온다(이 상자 밖) */}
          {menuOpen && !narrow && (
            <div className={`panel-in absolute right-0 top-[50px] z-40 w-[300px] overflow-hidden ${POPOVER}`}>
              <UserMenu
                variant="popover"
                user={user}
                guest={guest}
                onOpenUserManagement={props.onOpenUserManagement}
                onProfileUpdated={props.onProfileUpdated}
                onDone={() => setMenuOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* 마치고 나와야 하는 일이라 뒤를 덮는다 — 지도 패널 시트와 달리 뒤를 만질 일이 없다 */}
      {menuOpen && narrow && (
        <>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => profileSheet.requestClose()}
            className="fixed inset-0 z-[60] bg-[rgba(9,26,24,.34)]"
          />
          <aside
            ref={profileSheet.sheet.rootRef}
            style={profileSheet.sheet.style}
            className={`fixed inset-x-0 bottom-0 z-[61] flex flex-col overflow-hidden rounded-t-pill border-x border-t border-line bg-sheet shadow-sheet ${profileSheet.sheet.className}`}
          >
            <div className="flex shrink-0 justify-center py-2" {...profileSheet.sheet.handleProps}>
              <span className="h-1 w-[38px] rounded-chip bg-line-pill" />
            </div>
            <div ref={profileSheet.sheet.scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <UserMenu
                variant="sheet"
                user={user}
                guest={guest}
                onOpenUserManagement={props.onOpenUserManagement}
                onProfileUpdated={props.onProfileUpdated}
                onDone={() => setMenuOpen(false)}
              />
            </div>
          </aside>
        </>
      )}
    </div>
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
