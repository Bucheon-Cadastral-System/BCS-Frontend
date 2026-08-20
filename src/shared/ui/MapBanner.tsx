import type { ReactNode } from 'react'

/**
 * 갈래는 테두리와 글자색으로만 말한다 — 물들이는 색(*-wash)은 불투명도가 0.1 안팎이라
 * 패널 위에서는 옅은 색이지만 지도 위에서는 배경이 그대로 비쳐 글자가 묻힌다.
 */
const BANNER_TONE = {
  warn: 'border-amber/40 text-amber',
  danger: 'border-danger-edge text-danger',
  muted: 'border-line text-ink-3',
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
      className={`pointer-events-auto rounded-pop border bg-panel px-3.5 py-1.5 text-[12px] shadow-pill [&_code]:rounded [&_code]:bg-soft [&_code]:px-1 ${BANNER_TONE[props.tone]}`}
    >
      {props.children}
    </p>
  )
}
