interface LoginPageProps {
  onKakaoLogin: () => void
  onDevelopmentAccess: () => void
}

export function LoginPage({ onKakaoLogin, onDevelopmentAccess }: LoginPageProps) {
  return (
    <main className="login">
      <div className="login__decor login__decor--top" aria-hidden="true" />
      <div className="login__decor login__decor--bottom" aria-hidden="true" />

      <section className="login__card" aria-labelledby="login-title">
        <img className="login__logo" src="/logo.png" alt="부천시" />

        <div className="login__heading">
          <h1 id="login-title">부천시 지적기준점 관리 서비스</h1>
          <p>
            안전한 서비스 이용을 위해
            <br />
            카카오 계정으로 로그인해 주세요.
          </p>
        </div>

        <div className="login__actions">
          <button type="button" className="login__kakao" onClick={onKakaoLogin}>
            <span className="login__kakao-symbol" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path d="M12 3C6.48 3 2 6.5 2 10.82c0 2.76 1.83 5.18 4.59 6.57l-1.17 4.3a.47.47 0 0 0 .72.5l5.1-3.36c.25.02.5.03.76.03 5.52 0 10-3.5 10-7.82S17.52 3 12 3Z" />
              </svg>
            </span>
            카카오로 로그인
          </button>

          <button type="button" className="login__development" onClick={onDevelopmentAccess}>
            로그인 없이 둘러보기 <span>(개발용)</span>
          </button>
        </div>

        <p className="login__notice">
          승인된 사용자만 서비스를 이용할 수 있습니다.
          <br />
          최초 로그인 시 회원가입 신청 화면으로 이동합니다.
        </p>
      </section>

      <footer className="login__footer">
        <p>본 서비스는 부천시가 제작·운영하는 공식 서비스가 아닌 비영리 업무지원 도구입니다.</p>
        <p>
          통합도시브랜드 출처:{' '}
          <a
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
