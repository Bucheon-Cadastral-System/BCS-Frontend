import { useEffect, useState } from 'react'
import type Map from 'ol/Map'
import { toLonLat } from 'ol/proj'
import { wgs84ToTm } from '@/shared/lib/crs'
import type { TmEpsg } from '@/shared/lib/crs'
const fmt = (v: number) => v.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * 포인터 위치의 성과 좌표(TM). 마우스가 움직일 때마다 값이 바뀌므로 지도 인스턴스를 직접 구독한다
 * (페이지 상태로 올리면 매 프레임 화면 전체가 리렌더된다).
 */
export function PointerCoordinates(props: { map: Map | null; tmEpsg: TmEpsg }) {
  const { map, tmEpsg } = props
  const [tm, setTm] = useState<{ northing: number; easting: number } | null>(null)

  useEffect(() => {
    if (!map) return
    // 지도를 벗어나도 마지막 값을 그대로 둔다 — 값을 지우면 방금 읽은 좌표를 잃는다
    const onPointerMove = (evt: { coordinate: number[]; dragging: boolean }) => {
      if (evt.dragging) return
      const [lng, lat] = toLonLat(evt.coordinate)
      // 지적 성과 표기는 측량 관례(X=북 northing, Y=동 easting)로 GIS 축 순서와 반대다.
      // proj4 는 GIS 순서로 돌려주므로 x=동, y=북 으로 받아 이름을 붙인다.
      const { x, y } = wgs84ToTm(lng, lat, tmEpsg)
      setTm({ northing: y, easting: x })
    }
    map.on('pointermove', onPointerMove)
    return () => map.un('pointermove', onPointerMove)
  }, [map, tmEpsg])

  return (
    // 폭을 고정한다 — 자릿수에 따라 늘어나면 옆의 축척이 흔들린다
    <span className="flex w-[204px] shrink-0 justify-center whitespace-nowrap font-mono text-[12px] text-ink-2">
      X <b className="ml-1 font-semibold text-ink">{tm ? fmt(tm.northing) : '—'}</b>
      <span className="mx-1 text-ink-4">·</span>Y <b className="ml-1 font-semibold text-ink">{tm ? fmt(tm.easting) : '—'}</b>
    </span>
  )
}
