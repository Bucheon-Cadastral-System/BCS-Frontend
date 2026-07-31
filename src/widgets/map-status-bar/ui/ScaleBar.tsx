import { useEffect, useRef, useState } from 'react'
import type Map from 'ol/Map'
import ScaleLine from 'ol/control/ScaleLine'
import { getPointResolution } from 'ol/proj'
import { STATUS_CHIP } from './chip'

/** 축척 비율(1:N)은 '화면 1픽셀이 실제 몇 m인가'를 인치/DPI로 환산해 구한다 */
const DPI = 96
const INCH_IN_METERS = 0.0254

/**
 * 축척 — 막대(미터)와 비율(1:N)을 한 칩에 담는다.
 * OL 의 ScaleLine 을 지도 기본 컨트롤로 두면 지도 구석에 따로 떠서 비율과 떨어지므로,
 * target 으로 이 칩 안에 심고 위치·색은 App.css 의 `.bcs-scale-host` 규칙에서 맞춘다.
 */
export function ScaleBar(props: { map: Map | null }) {
  const { map } = props
  const hostRef = useRef<HTMLDivElement>(null)
  const [denominator, setDenominator] = useState<number | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!map || !host) return

    // 지도에 이미 붙은 축척 컨트롤은 지도 구석에 따로 떠서 이 칩과 중복된다 → 이 칩이 유일한 축척이 되게 정리
    map
      .getControls()
      .getArray()
      .filter((c) => c instanceof ScaleLine)
      .forEach((c) => map.removeControl(c))

    const control = new ScaleLine({ units: 'metric', target: host })
    map.addControl(control)

    const updateRatio = () => {
      const view = map.getView()
      const resolution = view.getResolution()
      const center = view.getCenter()
      if (resolution === undefined || !center) return
      // 웹 메르카토르는 위도에 따라 실제 거리가 달라지므로 지점 해상도로 보정한다
      const metersPerPixel = getPointResolution(view.getProjection(), resolution, center)
      setDenominator(Math.round((metersPerPixel * DPI) / INCH_IN_METERS))
    }

    updateRatio()
    map.on('moveend', updateRatio)
    return () => {
      map.un('moveend', updateRatio)
      map.removeControl(control)
    }
  }, [map])

  return (
    <div className={STATUS_CHIP}>
      <span className="font-semibold tabular-nums">{denominator ? `1:${denominator.toLocaleString('ko-KR')}` : '—'}</span>
      <span className="text-gray-300 dark:text-gray-600">|</span>
      <div ref={hostRef} className="bcs-scale-host" />
    </div>
  )
}
