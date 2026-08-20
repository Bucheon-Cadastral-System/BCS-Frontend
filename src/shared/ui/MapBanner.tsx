import type { ReactNode } from 'react'

const BANNER_TONE = {
  warn: 'border-amber/40 bg-amber-wash text-amber',
  danger: 'border-danger-edge bg-danger-wash text-danger',
  muted: 'border-line bg-panel text-ink-3',
} as const

/** 지도 위에 떠서 사정을 알리는 띠 — 회원 지도와 게스트 지도가 같은 모양을 쓴다 */
export function MapBanner(props: { tone: keyof typeof BANNER_TONE; children: ReactNode }) {
  return (
    <p
      className={`pointer-events-auto rounded-pop border px-3.5 py-1.5 text-[12px] shadow-pill [&_code]:rounded [&_code]:bg-soft [&_code]:px-1 ${BANNER_TONE[props.tone]}`}
    >
      {props.children}
    </p>
  )
}
