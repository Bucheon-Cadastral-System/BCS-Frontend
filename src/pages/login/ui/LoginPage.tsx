import { BrandLockup } from '@/shared/ui/BrandLockup'

interface LoginPageProps {
  onKakaoLogin: () => void
  onDevelopmentAccess: () => void
}

export function LoginPage({ onKakaoLogin, onDevelopmentAccess }: LoginPageProps) {
  return (
    <main className="app-bg relative grid min-h-full place-items-center px-5 pb-20 pt-12 text-ink">
      <section
        className="panel-in relative z-10 w-full max-w-[440px] rounded-pill border border-line bg-panel-strong px-6 py-10 text-center shadow-modal backdrop-blur-[14px] sm:px-12"
        aria-labelledby="login-title"
      >
        {/* 아래 제목이 같은 문구를 쓰므로 심볼+BCS만 노출 */}
        <BrandLockup size="lg" tone="onDark" variant="mark" className="mx-auto mb-9 w-fit" />

        <div>
          <h1 className="text-[24px] font-semibold leading-snug tracking-[-.02em] text-ink" id="login-title">부천시 지적기준점 관리 시스템</h1>
          <p className="mt-4 text-[13px] leading-7 text-ink-3">
            안전한 서비스 이용을 위해
            <br />
            카카오 계정으로 로그인해 주세요.
          </p>
        </div>

        <div className="mt-8 grid gap-3">
          <button type="button" className="relative h-[46px] w-full rounded-ctl bg-[#fee500] text-[13px] font-semibold text-black/85 transition-colors hover:bg-[#ffec4a]" onClick={onKakaoLogin}>
            <span className="absolute top-1/2 left-5 size-6 -translate-y-1/2" aria-hidden="true">
              <svg className="size-full fill-[#191919]" viewBox="0 0 24 24" role="img">
                <path d="M12 3C6.48 3 2 6.5 2 10.82c0 2.76 1.83 5.18 4.59 6.57l-1.17 4.3a.47.47 0 0 0 .72.5l5.1-3.36c.25.02.5.03.76.03 5.52 0 10-3.5 10-7.82S17.52 3 12 3Z" />
              </svg>
            </span>
            카카오로 로그인
          </button>

          <button type="button" className="h-[46px] w-full rounded-ctl border-[1.5px] border-line-btn text-[13px] font-semibold text-ink-2 transition-colors hover:bg-hover" onClick={onDevelopmentAccess}>
            로그인 없이 둘러보기 <span className="text-[11px] font-normal text-ink-4">(개발용)</span>
          </button>
        </div>

        <p className="mt-7 text-[11px] leading-6 text-ink-4">
          승인된 사용자만 서비스를 이용할 수 있습니다.
          <br />
          최초 로그인 시 회원가입 신청 화면으로 이동합니다.
        </p>
      </section>

      <footer className="absolute bottom-5 z-10 w-full px-5 text-center text-[11px] leading-5 text-ink-4">
        <p>본 서비스는 부천시가 제작·운영하는 공식 서비스가 아닌 비영리 업무지원 도구입니다.</p>
        <p>
          통합도시브랜드 출처:{' '}
          <a className="underline hover:text-teal-text"
            href="https://www.bucheon.go.kr/site/homepage/menu/viewMenu?menuid=148009002001"
            target="_blank"
            rel="noreferrer"
          >
            부천시청
          </a>
        </p>
      </footer>
    </main>
  )
}
