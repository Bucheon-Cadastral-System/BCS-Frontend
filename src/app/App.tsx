import { useState } from 'react'
import 'ol/ol.css'
import './App.css'
import { RegistrationPage } from '@/pages/registration'
import { LoginPage } from '@/pages/login'
import { MapPage } from '@/pages/map'

type AppView = 'login' | 'registration' | 'waiting' | 'map'

export default function App() {
  const [view, setView] = useState<AppView>('login')

  if (view === 'map') {
    return <MapPage />
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
    return (
      <main className="waiting">
        <section className="waiting__card">
          <div className="waiting__icon" aria-hidden="true">✓</div>
          <p className="waiting__eyebrow">가입 신청 완료</p>
          <h1>관리자 승인을 기다리고 있습니다</h1>
          <p className="waiting__description">
            입력하신 정보로 회원가입 신청이 완료되었습니다.
            <br />
            관리자가 소속 정보를 확인한 후 서비스를 이용할 수 있습니다.
          </p>
          <button type="button" className="waiting__button" onClick={() => setView('login')}>
            로그인 화면으로 돌아가기
          </button>
        </section>
      </main>
    )
  }

  return (
    <LoginPage
      onKakaoLogin={() => setView('registration')}
      onDevelopmentAccess={() => setView('map')}
    />
  )
}
