import { useEffect, useRef, useState } from 'react'

export type ToastTone = 'info' | 'success' | 'error'

/**
 * 하단 중앙 토스트. 아래에서 튀어나오고(enter), duration 후 다시 내려가며 사라짐(exit).
 * onAction을 주면 복원 버튼(↺ + 둘레 링 게이지 카운트다운), 없으면 닫기 버튼만 둔다.
 * 매 토스트마다 부모에서 key 를 바꿔 새로 마운트 → 타이머·애니 재시작.
 *
 * <p>팝오버로 띄운다. 모달 대화상자가 showModal 로 열려 있으면 그 창과 딤이 top layer 에 서므로,
 * 보통 자리에 그린 토스트는 z-index 를 아무리 올려도 딤 뒤에 가린다. 창 안에서 벌어진 일을 알리는
 * 토스트가 정작 그 창 뒤에 숨는다. 팝오버도 같은 top layer 로 올라가고 대화상자보다 나중에 열려 위에 선다.
 */
type ToastAction =
  // 되돌리기 버튼은 아이콘뿐이라 라벨이 없으면 보조기술이 무슨 동작인지 알 수 없다 → 항상 짝으로 받는다
  | { actionLabel: string; onAction: () => void }
  | { actionLabel?: undefined; onAction?: undefined }

export function Toast(props: {
  message: string
  tone?: ToastTone
  onDismiss: () => void
  duration?: number
} & ToastAction) {
  const duration = props.duration ?? 5000
  const [visible, setVisible] = useState(false) // enter/exit 슬라이드
  const [deplete, setDeplete] = useState(false) // 링 게이지 감소 트리거
  const dismissRef = useRef(props.onDismiss)
  dismissRef.current = props.onDismiss
  const closedRef = useRef(false)
  const closeTimerRef = useRef<number | undefined>(undefined)
  const boxRef = useRef<HTMLDivElement>(null)

  const close = () => {
    if (closedRef.current) return
    closedRef.current = true
    setVisible(false)
    closeTimerRef.current = window.setTimeout(() => dismissRef.current(), 220) // 내려가는 애니 후 언마운트
  }

  const handleUndo = () => {
    if (closedRef.current) return // 연속 클릭 시 이중 복원 방지
    props.onAction?.()
    close()
  }

  // 팝오버를 지원하지 않는 브라우저에서는 속성이 무시되어 보통 자리에 그대로 그려진다
  useEffect(() => {
    const box = boxRef.current
    if (box === null || typeof box.showPopover !== 'function') return
    box.showPopover()
    return () => {
      if (box.isConnected && box.matches(':popover-open')) box.hidePopover()
    }
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setVisible(true)
      setDeplete(true)
    })
    const t = window.setTimeout(close, duration)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current) // 이전 토스트의 지연 dismiss가 새 토스트를 닫는 것 방지
    }
    // 의존성은 duration 만 둔다 — onClose 가 바뀔 때마다 타이머를 다시 걸면 토스트가 안 닫힌다
  }, [duration])

  const R = 15
  const C = 2 * Math.PI * R // 링 둘레
  const tone = props.tone ?? 'info'
  // 실패는 눈에 띄어야 하고, 성공·안내는 지도 위에서 과하지 않게 기본 톤을 쓴다
  const toneRing = tone === 'error' ? 'border-danger-edge' : tone === 'success' ? 'border-teal-edge' : 'border-line-pill'

  return (
    <div
      ref={boxRef}
      popover="manual"
      role="status"
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      /* top-auto·right-auto·m-0 은 팝오버 기본 배치(inset 0 + margin auto)를 덮어 하단 중앙에 세우기 위한 것 */
      className={`fixed inset-auto bottom-6 left-1/2 z-50 m-0 flex max-w-[90vw] items-center gap-2 overflow-visible rounded-pill border bg-pill py-2 pl-4 pr-2 text-[12.5px] text-ink shadow-pill ${toneRing}`}
      style={{
        transform: `translateX(-50%) translateY(${visible ? '0px' : '24px'})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 220ms cubic-bezier(0.34, 1.4, 0.5, 1), opacity 220ms ease',
      }}
    >
      <span>{props.message}</span>
      {!props.onAction ? (
        <button
          type="button"
          onClick={close}
          aria-label="알림 닫기"
          title="닫기"
          // 닫기 X 는 앱 전역 관례대로 호버에서 빨강
          className="flex size-9 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-danger-wash hover:text-danger"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      ) : (
      <button
        type="button"
        onClick={handleUndo}
        aria-label={props.actionLabel}
        title={props.actionLabel}
        className="relative flex size-9 items-center justify-center rounded-full text-teal-text transition-colors hover:bg-hover"
      >
        {/* 링 게이지 (카운트다운) */}
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r={R} fill="none" className="stroke-track" strokeWidth="2.5" />
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
      )}
    </div>
  )
}
