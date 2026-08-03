export const DISTRICTS = ['원미구', '소사구', '오정구'] as const
export const TEAMS = ['민원행정팀', '가족관계팀', '지적정보팀', '지적관리팀', '부동산관리팀'] as const
export const POSITIONS = ['팀장', '주무관'] as const

export type UserRole = 'ADMIN' | 'USER'
export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE'
export type District = (typeof DISTRICTS)[number]
export type Team = (typeof TEAMS)[number]
export type Position = (typeof POSITIONS)[number]
export type UnknownEnumValue = `알 수 없음 (${string})`

export interface ManagedUser {
  id: string
  name: string
  phone: string
  email: string
  district: District | UnknownEnumValue
  department: string
  team: Team | UnknownEnumValue
  position: Position | UnknownEnumValue
  status: UserStatus
  role: UserRole
}

export interface UserProfile extends ManagedUser {}
