import { ThemeIcon } from './ThemeIcon'

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
      <ThemeIcon dark={props.dark} className="size-[14px]" />
    </button>
  )
}
