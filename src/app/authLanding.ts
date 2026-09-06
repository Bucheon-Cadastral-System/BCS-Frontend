import type { UserStatus } from '@/entities/user'

interface AuthLandingState {
  status: UserStatus
  profileCompleted: boolean
}

/** 로그인 완료 뒤 회원 상태에 따라 메인 창이 열 화면을 정한다. */
export function getAuthLandingPath({ status, profileCompleted }: AuthLandingState): string {
  if (status === 'INACTIVE') return '/login?error=inactive'
  if (!profileCompleted) return '/signup'
  if (status === 'PENDING') return '/waiting'
  return '/'
}
