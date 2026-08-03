import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MOCK_CURRENT_USER } from '@/entities/user'
import { useDismiss } from '@/shared/lib/useDismiss'
import { useElementWidth } from '@/shared/lib/useElementWidth'
import { PILL } from '@/shared/ui/classes'
import type { PanelKey } from '@/shared/model/panel'

/**
 * 화면 위에 떠 있는 헤더.
 * 좌측은 브랜드와 지금 보고 있는 자리(지도 화면은 판 전환 탭, 그 밖의 화면은 화면 이름),
 * 우측은 검색 자리와 사용자 메뉴다. 화면이 바뀌어도 같은 자리에 같은 크기로 서야 해서 모든 화면이 이 하나를 쓴다.
 * 화면을 가로지르는 띠 대신 알약 두 개로 두어 지도를 덜 가린다.
 */
export function AppHeader(props: {
  /** 브랜드를 누르면 돌아갈 곳 — 지도 화면은 이미 그 화면이라 주지 않는다 */
  onHome?: () => void
  /** 지도 화면의 판 전환 탭 */
  panel?: { open: PanelKey | null; onToggle: (key: PanelKey) => void }
  /** 지금 화면 이름 — 탭이 없는 화면이 그 자리를 대신 쓴다 */
  title?: { label: string; icon: ReactNode }
  /** 우측 알약 왼쪽 자리 — 무엇을 검색할지는 화면이 정한다 */
  search?: ReactNode
  isAdmin: boolean
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
        <span className="block text-[9.5px] text-ink-4">부천시 지적기준점 관리</span>
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

        {(props.panel || props.title) && <span className="mx-[3px] h-[22px] w-px bg-line-field" aria-hidden />}

        {props.panel && (
          <>
            <Tab
              label="프로젝트"
              active={props.panel.open === 'project'}
              onClick={() => props.panel?.onToggle('project')}
            >
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
            </Tab>
            <Tab label="기준점" active={props.panel.open === 'points'} onClick={() => props.panel?.onToggle('points')}>
              <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10Z" />
              <circle cx="12" cy="11" r="2" />
            </Tab>
          </>
        )}

        {props.title && (
          <span className="flex h-[34px] items-center gap-[7px] rounded-ctl bg-teal-wash-strong px-3 text-[12px] font-semibold text-teal-text">
            {props.title.icon}
            {props.title.label}
          </span>
        )}
      </div>

      <div ref={utilityRef} className="absolute right-4 top-4 z-[45] flex items-center gap-2">
        {props.search}
        <div ref={userRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className={`flex h-11 items-center gap-2 py-0 pl-1.5 pr-3 transition-colors hover:border-line-field ${PILL}`}
          >
            <span className="flex size-[30px] items-center justify-center rounded-full bg-teal-fill text-[11.5px] font-semibold text-[#EFFBF7]">
              {MOCK_CURRENT_USER.name.slice(0, 1)}
            </span>
            <span className="text-left leading-[1.2]">
              <span className="block text-[12px] text-ink-2">{MOCK_CURRENT_USER.name}</span>
              <span className="block text-[10px] text-ink-4">
                {MOCK_CURRENT_USER.team} {MOCK_CURRENT_USER.position}
              </span>
            </span>
            <svg viewBox="0 0 24 24" className="size-[13px] shrink-0 text-ink-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {menuOpen && (
            <div className="panel-in absolute right-0 top-[50px] z-40 w-56 overflow-hidden rounded-pop border border-line bg-panel-strong shadow-panel backdrop-blur-[12px]">
              <div className="flex items-center justify-between gap-2 px-[13px] pb-[9px] pt-2.5">
                <span className="text-[12px] text-ink-3">권한</span>
                <span className="font-mono text-[11px] font-semibold tracking-[.1em] text-teal-text">
                  {props.isAdmin ? 'ADMIN' : 'USER'}
                </span>
              </div>
              {props.isAdmin && props.onOpenUserManagement && (
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
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/** 판 전환 탭 — 켜진 탭이 곧 지금 열려 있는 판이다 */
function Tab(props: { label: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={`flex h-[34px] items-center gap-[7px] rounded-ctl px-3 text-[12px] font-semibold transition-colors ${
        props.active ? 'bg-teal-wash-strong text-teal-text' : 'text-ink-3 hover:bg-hover hover:text-ink-2'
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {props.children}
      </svg>
      {props.label}
    </button>
  )
}

/** 사용자 관리 아이콘 — 헤더 이름표와 사용자 메뉴가 같은 그림을 쓴다 */
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

/** 지적 격자 + 기준점(앰버) 심볼 — 브랜드 색은 배경 톤과 무관하게 고정한다 */
function BrandMark() {
  return (
    <svg viewBox="5 5 54 54" className="size-6 shrink-0" aria-hidden="true">
      <rect x="7" y="7" width="50" height="50" rx="9" fill="none" stroke="currentColor" strokeWidth="3.4" className="text-ink" />
      <line x1="30" y1="7" x2="30" y2="57" stroke="currentColor" strokeWidth="2" opacity=".55" className="text-ink" />
      <line x1="30" y1="34" x2="57" y2="34" stroke="currentColor" strokeWidth="2" opacity=".55" className="text-ink" />
      <line x1="7" y1="22" x2="30" y2="22" stroke="currentColor" strokeWidth="2" opacity=".55" className="text-ink" />
      <circle cx="30" cy="34" r="5" fill="#E0A020" />
      <circle cx="30" cy="22" r="2.4" fill="currentColor" className="text-ink" />
    </svg>
  )
}
