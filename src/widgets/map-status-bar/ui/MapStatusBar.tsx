import type Map from 'ol/Map'
import type { TmEpsg } from '@/shared/lib/crs'
import { PointerCoordinates } from './PointerCoordinates'
import { ScaleBar } from './ScaleBar'

/**
 * 지도 좌하단 상태 줄 — 포인터 성과 좌표와 축척.
 * 좌하단 묶음(표시 설정 → 줌 → 상태 줄)을 8px 간격으로 잇는다.
 * 줌 버튼 폭은 24px(OL 기본 1.375em + 좌우 margin 1px)이라 64 + 24 + 8 = 96px 에서 시작한다.
 */
export function MapStatusBar(props: { map: Map | null; tmEpsg: TmEpsg }) {
  return (
    <div className="pointer-events-none absolute bottom-2 left-24 z-[5] flex items-center gap-2">
      <PointerCoordinates map={props.map} tmEpsg={props.tmEpsg} />
      <ScaleBar map={props.map} />
    </div>
  )
}
