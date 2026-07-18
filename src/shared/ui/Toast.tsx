import { useEffect, useRef, useState } from 'react'

/**
 * 하단 중앙 토스트. 아래에서 튀어나오고(enter), duration 후 다시 내려가며 사라짐(exit).
 * 복원 = 아이콘 버튼(↺) + 둘레 링 게이지가 duration 동안 줄어들며 카운트다운.
 * 매 토스트마다 부모에서 key 를 바꿔 새로 마운트 → 타이머·애니 재시작.
 */
export function Toast(props: {
  message: string
  actionLabel: string
  onAction: () => void
  onDismiss: () => void
  duration?: number
}) {
  const duration = props.duration ?? 5000
  const [visible, setVisible] = useState(false) // enter/exit 슬라이드
  const [deplete, setDeplete] = useState(false) // 링 게이지 감소 트리거
  const dismissRef = useRef(props.onDismiss)
  dismissRef.current = props.onDismiss
  const closedRef = useRef(false)

  const close = () => {
    if (closedRef.current) return
    closedRef.current = true
    setVisible(false)
    setTimeout(() => dismissRef.current(), 220) // 내려가는 애니 후 언마운트
  }

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setVisible(true)
      setDeplete(true)
    })
    const t = setTimeout(close, duration)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])

  const R = 15
  const C = 2 * Math.PI * R // 링 둘레

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex items-center gap-2 rounded-full bg-gray-900 py-2 pl-4 pr-2 text-[13px] text-white shadow-xl ring-1 ring-white/10"
      style={{
        transform: `translateX(-50%) translateY(${visible ? '0px' : '24px'})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 220ms cubic-bezier(0.34, 1.4, 0.5, 1), opacity 220ms ease',
      }}
    >
      <span>{props.message}</span>
      <button
        type="button"
        onClick={() => {
          props.onAction()
          close()
        }}
        aria-label={props.actionLabel}
        title={props.actionLabel}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-blue-300 hover:bg-white/10"
      >
        {/* 링 게이지 (카운트다운) */}
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
          <circle
            cx="18"
            cy="18"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={C}
            style={{ strokeDashoffset: deplete ? C : 0, transition: `stroke-dashoffset ${duration}ms linear` }}
          />
        </svg>
        {/* 복원 아이콘 (동그라미 화살표 ↺) */}
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>
  )
}
