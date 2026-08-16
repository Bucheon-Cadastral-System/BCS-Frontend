import { useEffect, useState } from 'react'

/**
 * 이보다 적게 돌면 새 값으로 치지 않는다(도).
 *
 * <p>손에 든 기기는 가만히 두어도 1도 안팎으로 떤다. 그 떨림까지 새 값으로 흘려보내면, 서 있기만 해도
 * 화면은 쉬지 않고 다시 그려진다 — 이 값이 바뀔 때마다 지도 전체를 다시 그리기 때문이다.
 *
 * <p>그렇다고 크게 잡으면 화면이 그 각도만큼씩 툭툭 끊겨 돈다. 4도로 두었더니 30°/초로 도는 손짓에서
 * 프레임의 절반 이상이 멈춰 있고 움직일 때는 8도씩 건너뛰었다. 지금은 받는 쪽이 그 값으로 곧장 놓지 않고
 * 매 프레임 조금씩 따라붙으므로(ControlPointMap 의 GLIDE_MS), 여기서는 떨림만 걸러 낼 만큼만 막으면 된다.
 */
const MIN_TURN = 1

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
 * <p>아이폰은 허가를 받아야 하고, 그 물음은 사용자의 손짓 안에서만 띄울 수 있다(transient activation).
 * 그래서 화면을 처음 누를 때 묻는다. 다만 누름의 시작(pointerdown)이 아니라 끝(click)에서 묻는다 —
 * 사파리는 누름이 끝나야 손짓으로 치는 경우가 있고, 그 밖에서 부르면 물음이 뜨지 않은 채 거절된다.
 *
 * <p>거절에는 두 가지가 있다. 사용자가 아니라고 한 것(denied)은 그대로 받아들이고 다시 묻지 않는다.
 * 손짓 밖에서 불러 튕긴 것(예외)은 사용자의 뜻이 아니므로 다음 손짓에 다시 묻는다. 둘을 가르지 않고
 * 한 번에 접으면, 첫 물음이 손짓으로 인정받지 못한 기기에서는 나침반이 영영 켜지지 않는다.
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
      // 손짓 밖에서 튕긴 것이라도 끝없이 다시 묻지는 않는다 — 물음이 뜨지 않는 기기에서 누를 때마다 부르게 된다
      let tries = 0
      const stopAsking = () => {
        if (ask !== undefined) window.removeEventListener('click', ask as EventListener, true)
      }
      ask = () => {
        tries += 1
        void request()
          .then((state) => {
            stopAsking()
            if (state === 'granted') listen()
            else console.warn('나침반: 방향 접근이 거부되어 방향 표시를 켜지 못했습니다.', state)
          })
          .catch((error: unknown) => {
            // 손짓으로 인정받지 못한 호출 — 다음 손짓에 다시 묻는다
            if (tries >= 3) stopAsking()
            console.warn('나침반: 방향 접근을 묻지 못했습니다.', error)
          })
      }
      // 누르는 자리를 가리지 않으려고 캡처로 받는다 — 지도든 버튼이든 어디를 눌러도 한 번은 지나간다
      window.addEventListener('click', ask, { capture: true, passive: true })
    }

    return () => {
      released = true
      if (ask !== undefined) window.removeEventListener('click', ask as EventListener, true)
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
