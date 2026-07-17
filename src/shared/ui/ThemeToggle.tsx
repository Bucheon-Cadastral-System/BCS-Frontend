interface ThemeToggleProps {
  dark: boolean
  onToggle: () => void
}

function Sun({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  )
}

function Moon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

/** 라이트/다크 토글 스위치 (해↔달 크로스페이드 + 노브 슬라이드) */
export function ThemeToggle({ dark, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={dark}
      aria-label="라이트/다크 전환"
      className={`relative h-8 w-[62px] shrink-0 rounded-full border transition-colors duration-300 ${
        dark ? 'border-slate-500 bg-slate-700' : 'border-gray-300 bg-gray-100'
      }`}
    >
      <Sun className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-amber-400/50" />
      <Moon className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-indigo-300/50" />
      <span
        className={`absolute left-0 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full shadow transition-transform duration-300 ${
          dark ? 'translate-x-[32px] bg-slate-200' : 'translate-x-1 bg-white'
        }`}
      >
        <Sun className={`absolute h-3.5 w-3.5 text-amber-500 transition-opacity duration-300 ${dark ? 'opacity-0' : 'opacity-100'}`} />
        <Moon className={`absolute h-3.5 w-3.5 text-indigo-500 transition-opacity duration-300 ${dark ? 'opacity-100' : 'opacity-0'}`} />
      </span>
    </button>
  )
}
