import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * 아래에서 올라오는 시트를 손가락으로 끄는 동작.
 *
 * <p>끄는 동안에는 시트를 손끝만큼 따라 옮기고, 놓을 때 얼마나 움직였는지를 부르는 쪽에 알린다.
 * 그 거리로 닫을지 펼칠지를 정하는 것은 시트마다 단계가 달라 여기서 정하지 않는다.
 *
 * <p>포인터 이벤트로 받는다. 터치·마우스·펜이 한 갈래로 들어오고, 포인터를 손잡이에 붙들어 두면
 * 손끝이 시트 밖으로 나가도 끌기가 끊기지 않는다.
 */
export function useSheetDrag(props: { onMove?: (movedY: number) => void; onSettle: (movedY: number) => void }) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startRef = useRef(0)
  const movedRef = useRef(0)
  const onSettleRef = useRef(props.onSettle)
  onSettleRef.current = props.onSettle
  const onMoveRef = useRef(props.onMove)
  onMoveRef.current = props.onMove

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    startRef.current = event.clientY
    movedRef.current = 0
    setDragging(true)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!dragging) return
    movedRef.current = event.clientY - startRef.current
    setOffset(movedRef.current)
    onMoveRef.current?.(movedRef.current)
  }

  const finish = (event: ReactPointerEvent<HTMLElement>) => {
    if (!dragging) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    setDragging(false)
    setOffset(0)
    onSettleRef.current(movedRef.current)
  }

  return {
    /** 끄는 동안의 세로 이동(px) — 아래로 끌면 양수다. 놓으면 0 으로 돌아간다 */
    offset,
    dragging,
    /** 손잡이에 그대로 펼쳐 넣는다 — 브라우저의 기본 스크롤과 겹치지 않게 touch-action 도 함께 건다 */
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      style: { touchAction: 'none' as const },
    },
  }
}
