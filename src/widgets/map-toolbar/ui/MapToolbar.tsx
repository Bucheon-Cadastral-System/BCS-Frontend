import { AddPointButton } from '@/widgets/add-point-control'
import { AppHeader } from '@/shared/ui/AppHeader'

/**
 * 지도 화면 헤더 — 공통 헤더에 기준점 추가 토글만 얹는다.
 * 지적도·CSV·테마는 자리를 정한 뒤 다시 붙인다.
 */
export function MapToolbar(props: { addMode: boolean; onToggleAdd: () => void }) {
  return (
    <AppHeader>
      <AddPointButton active={props.addMode} onToggle={props.onToggleAdd} />
    </AppHeader>
  )
}
