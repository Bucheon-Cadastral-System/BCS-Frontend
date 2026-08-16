import { useEffect, useRef, useState } from 'react'

/** 이만큼 끌어야 미끄러뜨리기로 본다(px) — 그 전에는 누름이다 */
const SLIDE_START = 6
/** 끌어서 고른 뒤 뒤따라오는 click 을 삼키는 시간(ms). 이 안에 안 오면 삼킬 것이 없다 */
const SWALLOW_MS = 400

/**
 * 탭 줄을 손끝으로 훑어 고르기 — 누르고 옆으로 끌면 켜진 면이 손끝을 따라온다.
 *
 * <p>고르는 것은 손을 뗄 때 한 번이다. 지나가는 탭마다 켜면 탭 하나가 시트를 여닫는 이 화면에서는
 * 훑는 동안 패널이 여러 번 열렸다 닫힌다.
 *
 * <p>손을 뗀 뒤에는 브라우저가 click 을 한 번 더 보낸다. 그대로 두면 방금 고른 탭을 다시 눌러
 * 켰다 끄는 꼴이 되므로 그 한 번만 삼킨다.
 *
 * @param row 탭들이 든 줄. 그 안의 `[attr]` 요소를 탭으로 본다
 * @returns 지금 손끝 아래 있는 탭과 손끝의 x(줄 왼쪽 기준). 끌고 있지 않으면 null
 */
export function useTabSlide(props: {
  row: HTMLElement | null
  attr: string
  onSelect: (key: string) => void
}): { key: string; x: number } | null {
  const [sliding, setSliding] = useState<{ key: string; x: number } | null>(null)
  const selectRef = useRef(props.onSelect)
  useEffect(() => {
    selectRef.current = props.onSelect
  })

  const { row, attr } = props
  useEffect(() => {
    if (row === null) return
    let pointer: number | null = null
    let startX = 0
    let slid = false
    let under: string | null = null

    /** 그 x 좌표에 가장 가까운 탭 — 줄 밖으로 나가도 끝 탭을 놓지 않는다 */
    const keyAt = (x: number) => {
      let best: { key: string; gap: number } | null = null
      for (const el of row.querySelectorAll<HTMLElement>(`[${attr}]`)) {
        const key = el.getAttribute(attr)
        if (key === null) continue
        const rect = el.getBoundingClientRect()
        const gap = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0
        if (best === null || gap < best.gap) best = { key, gap }
      }
      return best?.key ?? null
    }

    const onDown = (event: PointerEvent) => {
      if (pointer !== null || !(event.target instanceof Element)) return
      // 탭에서 시작한 손짓만 받는다 — 같은 줄에 선 지도 컨트롤은 제 일이 있다
      if (event.target.closest(`[${attr}]`) === null) return
      pointer = event.pointerId
      startX = event.clientX
      slid = false
      under = null
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return
      if (!slid) {
        if (Math.abs(event.clientX - startX) < SLIDE_START) return
        slid = true
        row.setPointerCapture(event.pointerId)
      }
      const key = keyAt(event.clientX)
      under = key
      if (key === null) return
      const x = Math.round(event.clientX - row.getBoundingClientRect().left)
      setSliding((current) => (current !== null && current.key === key && current.x === x ? current : { key, x }))
    }
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return
      pointer = null
      setSliding(null)
      if (!slid || under === null) return
      const swallow = (click: Event) => {
        click.stopPropagation()
        click.preventDefault()
      }
      row.addEventListener('click', swallow, { capture: true, once: true })
      window.setTimeout(() => row.removeEventListener('click', swallow, true), SWALLOW_MS)
      selectRef.current(under)
    }
    const onCancel = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return
      pointer = null
      slid = false
      under = null
      setSliding(null)
    }

    row.addEventListener('pointerdown', onDown)
    row.addEventListener('pointermove', onMove)
    row.addEventListener('pointerup', onUp)
    row.addEventListener('pointercancel', onCancel)
    return () => {
      row.removeEventListener('pointerdown', onDown)
      row.removeEventListener('pointermove', onMove)
      row.removeEventListener('pointerup', onUp)
      row.removeEventListener('pointercancel', onCancel)
    }
  }, [row, attr])

  return sliding
}
