import { useEffect, useState } from 'react'

/** 이보다 적게 돌면 새로 그리지 않는다(도) — 손에 든 기기는 가만히 두어도 1도 안팎으로 떨린다 */
const MIN_TURN = 2

/** 방향을 읽기 전에 허가를 물어야 하는 브라우저(아이폰)가 내미는 창구 */
interface OrientationPermission {
  requestPermission?: () => Promise<PermissionState | 'granted' | 'denied'>
}

/** 아이폰이 실어 보내는 진북 기준 방위각 */
interface CompassEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number
}

/**
 * 기기가 향한 방위각(도, 진북 0° 시계방향). 읽을 수 없으면 null.
 *
 * <p>켜고 끄는 자리를 두지 않는다. 현장에서 기기를 들면 화면은 늘 그쪽을 가리켜야 하고, 그걸 위해 버튼을
 * 한 번 더 누르게 할 이유가 없다. 값을 못 읽으면 그냥 null 이라 현재 위치 표시가 방향 없는 마름모로 설 뿐,
 * 아무것도 깨지지 않는다.
 *
 * <p>아이폰은 `webkitCompassHeading` 으로 방위각을 바로 준다. 그 밖의 기기는 `alpha`(z축 회전)를 방위각으로
 * 뒤집어 쓰되, 화면을 돌려 쓰는 동안에는 그 각도만큼 되돌려야 화면 위쪽이 기준이 된다. 절대 방위가 아닌 값은
 * 버린다 — 지자기를 못 읽는 기기의 alpha 는 켠 순간을 0 으로 잡은 상대값이라 엉뚱한 쪽을 북이라고 가리킨다.
 *
 * <p>아이폰은 허가를 받아야 하고, 그 물음은 사용자가 화면을 건드린 자리에서만 띄울 수 있다. 그래서 화면을
 * 처음 누르는 순간에 한 번 묻는다. 거절해도 다시 묻지 않는다.
 */
export function useCompassHeading(enabled: boolean): number | null {
  const [heading, setHeading] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      setHeading(null)
      return
    }
    let released = false
    let listening = false

    const read = (event: Event) => {
      const next = headingOf(event as CompassEvent)
      if (next === null) return
      setHeading((current) => (current !== null && turn(current, next) < MIN_TURN ? current : next))
    }
    const listen = () => {
      if (listening || released) return
      listening = true
      // 절대 방위를 따로 내주는 기기는 그쪽이 정확하다. 둘 다 붙여 두고 값이 있는 쪽만 쓴다
      window.addEventListener('deviceorientationabsolute', read)
      window.addEventListener('deviceorientation', read)
    }

    const api = typeof DeviceOrientationEvent === 'undefined'
      ? undefined
      : (DeviceOrientationEvent as unknown as OrientationPermission)
    if (api === undefined) return
    let ask: (() => void) | undefined
    if (typeof api.requestPermission !== 'function') listen()
    else {
      const request = api.requestPermission.bind(api)
      ask = () => {
        window.removeEventListener('pointerdown', ask as EventListener)
        void request()
          .then((state) => {
            if (state === 'granted') listen()
          })
          .catch(() => undefined)
      }
      window.addEventListener('pointerdown', ask, { once: true, passive: true })
    }

    return () => {
      released = true
      if (ask !== undefined) window.removeEventListener('pointerdown', ask as EventListener)
      window.removeEventListener('deviceorientationabsolute', read)
      window.removeEventListener('deviceorientation', read)
    }
  }, [enabled])

  return heading
}

/** 두 방위각 사이의 각도 차이(0~180) */
function turn(from: number, to: number): number {
  const diff = Math.abs(from - to) % 360
  return diff > 180 ? 360 - diff : diff
}

function headingOf(event: CompassEvent): number | null {
  const compass = event.webkitCompassHeading
  if (typeof compass === 'number' && Number.isFinite(compass)) return normalize(compass)
  if (event.absolute !== true || event.alpha === null || !Number.isFinite(event.alpha)) return null
  const screenAngle = typeof screen !== 'undefined' ? (screen.orientation?.angle ?? 0) : 0
  return normalize(360 - event.alpha + screenAngle)
}

function normalize(angle: number): number {
  return ((angle % 360) + 360) % 360
}
