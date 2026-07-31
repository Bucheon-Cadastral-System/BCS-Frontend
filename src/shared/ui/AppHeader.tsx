import type { ReactNode } from 'react'
import { BrandHomeLink } from './BrandHomeLink'

/**
 * 화면 공통 상단 헤더 — 좌측 브랜드(메인 링크), 우측에 화면별 요소.
 * 지도·사용자 관리가 같은 높이·색·여백을 쓰도록 여기 한 곳에서 정한다.
 */
export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="flex min-h-14 items-center gap-3 bg-gray-800 px-4 text-gray-50 shadow-md">
      <BrandHomeLink />
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </header>
  )
}
