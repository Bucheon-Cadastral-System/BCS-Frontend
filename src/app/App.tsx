import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import 'ol/ol.css'
import './App.css'
import { AdminUsersPage } from '@/pages/admin-users'
import { completeRegistration, getMemberState, getMyProfile, type UserProfile } from '@/entities/user'
import { RegistrationPage } from '@/pages/registration'
import { LoginPage } from '@/pages/login'
import { InactivePage } from '@/pages/inactive'
import { MapPage } from '@/pages/map'
import { WaitingPage } from '@/pages/waiting'
import { exchangeOAuthCode, refreshAccessToken, startKakaoLogin } from '@/shared/api/auth'
import { subscribeAuthenticationLost } from '@/shared/api/tokenStore'
import { BTN_SECONDARY, MODAL_SHELL } from '@/shared/ui/classes'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'

type AuthState = { loading: boolean; profile: UserProfile | null }

function LoadingPage() {
  return <main className="app-bg grid h-full place-items-center text-[13px] font-semibold text-ink-3">로그인 상태를 확인하고 있습니다…</main>
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

function LoginRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const isInactive = new URLSearchParams(location.search).get('error') === 'inactive'

  return isInactive
    ? <InactivePage onBackToLogin={() => navigate('/login', { replace: true })} />
    : <LoginPage onKakaoLogin={startKakaoLogin} />
}

function Protected({ auth, admin = false, children }: { auth: AuthState; admin?: boolean; children: ReactNode }) {
  if (auth.loading) return <LoadingPage />
  if (!auth.profile) return <Navigate to="/login" replace />
  if (auth.profile.status === 'PENDING') return <Navigate to="/signup" replace />
  if (auth.profile.status === 'INACTIVE') return <Navigate to="/login?error=inactive" replace />
  if (admin && auth.profile.role !== 'ADMIN') return <Navigate to="/" replace />
  return children
}

function OAuthSuccessRoute({ reloadProfile }: { reloadProfile: () => Promise<UserProfile | null> }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('code')
    if (!code) { setError('로그인 코드가 없습니다.'); return }
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
      .catch((e) => setError(e instanceof Error ? e.message : '가입 상태를 확인하지 못했습니다.'))
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
  const [auth, setAuth] = useState<AuthState>({ loading: true, profile: null })

  const reloadProfile = useCallback(async () => {
    try {
      const profile = await getMyProfile()
      setAuth({ loading: false, profile })
      return profile
    } catch {
      setAuth({ loading: false, profile: null })
      return null
    }
  }, [])

  useEffect(() => {
    refreshAccessToken().then((token) => token ? reloadProfile() : (setAuth({ loading: false, profile: null }), null))
  }, [reloadProfile])

  useEffect(() => subscribeAuthenticationLost(() => {
    setAuth({ loading: false, profile: null })
  }), [])

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
