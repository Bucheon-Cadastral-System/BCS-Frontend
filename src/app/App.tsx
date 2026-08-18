import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import 'ol/ol.css'
import './App.css'
import { AdminUsersPage } from '@/pages/admin-users'
import { completeRegistration, getMemberState, getMyProfile, type UserProfile } from '@/entities/user'
import { RegistrationPage } from '@/pages/registration'
import { LoginPage } from '@/pages/login'
import { InactivePage } from '@/pages/inactive'
import { MapPage } from '@/pages/map'
import { GuestMapPage } from '@/pages/guest-map'
import { clearChatStorage } from '@/widgets/chatbot'
import { WaitingPage } from '@/pages/waiting'
import { exchangeOAuthCode, refreshAccessToken, startKakaoLogin } from '@/shared/api/auth'
import { subscribeAuthenticationLost, subscribeAuthorizationForbidden } from '@/shared/api/tokenStore'
import { BTN_SECONDARY, MODAL_SHELL } from '@/shared/ui/classes'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { Spinner } from '@/shared/ui/Spinner'

type AuthState = { loading: boolean; profile: UserProfile | null }

/** 전역 권한 오류 화면은 인증이 필요한 최상위 화면에서만 사용한다. */
function supportsFullPageForbidden(pathname: string) {
  return pathname === '/' || pathname === '/admin' || pathname.startsWith('/admin/')
}

function LoadingPage() {
  return (
    <main className="app-bg grid h-full place-items-center">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-3">
        <Spinner className="size-4" />
        로그인 상태를 확인하는 중
      </div>
    </main>
  )
}

/** 로그인 길목에서 막혔을 때 — 이 화면들은 다른 화면과 같은 껍데기를 쓴다 */
function AuthErrorPage({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <main className="app-bg grid h-full place-items-center px-5 text-ink">
      <div className={`panel-in w-full max-w-[400px] px-7 py-9 text-center ${MODAL_SHELL}`}>
        <p className="text-[13px] leading-7 text-danger">{message}</p>
        <button type="button" className={`${BTN_SECONDARY} mt-6 w-full`} onClick={onBack}>
          로그인으로 돌아가기
        </button>
      </div>
    </main>
  )
}

function PermissionDeniedPage({ onBack }: { onBack: () => void }) {
  return (
    <main className="app-bg grid h-full place-items-center px-5 text-ink">
      <div className={`panel-in w-full max-w-[400px] px-7 py-9 text-center ${MODAL_SHELL}`}>
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-danger-wash text-[20px] font-bold text-danger" aria-hidden="true">!</div>
        <h1 className="mt-5 text-[18px] font-semibold">접근 권한이 없습니다</h1>
        <p className="mt-3 text-[13px] leading-7 text-ink-3">현재 계정으로는 이 기능을 사용할 수 없습니다.</p>
        <button type="button" className={`${BTN_SECONDARY} mt-6 w-full`} onClick={onBack}>이전 화면으로 돌아가기</button>
      </div>
    </main>
  )
}

/**
 * 로그인이 끊긴 사유 — 서버가 `/login?error=...` 로 되돌려보낼 때 싣는 코드다.
 *
 * <p>사유를 안 보이면 사용자는 버튼만 다시 누른다. 다시 눌러서 될 일인지 아닌지가 갈리므로
 * 그 갈래를 문구로 말해 준다. 모르는 코드는 코드 자체를 보여 주지 않는다 — 사람에게 뜻이 없다.
 */
const LOGIN_FAILURE: Record<string, string> = {
  oauth2_user_info_invalid: '카카오에서 받은 계정 정보가 올바르지 않습니다. 카카오 계정의 이메일 제공 동의를 확인한 뒤 다시 시도해 주세요.',
  oauth2_provider_unsupported: '지원하지 않는 로그인 방식입니다. 카카오로 로그인해 주세요.',
  oauth2_principal_invalid: '로그인 정보를 확인하지 못했습니다. 다시 시도해 주세요.',
  oauth2_authentication_failed: '로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',
}

function LoginRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const error = new URLSearchParams(location.search).get('error')

  if (error === 'inactive') return <InactivePage onBackToLogin={() => navigate('/login', { replace: true })} />
  return (
    <LoginPage
      onKakaoLogin={startKakaoLogin}
      onGuest={() => navigate('/guest')}
      failure={error === null ? null : (LOGIN_FAILURE[error] ?? '로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.')}
    />
  )
}

function Protected({ auth, admin = false, children }: { auth: AuthState; admin?: boolean; children: ReactNode }) {
  const navigate = useNavigate()
  if (auth.loading) return <LoadingPage />
  if (!auth.profile) return <Navigate to="/login" replace />
  if (auth.profile.status === 'PENDING') return <Navigate to="/signup" replace />
  if (auth.profile.status === 'INACTIVE') return <Navigate to="/login?error=inactive" replace />
  if (admin && auth.profile.role !== 'ADMIN') return <PermissionDeniedPage onBack={() => navigate('/', { replace: true })} />
  return children
}

function OAuthSuccessRoute({ reloadProfile }: { reloadProfile: () => Promise<UserProfile | null> }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('code')
    if (!code) { setError('로그인을 완료하지 못했습니다. 다시 시도해 주세요.'); return }
    exchangeOAuthCode(code)
      .then(async () => {
        const [profile, memberState] = await Promise.all([reloadProfile(), getMemberState()])
        const status = memberState.status ?? profile?.status

        if (status === 'INACTIVE') navigate('/login?error=inactive', { replace: true })
        else if (!memberState.profileCompleted) navigate('/signup', { replace: true })
        else if (status === 'PENDING') navigate('/waiting', { replace: true })
        else navigate('/', { replace: true })
      })
      .catch((e) => setError(e instanceof Error ? e.message : '로그인을 완료하지 못했습니다.'))
  }, [location.search, navigate, reloadProfile])
  return error
    ? <AuthErrorPage message={error} onBack={() => navigate('/login')} />
    : <LoadingPage />
}

