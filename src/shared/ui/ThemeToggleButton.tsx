/**
 * 배경 밝기 — 지도에 무엇을 얹는 값이 아니라 화면 자체의 값이라 아래 독에 두지 않고 로고 아래에 작게 둔다.
 * 그 자리는 화면마다 판이 서는 높이가 달라 부르는 쪽이 정한다.
 */
export function ThemeToggleButton(props: { dark: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={props.onToggle}
      aria-pressed={props.dark}
      title="배경 밝기"
      aria-label="배경 밝기"
      className={`flex size-[30px] items-center justify-center rounded-full border border-line-pill bg-pill text-ink-2 shadow-pill ${props.className ?? ''}`}
    >
      {props.dark ? (
        <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  )
}
