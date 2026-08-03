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

type AuthState = { loading: boolean; profile: UserProfile | null }

function LoadingPage() {
  return <main className="grid min-h-full place-items-center bg-slate-100 text-sm font-semibold text-slate-500">로그인 상태를 확인하고 있습니다…</main>
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
    ? <main className="grid min-h-full place-items-center bg-slate-100"><div className="rounded-2xl bg-white p-8 text-center"><p className="text-rose-700">{error}</p><button className="mt-4 font-bold text-teal-700" onClick={() => navigate('/login')}>로그인으로 돌아가기</button></div></main>
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
  if (error) {
    return <main className="grid min-h-full place-items-center bg-slate-100"><div className="rounded-2xl bg-white p-8 text-center"><p className="text-rose-700">{error}</p><button className="mt-4 font-bold text-teal-700" onClick={() => navigate('/login')}>로그인으로 돌아가기</button></div></main>
  }
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

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/oauth/success" element={<OAuthSuccessRoute reloadProfile={reloadProfile} />} />
      <Route path="/signup" element={<SignupRoute />} />
      <Route path="/register" element={<Navigate to="/signup" replace />} />
      <Route path="/waiting" element={<WaitingPage onBackToLogin={() => navigate('/login')} />} />
      <Route path="/" element={<Protected auth={auth}><MapPage role={auth.profile?.role ?? 'USER'} onOpenUserManagement={() => navigate('/admin/users')} /></Protected>} />
      <Route path="/admin/users" element={<Protected auth={auth} admin><AdminUsersPage onBack={() => navigate('/')} /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>
}
