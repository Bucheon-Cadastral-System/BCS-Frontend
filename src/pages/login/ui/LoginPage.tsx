import { BrandLockup } from '@/shared/ui/BrandLockup'
import { BTN_SECONDARY, MODAL_SHELL } from '@/shared/ui/classes'

interface LoginPageProps {
  onKakaoLogin: () => void
  onGuest: () => void
  /** 앞선 로그인 시도가 왜 끊겼는지 — 처음 들어온 화면이면 null */
  failure?: string | null
}

export function LoginPage({ onKakaoLogin, onGuest, failure = null }: LoginPageProps) {
  return (
    <main className="app-bg flex h-full flex-col overflow-y-auto px-5 py-12 text-ink">
      <section
        className={`panel-in my-auto w-full max-w-[440px] shrink-0 self-center px-6 py-10 text-center sm:px-12 ${MODAL_SHELL}`}
        aria-labelledby="login-title"
      >
        {/* 아래 제목이 같은 문구를 쓰므로 심볼+BCS만 노출 */}
        <BrandLockup size="lg" variant="mark" className="mx-auto mb-9 w-fit" />

        <div>
          <h1 className="text-[24px] font-semibold leading-snug tracking-[-.02em] text-ink" id="login-title">부천시 지적기준점 관리 시스템</h1>
          <p className="mt-4 text-[13px] leading-7 text-ink-3">
            안전한 서비스 이용을 위해
            <br />
            카카오 계정으로 로그인해 주세요.
          </p>
        </div>

        {failure !== null && (
          <p role="alert" className="mt-8 rounded-pop border border-danger-btn-edge bg-danger-wash px-4 py-3 text-[12.5px] leading-[1.6] text-danger">
            {failure}
          </p>
        )}

        <div className="mt-8 grid gap-3">
          <button type="button" className="relative h-[46px] w-full rounded-ctl bg-[#fee500] text-[13px] font-semibold text-black/85 transition-colors hover:bg-[#ffec4a]" onClick={onKakaoLogin}>
            <span className="absolute top-1/2 left-5 size-6 -translate-y-1/2" aria-hidden="true">
              <svg className="size-full fill-[#191919]" viewBox="0 0 24 24" role="img">
                <path d="M12 3C6.48 3 2 6.5 2 10.82c0 2.76 1.83 5.18 4.59 6.57l-1.17 4.3a.47.47 0 0 0 .72.5l5.1-3.36c.25.02.5.03.76.03 5.52 0 10-3.5 10-7.82S17.52 3 12 3Z" />
              </svg>
            </span>
            카카오로 로그인
          </button>
          {/* 위 카카오 버튼은 브랜드 색·높이를 지켜야 해서 전용 스타일이다. 이쪽은 공용 보조 버튼에 높이만 맞춘다 */}
          <button type="button" className={`${BTN_SECONDARY} h-[46px] w-full`} onClick={onGuest}>
            게스트로 보기
          </button>
        </div>

        <p className="mt-7 text-[11px] leading-6 text-ink-3">
          게스트는 공개 기준점의 기본 정보만 확인할 수 있습니다.
          <br />
          최초 로그인 시 회원가입 신청 화면으로 이동합니다.
        </p>
      </section>

      <footer className="shrink-0 pt-10 text-center text-[11px] leading-5 text-ink-3">
        본 서비스는 부천시가 제작·운영하는 공식 서비스가 아닌 비영리 업무지원 도구입니다.
      </footer>
    </main>
  )
}
