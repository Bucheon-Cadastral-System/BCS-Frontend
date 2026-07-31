/** 브랜드 컬러 — 심볼의 기준점(앰버)은 배경 톤과 무관하게 고정한다. */
const AMBER = '#E0A020'
const NAVY = '#1D3A6B'

const SIZES = {
  sm: { mark: 'h-8 w-8', title: 'text-[17px]', rule: 'h-7', name: 'text-[12px]', caption: 'text-[9px] tracking-[0.14em]', gap: 'gap-2.5' },
  md: { mark: 'h-10 w-10', title: 'text-[21px]', rule: 'h-9', name: 'text-[14px]', caption: 'text-[10px] tracking-[0.16em]', gap: 'gap-3' },
  lg: { mark: 'h-14 w-14', title: 'text-[28px]', rule: 'h-12', name: 'text-[17px]', caption: 'text-[11px] tracking-[0.18em]', gap: 'gap-4' },
} as const

/**
 * 브랜드 락업 — 심볼만 SVG로 그리고 글자는 실제 텍스트로 둔다.
 * (배포된 로고 SVG는 Public Sans·Pretendard를 전제로 글자를 그려 두어, 폰트가 없는 환경에서 형태가 무너진다.)
 * onDark = 어두운 배경(헤더), onLight = 밝은 배경(로그인·가입).
 */
export function BrandLockup({
  size = 'sm',
  tone = 'onDark',
  variant = 'full',
  className = '',
}: {
  size?: keyof typeof SIZES
  tone?: 'onDark' | 'onLight'
  /** mark = 심볼 + BCS만. 화면에 같은 설명 문구가 따로 있을 때 중복을 피한다. */
  variant?: 'full' | 'mark'
  className?: string
}) {
  const s = SIZES[size]
  const onDark = tone === 'onDark'

  return (
    <div
      className={`flex items-center ${s.gap} ${className}`}
      style={{ color: onDark ? '#FFFFFF' : NAVY }}
    >
      {/* 지적 격자 + 기준점(앰버) 심볼 */}
      <svg viewBox="5 5 54 54" className={`${s.mark} shrink-0`} aria-hidden="true">
        <rect x="7" y="7" width="50" height="50" rx="9" fill="none" stroke="currentColor" strokeWidth="3.4" />
        <line x1="30" y1="7" x2="30" y2="57" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <line x1="30" y1="34" x2="57" y2="34" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <line x1="7" y1="22" x2="30" y2="22" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <circle cx="30" cy="34" r="5" fill={AMBER} />
        <circle cx="30" cy="22" r="2.4" fill="currentColor" />
      </svg>

      <span className={`${s.title} font-extrabold leading-none tracking-tight`}>BCS</span>

      {variant === 'full' && (
        <>
          <span className={`${s.rule} w-px shrink-0 ${onDark ? 'bg-white/25' : 'bg-[#1D3A6B]/20'}`} aria-hidden="true" />
          <span className="leading-tight">
            <span className={`block ${s.name} font-semibold`}>부천시 지적기준점 관리</span>
            <span
              className={`block ${s.caption} font-semibold`}
              style={{ color: onDark ? '#A9B6CC' : '#5B6B87' }}
            >
              BUCHEON CADASTRAL SYSTEM
            </span>
          </span>
        </>
      )}
    </div>
  )
}
