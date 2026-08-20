import { http } from '@/shared/api/http'
import type { District, ManagedUser, MemberIdentity, MemberProfile, Position, Team, UnknownEnumValue, UserProfile, UserRole, UserStatus } from '../model/user'

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

/**
 * 서버가 주는 회원 한 명.
 * 카카오 로그인만 하고 회원 정보 입력을 마치지 않은 계정은 이름부터 직위까지가 비어 있다 —
 * 승인 대기 목록에는 그 계정도 함께 서므로 빈 값을 받을 수 있어야 한다.
 */
/** 남의 신원을 읽는 경로가 받는 모양 — 연락처·권한·가입 상태가 빠져 있다 */
type ApiMemberIdentity = Omit<ApiMember, 'status' | 'phone' | 'email' | 'role'>

interface ApiMember {
  id: number
  name: string | null
  phone: string | null
  email: string | null
  district: string | null
  department: string | null
  team: string | null
  position: string | null
  status: UserStatus
  role: UserRole
}

export interface RegistrationInput {
  name: string
  phone: string
  email: string
  district: District
  team: Team
  position: Position
}

export interface PageResponse<T> {
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
  return { ...mapMemberProfile(member), status: member.status }
}

function mapMemberProfile(member: ApiMember): MemberProfile {
  return {
    ...mapMemberIdentity(member),
    phone: member.phone ?? '', email: member.email ?? '', role: member.role,
  }
}

function mapMemberIdentity(member: ApiMemberIdentity): MemberIdentity {
  return {
    id: String(member.id), name: member.name ?? '',
    district: enumDisplayValue(districtFromApi, member.district), department: member.department ?? '',
    team: enumDisplayValue(teamFromApi, member.team), position: enumDisplayValue(positionFromApi, member.position),
  }
}

/** 아직 고르지 않은 값(회원 정보 입력 전)은 빈 칸으로 두고, 우리가 모르는 값이 왔을 때만 원문을 드러낸다 */
function enumDisplayValue<T extends string>(values: Record<string, T>, value: string | null | undefined): T | UnknownEnumValue | '' {
  if (!value) return ''
  return values[value] ?? `알 수 없음 (${value})`
}

function enumApiValue<T extends string>(values: Record<string, T>, value: string, label: string): T {
  const mapped = values[value]
  if (!mapped) throw new Error(`${label}을(를) 다시 선택해 주세요.`)
  return mapped
}

function registrationBody(input: RegistrationInput) {
  return { ...input, district: districtToApi[input.district], team: teamToApi[input.team], position: positionToApi[input.position] }
}

export async function getCsrfToken(): Promise<string> {
  const { data } = await http.get<{ token?: string }>('/api/csrf')
  if (!data.token) throw new Error('가입 신청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
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

/** 다른 회원의 신원 — 화면이 작성자·조사원 이름을 눌렀을 때 그 사람이 누구인지 읽는다 */
export async function getMemberIdentity(memberId: string): Promise<MemberIdentity> {
  const { data } = await http.get<ApiMemberIdentity>(`/api/members/${memberId}`)
  return mapMemberIdentity(data)
}

export async function updateMyProfile(input: Pick<RegistrationInput, 'phone' | 'district' | 'team' | 'position'>): Promise<void> {
  await http.patch('/api/members/me/update', {
    phone: input.phone,
    district: districtToApi[input.district],
    team: teamToApi[input.team],
    position: positionToApi[input.position],
  })
}

export type AdminMemberSortBy = 'name' | 'email' | 'district' | 'team' | 'position' | 'status' | 'role' | 'createdAt'
export type SortDirection = 'ASC' | 'DESC'

export interface AdminMemberQuery {
  page: number
  size: number
  sortBy: AdminMemberSortBy
  direction: SortDirection
  status?: UserStatus
  name?: string
  email?: string
  phone?: string
}

export async function getAdminMembers(query: AdminMemberQuery, signal?: AbortSignal): Promise<PageResponse<ManagedUser>> {
  const { data } = await http.get<PageResponse<ApiMember>>('/api/admin/members', { params: query, signal })
  return { ...data, content: data.content.map(mapMember) }
}

export async function getAdminMemberCounts(): Promise<Record<'ALL' | UserStatus, number>> {
  const base = { page: 0, size: 1, sortBy: 'name' as const, direction: 'ASC' as const }
  const [all, pending, active, inactive] = await Promise.all([
    getAdminMembers(base),
    getAdminMembers({ ...base, status: 'PENDING' }),
    getAdminMembers({ ...base, status: 'ACTIVE' }),
    getAdminMembers({ ...base, status: 'INACTIVE' }),
  ])
  return { ALL: all.totalElements, PENDING: pending.totalElements, ACTIVE: active.totalElements, INACTIVE: inactive.totalElements }
}

/**
 * 소속 과는 보내지 않는다. 지금 이 시스템은 민원지적과 하나만 받으므로 고칠 값이 아니고,
 * 화면이 들고 있는 값을 되보내면 그사이 다른 경로로 바뀐 값을 덮는다.
 */
export async function updateAdminMember(member: ManagedUser): Promise<void> {
  await http.patch(`/api/admin/members/${member.id}/profile`, {
    name: member.name, phone: member.phone, email: member.email, district: enumApiValue(districtToApi, member.district, '구청'),
    team: enumApiValue(teamToApi, member.team, '팀'), position: enumApiValue(positionToApi, member.position, '직위'),
  })
}

export type AdminMemberAction = 'approve' | 'reject' | 'deactivate' | 'activate' | 'role/admin' | 'role/user'
export async function changeAdminMember(memberId: string, action: AdminMemberAction): Promise<void> {
  await http.patch(`/api/admin/members/${memberId}/${action}`)
}

export type AdminActivityType = 'MEMBER_APPROVED' | 'MEMBER_REJECTED' | 'MEMBER_DEACTIVATED' | 'MEMBER_ACTIVATED' | 'MEMBER_PROFILE_UPDATED' | 'MEMBER_PROMOTED_TO_ADMIN' | 'MEMBER_DEMOTED_TO_USER'
/**
 * 관리자 활동 한 줄.
 *
 * <p>이름은 기록하는 순간 함께 적어 둔 값이라 그 뒤에 개명하거나 탈퇴해도 그때의 이름이 남는다.
 * 회원을 다시 조회해 붙이면 지금 이름이 나와, 로그가 말하는 시점과 어긋난다.
 */
export interface AdminActivity {
  id: number
  actorAdminId: number
  actorName: string
  targetMemberId: number
  targetName: string
  activityType: AdminActivityType
  message: string
  createdAt: string
}
export interface CursorPage<T> { content: T[]; nextCursor: string | null; hasNext: boolean; size: number }

export async function getAdminActivities(cursor?: string, activityType?: AdminActivityType): Promise<CursorPage<AdminActivity>> {
  const { data } = await http.get<CursorPage<AdminActivity>>('/api/admin/activities', { params: { size: 20, cursor, activityType } })
  return data
}
