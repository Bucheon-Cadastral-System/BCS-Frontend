export const DISTRICTS = ['원미구', '소사구', '오정구'] as const
export const TEAMS = ['민원행정팀', '가족관계팀', '지적정보팀', '지적관리팀', '부동산관리팀'] as const
export const POSITIONS = ['팀장', '주무관'] as const

export type UserRole = 'ADMIN' | 'USER'
export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE'
export type District = (typeof DISTRICTS)[number]
export type Team = (typeof TEAMS)[number]
export type Position = (typeof POSITIONS)[number]
export type UnknownEnumValue = `알 수 없음 (${string})`

/**
 * 관리 화면이 다루는 회원 한 명.
 * 카카오 로그인만 하고 회원 정보 입력을 마치지 않은 계정은 이름부터 직위까지가 빈 문자열이다 —
 * 그런 계정도 승인 대기 목록에 서므로 빈 값을 담을 수 있어야 한다.
 */
export interface ManagedUser {
  id: string
  name: string
  phone: string
  email: string
  district: District | UnknownEnumValue | ''
  department: string
  team: Team | UnknownEnumValue | ''
  position: Position | UnknownEnumValue | ''
  status: UserStatus
  role: UserRole
}

export interface UserProfile extends ManagedUser {}
