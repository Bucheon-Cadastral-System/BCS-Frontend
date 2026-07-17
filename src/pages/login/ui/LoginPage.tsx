interface LoginPageProps {
  onKakaoLogin: () => void
  onDevelopmentAccess: () => void
}

export function LoginPage({ onKakaoLogin, onDevelopmentAccess }: LoginPageProps) {
  return (
    <main className="relative grid min-h-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(42,183,159,0.14),transparent_35%),linear-gradient(145deg,#f7fafc_0%,#edf4f7_52%,#e7eff4_100%)] px-5 pt-12 pb-20">
      <div className="absolute -top-72 -right-20 size-[420px] rotate-28 rounded-[42%] border border-[#15437d14]" aria-hidden="true" />
      <div className="absolute -bottom-80 -left-24 size-[420px] rotate-28 rounded-[42%] border border-[#15437d14]" aria-hidden="true" />

      <section className="relative z-10 w-full max-w-[440px] rounded-3xl border border-white/90 bg-white/94 px-6 py-10 text-center shadow-[0_24px_70px_rgba(20,47,78,0.14)] backdrop-blur-xl sm:px-12" aria-labelledby="login-title">
        <img className="mx-auto mb-9 block h-auto w-full max-w-[230px]" src="/logo.png" alt="부천시" />

        <div className="text-slate-900">
          <h1 className="text-2xl leading-snug font-bold tracking-[-0.04em]" id="login-title">부천시 지적기준점 관리 서비스</h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            안전한 서비스 이용을 위해
            <br />
            카카오 계정으로 로그인해 주세요.
          </p>
        </div>

        <div className="mt-8 grid gap-3">
          <button type="button" className="relative min-h-13 w-full rounded-xl bg-[#fee500] font-bold text-black/85 transition hover:-translate-y-0.5 hover:shadow-lg" onClick={onKakaoLogin}>
            <span className="absolute top-1/2 left-5 size-6 -translate-y-1/2" aria-hidden="true">
              <svg className="size-full fill-[#191919]" viewBox="0 0 24 24" role="img">
                <path d="M12 3C6.48 3 2 6.5 2 10.82c0 2.76 1.83 5.18 4.59 6.57l-1.17 4.3a.47.47 0 0 0 .72.5l5.1-3.36c.25.02.5.03.76.03 5.52 0 10-3.5 10-7.82S17.52 3 12 3Z" />
              </svg>
            </span>
            카카오로 로그인
          </button>

          <button type="button" className="min-h-13 w-full rounded-xl border border-slate-200 bg-white font-bold text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-lg" onClick={onDevelopmentAccess}>
            로그인 없이 둘러보기 <span className="text-xs font-semibold text-slate-400">(개발용)</span>
          </button>
        </div>

        <p className="mt-7 text-xs leading-6 text-slate-400">
          승인된 사용자만 서비스를 이용할 수 있습니다.
          <br />
          최초 로그인 시 회원가입 신청 화면으로 이동합니다.
        </p>
      </section>

      <footer className="absolute bottom-5 z-10 w-full px-5 text-center text-[11px] leading-5 text-slate-400">
        <p>본 서비스는 부천시가 제작·운영하는 공식 서비스가 아닌 비영리 업무지원 도구입니다.</p>
        <p>
          통합도시브랜드 출처:{' '}
          <a className="underline hover:text-slate-600"
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
