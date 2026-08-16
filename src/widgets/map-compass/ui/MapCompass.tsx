import { useEffect, useState } from 'react'
import type Map from 'ol/Map'

/**
 * 북쪽으로 친다고 볼 만큼 작은 각도(라디안, 약 0.3°).
 *
 * <p>두 손가락을 뗄 때 남는 미세한 각도까지 '틀어졌다'고 보면, 북쪽으로 되돌린 뒤에도 버튼이 사라지지 않는다.
 */
const NORTH = 0.005

/** 되돌아가는 시간(ms) — 갑자기 튀지 않을 만큼만 돌린다 */
const RESET_MS = 260

/**
 * 지도가 북쪽에서 얼마나 틀어졌는지 알리고, 누르면 북쪽으로 되돌린다.
 *
 * <p>북쪽을 보고 있는 동안에는 서지 않는다. 되돌릴 것이 없을 때의 되돌리기 버튼은 자리만 차지하고,
 * 지도 위에 떠 있는 조각은 하나라도 적을수록 지도가 넓어 보인다. 손가락으로 틀 수 있는 화면에서만
 * 틀어질 일이 생기므로 서는 자리도 그 화면이 정한다(className).
 *
 * <p>화살표는 늘 진북을 가리킨다 — 지도가 돌아간 만큼 화살표도 같이 돌려 두면, 결과적으로 화면 어디가
 * 북쪽인지를 그 하나가 계속 가리키게 된다. 끄는 동안에도 프레임마다 따라 돌아야 하므로 전이(transition)를
 * 걸지 않는다. 손끝과 화살표가 어긋나면 그 어긋남이 곧 지연으로 읽힌다.
 */
export function MapCompass(props: {
  map: Map | null
  /**
   * 지금은 되돌릴 수 없다 — 다른 것이 지도의 방향을 잡고 있을 때(따라가기의 방향 맞추기) 준다.
   *
   * <p>그때 이 버튼을 누르면 북쪽으로 돌자마자 방향 맞추기가 다시 제자리로 돌려놓아, 눌러도 아무 일도
   * 일어나지 않는 버튼이 된다. 되돌릴 수 없는 동안에는 서지 않는 편이 맞다.
   */
  paused?: boolean
  className?: string
}) {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const view = props.map?.getView()
    if (view === undefined) return
    const read = () => setRotation(view.getRotation())
    read() // 지도가 늦게 오면 이미 틀어져 있을 수 있다
    view.on('change:rotation', read)
    return () => view.un('change:rotation', read)
  }, [props.map])

  // 한 바퀴를 넘긴 값(±2π 언저리)도 북쪽이다 — 방향 맞추기가 돌리는 각도는 한 바퀴를 넘어 이어진다
  const full = Math.PI * 2
  const turned = Math.abs(rotation - Math.round(rotation / full) * full)
  const hidden = props.paused === true || turned < NORTH

  return (
    <button
      type="button"
      onClick={() => {
        const view = props.map?.getView()
        if (view === undefined) return
        // 한 바퀴를 넘긴 값에서 0 으로 곧장 돌리면 이미 북쪽인 지도가 제자리를 두고 한 바퀴를 돈다.
        // 방향 맞추기는 각도를 한 바퀴 너머로 이어 두므로, 가장 가까운 북쪽으로 간다
        const full = Math.PI * 2
        view.animate({ rotation: Math.round(view.getRotation() / full) * full, duration: RESET_MS })
      }}
      // 서지 않는 동안에는 눈에서만 지우는 것이 아니라 순서에서도 뺀다 — 보이지 않는 버튼에 탭이 멈추면 안 된다
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      title="북쪽으로 되돌리기"
      aria-label="북쪽으로 되돌리기"
      // 대화 버블과 같은 규격이다 — 지도 위에 떠서 한 가지 일만 하는 둥근 자리라 같은 옷을 입힌다.
      // 색조는 ::before 로 덧칠한다(바탕을 갈아 끼우면 지도가 비친다). 자리는 부르는 쪽이 정한다
      className={`flex size-[46px] items-center justify-center rounded-full border-[1.5px] border-teal-btn-edge bg-pill text-teal-text shadow-pill transition-[opacity,border-color] duration-200 before:absolute before:inset-0 before:rounded-full before:bg-teal-wash before:opacity-0 before:transition-opacity before:duration-200 hover:border-teal-text hover:before:opacity-100 ${
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      } ${props.className ?? ''}`}
    >
      <svg
        viewBox="0 0 24 24"
        // 색조(::before)는 자리를 잡은 상자라 그냥 두면 아이콘 위에 얹힌다 — 아이콘도 자리를 잡아 그 위로 올린다
        className="relative size-[22px] origin-center"
        style={{ transform: `rotate(${rotation}rad)` }}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* 한 방향만 가리키는 화살표다 — 양끝이 다 뾰족한 바늘은 작게 그리면 어느 쪽이 북인지 흐리다.
            아래를 파 두어(가운데 홈) 꼬리가 아니라 촉으로 읽히게 한다 */}
        <path d="M12 3.8 17.4 18.8 12 15.4 6.6 18.8Z" />
      </svg>
    </button>
  )
}
