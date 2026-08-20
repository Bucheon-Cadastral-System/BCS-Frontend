import type { ReactNode } from 'react'

const BANNER_TONE = {
  warn: 'border-amber/40 bg-amber-wash text-amber',
  danger: 'border-danger-edge bg-danger-wash text-danger',
  muted: 'border-line bg-panel text-ink-3',
} as const

/**
 * 지도 위에 떠서 사정을 알리는 띠 — 회원 지도와 게스트 지도가 같은 모양을 쓴다.
 *
 * <p>실패만 alert 로 알린다. 나머지는 화면이 뜰 때부터 서 있는 사정이라 라이브 영역으로 두면
 * 하던 일을 끊고 읽어 주는 소리만 늘어난다.
 */
export function MapBanner(props: { tone: keyof typeof BANNER_TONE; children: ReactNode }) {
  return (
    <p
      role={props.tone === 'danger' ? 'alert' : undefined}
      className={`pointer-events-auto rounded-pop border px-3.5 py-1.5 text-[12px] shadow-pill [&_code]:rounded [&_code]:bg-soft [&_code]:px-1 ${BANNER_TONE[props.tone]}`}
    >
      {props.children}
    </p>
  )
}