function SignupRoute() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMemberState()
      .then((state) => {
        if (state.profileCompleted) navigate('/waiting', { replace: true })
        else setShowForm(true)
      })
      .catch((e) => setError(e instanceof Error ? e.message : '가입 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setChecking(false))
  }, [navigate])

  if (checking) return <LoadingPage />
  if (error) return <AuthErrorPage message={error} onBack={() => navigate('/login')} />
  if (!showForm) return <LoadingPage />

  return (
    <RegistrationPage
      onCancel={() => navigate('/login')}
      onSubmit={async (data) => {
        await completeRegistration(data)
        navigate('/waiting', { replace: true })
      }}
    />
  )
}

function AppRoutes() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [auth, setAuth] = useState<AuthState>({ loading: true, profile: null })
  const [forbidden, setForbidden] = useState(false)

  /**
   * 로그인한 계정이 바뀌면 그 계정에 딸린 것을 모두 버린다.
   *
   * 받아 둔 응답(대화 이력·회원 목록)이 캐시에 남아 있으면 계정을 바꾼 뒤 앞 계정의 값이 새 화면에
   * 그대로 복원된다. 브라우저에 담아 둔 챗봇 창 배치도 그 사람의 작업 방식이라 함께 지운다.
   * 화면마다 열쇠에 계정을 섞는 대신 경계에서 한 번 비운다.
   */
  const accountRef = useRef<string | null | undefined>(undefined) // undefined = 아직 로그인 상태를 모른다

  /*
   * 로그인 상태가 바뀌는 자리는 여기 하나뿐이고, 비우기는 setAuth 보다 먼저 일어난다.
   *
   * 렌더 중에 비우면 안 된다 — React 가 그 렌더를 버릴 수 있고, 그때 accountRef 만 새 계정으로 남으면
   * 다음 렌더에서 조건이 거짓이 되어 앞 계정의 캐시가 그대로 살아난다.
   * 그렇다고 효과로 미루면 아래 화면들이 이미 한 번 그려진 뒤에 돌아서 그 첫 그림이 앞 계정의 값을 읽는다
   * (회원 목록·대화 이력 열쇠에 계정이 섞여 있지 않다).
   * 상태를 바꾸기 직전에 비우면 둘 다 피한다. 비우기는 동기라 setAuth 가 부르는 렌더는 이미 빈 캐시를 본다.
   */
  const applyAuth = useCallback((profile: UserProfile | null) => {
    const accountId = profile?.id ?? null
    if (accountRef.current !== undefined && accountRef.current !== accountId) {
      queryClient.clear()
      clearChatStorage()
    }
    accountRef.current = accountId
    setAuth({ loading: false, profile })
  }, [queryClient])

  const reloadProfile = useCallback(async () => {
    try {
      const profile = await getMyProfile()
      applyAuth(profile)
      return profile
    } catch {
      applyAuth(null)
      return null
    }
  }, [applyAuth])

  useEffect(() => {
    // 공개 경로로 처음 들어오면 인증 갱신조차 요청하지 않는다.
    if (location.pathname === '/guest') {
      applyAuth(null)
      return
    }
    // 게스트에서 로그인 화면으로 이동하는 것만으로 세션을 되살리지 않는다. 실제 로그인 성공이 인증을 연다.
    if (accountRef.current !== undefined) return
    refreshAccessToken().then((token) => token ? reloadProfile() : (applyAuth(null), null))
  }, [applyAuth, location.pathname, reloadProfile])

  useEffect(() => {
    if (location.pathname === '/guest') applyAuth(null)
  }, [applyAuth, location.pathname])

  useEffect(() => subscribeAuthenticationLost(() => {
    applyAuth(null)
    navigate('/guest?notice=authentication-required', { replace: true })
  }), [applyAuth, navigate])

  useEffect(() => subscribeAuthorizationForbidden(() => {
    if (supportsFullPageForbidden(location.pathname)) setForbidden(true)
  }), [location.pathname])

  // 권한 오류가 발생한 화면을 떠나면 새 경로가 정상적으로 렌더되게 한다.
  useEffect(() => setForbidden(false), [location.pathname])

  if (forbidden && supportsFullPageForbidden(location.pathname)) {
    return (
      <PermissionDeniedPage
        onBack={() => {
          setForbidden(false)
          if (location.pathname.startsWith('/admin')) navigate('/', { replace: true })
        }}
      />
    )
  }

  // 울타리는 라우터 안쪽·화면 바깥쪽에 둔다. 바깥에 두면 화면이 죽었을 때 주소를 옮길 길까지 함께 사라지고,
  // 로그인 상태는 이 위에 있어 화면을 옮겨도 다시 받아오지 않는다.
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/oauth/success" element={<OAuthSuccessRoute reloadProfile={reloadProfile} />} />
        <Route path="/signup" element={<SignupRoute />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />
        <Route path="/waiting" element={<WaitingPage onBackToLogin={() => navigate('/login')} />} />
        <Route path="/guest" element={<GuestMapPage />} />
        <Route path="/" element={<Protected auth={auth}><MapPage profile={auth.profile} onOpenUserManagement={() => navigate('/admin/users')} /></Protected>} />
        <Route path="/admin/users" element={<Protected auth={auth} admin><AdminUsersPage profile={auth.profile} onBack={() => navigate('/')} /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>
}
