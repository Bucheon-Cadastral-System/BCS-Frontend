export { UserAvatar } from './ui/UserAvatar'
export { avatarColor } from './model/avatarColor'
export { DISTRICTS, TEAMS, POSITIONS } from './model/user'
export type { District, ManagedUser, Position, Team, UnknownEnumValue, UserProfile, UserRole, UserStatus } from './model/user'
// 슬라이스 밖에서 실제로 쓰는 것만 연다 — getCsrfToken 같은 내부용은 안쪽에 둔다
export {
  completeRegistration,
  getMemberState,
  getMyProfile,
  updateMyProfile,
  getAdminMembers,
  getAdminMemberCounts,
  updateAdminMember,
  changeAdminMember,
  getAdminActivities,
} from './api/userApi'
export type {
  RegistrationInput,
  MemberState,
  AdminMemberQuery,
  AdminMemberSortBy,
  AdminMemberAction,
  AdminActivity,
  AdminActivityType,
  SortDirection,
} from './api/userApi'
export {
  useAdminMembersQuery,
  useAdminMemberCountsQuery,
  useAdminActivitiesQuery,
  useUpdateAdminMemberMutation,
  useChangeAdminMemberMutation,
  ADMIN_MEMBERS_KEY,
  ADMIN_MEMBER_COUNTS_KEY,
  ADMIN_ACTIVITIES_KEY,
} from './api/queries'
