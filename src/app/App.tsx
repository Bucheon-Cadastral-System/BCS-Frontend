import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import 'ol/ol.css'
import './App.css'
import { AdminUsersPage } from '@/pages/admin-users'
import { MOCK_USERS } from '@/entities/user'
import type { ManagedUser, UserRole } from '@/entities/user'
import { RegistrationPage } from '@/pages/registration'
import { LoginPage } from '@/pages/login'
import { MapPage } from '@/pages/map'
import { WaitingPage } from '@/pages/waiting'

const DEVELOPMENT_ROLE: UserRole = 'ADMIN'


function LoginRoute() {
  const navigate = useNavigate()
  return (
    <LoginPage
      onKakaoLogin={() => navigate('/register')}
      onDevelopmentAccess={() => navigate('/')}
    />
  )
}

function RegisterRoute() {
  const navigate = useNavigate()
  return (
    <RegistrationPage
      kakaoId="development-kakao-id"
      onCancel={() => navigate('/login')}
      // 백엔드 연동 전이라 신청 내용은 아직 보내지 않는다. 이름·연락처가 담긴 값이라 콘솔에도 남기지 않는다.
      onSubmit={() => navigate('/waiting')}
    />
  )
}

function WaitingRoute() {
  const navigate = useNavigate()
  return <WaitingPage onBackToLogin={() => navigate('/login')} />
}

function MapRoute() {
  const navigate = useNavigate()
  return <MapPage role={DEVELOPMENT_ROLE} onOpenUserManagement={() => navigate('/admin/users')} />
}

function AdminUsersRoute(props: { users: ManagedUser[]; onChangeUsers: (users: ManagedUser[]) => void }) {
  const navigate = useNavigate()
  return <AdminUsersPage users={props.users} onChangeUsers={props.onChangeUsers} onBack={() => navigate('/')} />
}

export default function App() {
  // 사용자 목록은 아직 백엔드 연동 전이라 앱 상태로 들고 있는다(라우트 이동 간 유지 목적).
  const [users, setUsers] = useState<ManagedUser[]>(MOCK_USERS)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route path="/waiting" element={<WaitingRoute />} />
        <Route path="/admin/users" element={<AdminUsersRoute users={users} onChangeUsers={setUsers} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
