import type { ReactNode } from 'react'
import { AppHeader } from '@/shared/ui/AppHeader'

/**
 * 지도 화면 헤더 — 공통 헤더에 화면별 요소를 꽂는 자리만 제공한다.
 * 어떤 버튼을 둘지는 페이지가 정한다(위젯끼리 직접 참조하지 않게).
 */
export function MapToolbar({ children }: { children?: ReactNode }) {
  return <AppHeader>{children}</AppHeader>
}
