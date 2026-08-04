import { BrandMark } from './BrandMark'

const SIZES = {
  sm: { mark: 'size-8', title: 'text-[17px]', rule: 'h-7', name: 'text-[12px]', caption: 'text-[9px] tracking-[0.14em]', gap: 'gap-2.5' },
  md: { mark: 'size-10', title: 'text-[21px]', rule: 'h-9', name: 'text-[14px]', caption: 'text-[11px] tracking-[0.16em]', gap: 'gap-3' },
  lg: { mark: 'size-14', title: 'text-[28px]', rule: 'h-12', name: 'text-[17px]', caption: 'text-[11px] tracking-[0.18em]', gap: 'gap-4' },
} as const

/**
 * 브랜드 락업 — 심볼만 그림으로 그리고 글자는 실제 텍스트로 둔다.
 * (배포용 로고 파일은 글자를 그림으로 그려 두어, 그 글꼴이 없는 환경에서 형태가 무너진다.)
 * 색은 화면 토큰을 따르므로 밝은 화면·어두운 화면을 가리지 않는다.
 */
export function BrandLockup({
  size = 'sm',
  variant = 'full',
  className = '',
}: {
  size?: keyof typeof SIZES
  /** mark = 심볼 + BCS만. 화면에 같은 설명 문구가 따로 있을 때 중복을 피한다. */
  variant?: 'full' | 'mark'
  className?: string
}) {
  const s = SIZES[size]

  return (
    <div className={`flex items-center text-ink ${s.gap} ${className}`}>
      <BrandMark className={s.mark} />

      {/* 굵기는 400·500·600·700 만 담아 둔다 — 없는 굵기를 쓰면 브라우저가 흉내 내 글자가 뭉개진다 */}
      <span className={`${s.title} font-bold leading-none tracking-tight`}>BCS</span>

      {variant === 'full' && (
        <>
          <span className={`${s.rule} w-px shrink-0 bg-line-field`} aria-hidden="true" />
          <span className="leading-tight">
            <span className={`block ${s.name} font-semibold`}>부천시 지적기준점 관리 시스템</span>
            <span className={`block ${s.caption} font-semibold text-ink-4`}>BUCHEON CADASTRAL SYSTEM</span>
          </span>
        </>
      )}
    </div>
  )
}
