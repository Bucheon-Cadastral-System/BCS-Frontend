import { http } from '@/shared/api/http'
import type { District, ManagedUser, Position, Team, UnknownEnumValue, UserProfile, UserRole, UserStatus } from '../model/user'

type ApiDistrict = 'WONMI' | 'SOSA' | 'OJEONG'
type ApiTeam = 'CIVIL_ADMINISTRATION' | 'FAMILY_RELATION' | 'CADASTRAL_INFORMATION' | 'CADASTRAL_MANAGEMENT' | 'REAL_ESTATE_MANAGEMENT'
type ApiPosition = 'TEAM_LEADER' | 'OFFICER'

const districtToApi: Record<District, ApiDistrict> = { 원미구: 'WONMI', 소사구: 'SOSA', 오정구: 'OJEONG' }
const districtFromApi: Record<ApiDistrict, District> = { WONMI: '원미구', SOSA: '소사구', OJEONG: '오정구' }
const teamToApi: Record<Team, ApiTeam> = {
  민원행정팀: 'CIVIL_ADMINISTRATION', 가족관계팀: 'FAMILY_RELATION', 지적정보팀: 'CADASTRAL_INFORMATION',
  지적관리팀: 'CADASTRAL_MANAGEMENT', 부동산관리팀: 'REAL_ESTATE_MANAGEMENT',
}
const teamFromApi = Object.fromEntries(Object.entries(teamToApi).map(([label, value]) => [value, label])) as Record<ApiTeam, Team>
const positionToApi: Record<Position, ApiPosition> = { 팀장: 'TEAM_LEADER', 주무관: 'OFFICER' }
const positionFromApi: Record<ApiPosition, Position> = { TEAM_LEADER: '팀장', OFFICER: '주무관' }

interface ApiMember {
  id: number
  name: string
  phone: string
  email: string
  district: string
  department?: string
  team: string
  position: string
  memberStatus?: UserStatus
  memberRole?: UserRole
  status?: UserStatus
  role?: UserRole
}

export interface RegistrationInput {
  name: string
  phone: string
  email: string
  district: District
  team: Team
  position: Position
}

interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface MemberState { status: UserStatus; profileCompleted: boolean }

function mapMember(member: ApiMember): ManagedUser {
  return {
    id: String(member.id), name: member.name, phone: member.phone, email: member.email,
    district: enumDisplayValue(districtFromApi, member.district), department: member.department ?? '민원지적과',
    team: enumDisplayValue(teamFromApi, member.team), position: enumDisplayValue(positionFromApi, member.position),
    status: member.memberStatus ?? member.status ?? 'PENDING', role: member.memberRole ?? member.role ?? 'USER',
  }
}

function enumDisplayValue<T extends string>(values: Record<string, T>, value: string): T | UnknownEnumValue {
  return values[value] ?? `알 수 없음 (${value})`
}

function enumApiValue<T extends string>(values: Record<string, T>, value: string, label: string): T {
  const mapped = values[value]
  if (!mapped) throw new Error(`${label}에 지원하지 않는 값이 있습니다. 값을 다시 선택해 주세요.`)
  return mapped
}

function registrationBody(input: RegistrationInput) {
  return { ...input, district: districtToApi[input.district], team: teamToApi[input.team], position: positionToApi[input.position] }
}

export async function getCsrfToken(): Promise<string> {
  const { data } = await http.get<{ token?: string }>('/api/csrf')
  if (!data.token) throw new Error('CSRF 토큰을 발급받지 못했습니다.')
  return data.token
}

export async function completeRegistration(input: RegistrationInput): Promise<void> {
  const csrfToken = await getCsrfToken()
  await http.put('/api/members/me/registration', registrationBody(input), {
    // Spring Security가 /api/csrf 응답으로 준 XOR 토큰을 사용한다.
    // Axios 기본 XSRF 처리를 두면 쿠키의 원본 토큰으로 이 헤더를 덮어써 검증에 실패한다.
    withXSRFToken: false,
    headers: { 'X-XSRF-TOKEN': csrfToken },
  })
}

export async function getMemberState(): Promise<MemberState> {
  const { data } = await http.get<MemberState>('/api/members/me/state')
  return data
}

export async function getMyProfile(): Promise<UserProfile> {
  const { data } = await http.get<ApiMember>('/api/members/me')
  return mapMember(data) as UserProfile
}

export async function updateMyProfile(input: Pick<RegistrationInput, 'phone' | 'district' | 'team' | 'position'>): Promise<void> {
  await http.patch('/api/members/me/update', {
    phone: input.phone,
    district: districtToApi[input.district],
    team: teamToApi[input.team],
    position: positionToApi[input.position],
  })
}

export type AdminMemberSortBy = 'name' | 'email' | 'district' | 'team' | 'position' | 'memberStatus' | 'memberRole' | 'createdAt'
export type SortDirection = 'ASC' | 'DESC'

export async function getAdminMembers(sortBy: AdminMemberSortBy = 'name', direction: SortDirection = 'ASC'): Promise<ManagedUser[]> {
  const params = { size: 100, sortBy, direction }
  const first = await http.get<PageResponse<ApiMember>>('/api/admin/members', { params: { ...params, page: 0 } })
  const remaining = await Promise.all(Array.from({ length: Math.max(0, first.data.totalPages - 1) }, (_, index) =>
    http.get<PageResponse<ApiMember>>('/api/admin/members', { params: { ...params, page: index + 1 } }),
  ))
  return [first, ...remaining].flatMap((response) => response.data.content.map(mapMember))
}

export async function updateAdminMember(member: ManagedUser): Promise<void> {
  await http.patch(`/api/admin/members/${member.id}/profile`, {
    name: member.name, phone: member.phone, email: member.email, district: enumApiValue(districtToApi, member.district, '구청'),
    department: member.department, team: enumApiValue(teamToApi, member.team, '팀'), position: enumApiValue(positionToApi, member.position, '직위'),
  })
}

export type AdminMemberAction = 'approve' | 'reject' | 'deactivate' | 'activate' | 'role/admin' | 'role/user'
export async function changeAdminMember(memberId: string, action: AdminMemberAction): Promise<void> {
  await http.patch(`/api/admin/members/${memberId}/${action}`)
}

export type AdminActivityType = 'MEMBER_APPROVED' | 'MEMBER_REJECTED' | 'MEMBER_DEACTIVATED' | 'MEMBER_ACTIVATED' | 'MEMBER_PROFILE_UPDATED' | 'MEMBER_PROMOTED_TO_ADMIN' | 'MEMBER_DEMOTED_TO_USER'
export interface AdminActivity { id: number; actorAdminId: number; targetMemberId: number; activityType: AdminActivityType; message: string; createdAt: string }
export interface CursorPage<T> { content: T[]; nextCursor: string | null; hasNext: boolean; size: number }

export async function getAdminActivities(cursor?: string, activityType?: AdminActivityType): Promise<CursorPage<AdminActivity>> {
  const { data } = await http.get<CursorPage<AdminActivity>>('/api/admin/activities', { params: { size: 20, cursor, activityType } })
  return data
}
