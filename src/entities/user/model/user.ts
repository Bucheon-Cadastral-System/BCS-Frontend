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
 * 다른 회원의 신원 — 이름을 눌러 보는 자리가 받는 값이다.
 *
 * <p>권한은 담지 않는다. 서버가 그 값을 이 경로로 내려 주지 않는다.
 * 카카오 로그인만 하고 회원 정보 입력을 마치지 않은 계정은 이름부터 직위까지가 빈 문자열이다.
 */
export interface MemberIdentity {
  id: string
  name: string
  phone: string
  email: string
  district: District | UnknownEnumValue | ''
  department: string
  team: Team | UnknownEnumValue | ''
  position: Position | UnknownEnumValue | ''
}

/** 관리 화면이 다루는 회원 한 명의 신원 — 신원에 권한이 붙는다 */
export interface MemberProfile extends MemberIdentity {
  role: UserRole
}

/** 관리 화면이 다루는 회원 한 명 — 신원에 가입 상태가 붙는다 */
export interface ManagedUser extends MemberProfile {
  status: UserStatus
}

/** 내 프로필에는 프로필 이미지 조회 경로가 함께 온다. 다른 회원·관리자 목록 응답에는 이 값이 없다. */
export interface UserProfile extends ManagedUser {
  profileImageUrl: string | null
}

/** 권한을 사람이 읽는 말로 — 서버 표기(ADMIN·USER)는 화면에 세우지 않는다 */
export const ROLE_LABEL: Record<UserRole, string> = { ADMIN: '관리자', USER: '사용자' }
