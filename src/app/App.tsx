import { useState } from 'react'
import 'ol/ol.css'
import './App.css'
import { AdminUsersPage } from '@/pages/admin-users'
import type { ManagedUser, UserRole } from '@/entities/user'
import { RegistrationPage } from '@/pages/registration'
import { LoginPage } from '@/pages/login'
import { MapPage } from '@/pages/map'
import { WaitingPage } from '@/pages/waiting'

type AppView = 'login' | 'registration' | 'waiting' | 'map' | 'admin'

const DEVELOPMENT_ROLE: UserRole = 'ADMIN'

const INITIAL_USERS: ManagedUser[] = [
  {
    id: 'user-1',
    kakaoId: '3948217551',
    name: '김지훈',
    phone: '01012345678',
    email: 'jihun.kim@example.com',
    district: '원미구',
    department: '민원지적과',
    team: '지적관리팀',
    position: '주무관',
    status: 'PENDING',
    requestedAt: '2026-07-16',
  },
  {
    id: 'user-2',
    kakaoId: '3814072264',
    name: '박서연',
    phone: '01098765432',
    email: 'seoyeon.park@example.com',
    district: '소사구',
    department: '민원지적과',
    team: '지적정보팀',
    position: '팀장',
    status: 'ACTIVE',
    requestedAt: '2026-07-12',
  },
  {
    id: 'user-3',
    kakaoId: '3729441088',
    name: '이민수',
    phone: '01024681357',
    email: 'minsu.lee@example.com',
    district: '오정구',
    department: '민원지적과',
    team: '부동산관리팀',
    position: '주무관',
    status: 'INACTIVE',
    requestedAt: '2026-07-08',
  },
]

export default function App() {
  const [view, setView] = useState<AppView>('login')
  const [users, setUsers] = useState<ManagedUser[]>(INITIAL_USERS)

  if (view === 'map') {
    return (
      <MapPage
        role={DEVELOPMENT_ROLE}
        onOpenUserManagement={() => setView('admin')}
      />
    )
  }

  if (view === 'admin') {
    return (
      <AdminUsersPage
        users={users}
        onChangeUsers={setUsers}
        onBack={() => setView('map')}
      />
    )
  }

  if (view === 'registration') {
    return (
      <RegistrationPage
        kakaoId="development-kakao-id"
        onCancel={() => setView('login')}
        onSubmit={(registration) => {
          console.info('회원가입 신청 데이터', registration)
          setView('waiting')
        }}
      />
    )
  }

  if (view === 'waiting') {
    return <WaitingPage onBackToLogin={() => setView('login')} />
  }

  return (
    <LoginPage
      onKakaoLogin={() => setView('registration')}
      onDevelopmentAccess={() => setView('map')}
    />
  )
}
