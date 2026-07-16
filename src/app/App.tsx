import { useState } from 'react'
import 'ol/ol.css'
import './App.css'
import { LoginPage } from '@/pages/login'
import { MapPage } from '@/pages/map'

export default function App() {
  const [isDevelopmentAccess, setIsDevelopmentAccess] = useState(false)

  if (isDevelopmentAccess) {
    return <MapPage />
  }

  return (
    <LoginPage
      onKakaoLogin={() => {
        window.alert('카카오 로그인은 추후 연동될 예정입니다.')
      }}
      onDevelopmentAccess={() => setIsDevelopmentAccess(true)}
    />
  )
}
