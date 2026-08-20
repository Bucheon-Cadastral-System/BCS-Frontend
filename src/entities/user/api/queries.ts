import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changeAdminMember, getAdminActivities, getAdminMemberCounts, getAdminMembers, getMemberProfile, updateAdminMember, updateMyProfile } from './userApi'
import type { AdminActivityType, AdminMemberAction, AdminMemberQuery } from './userApi'

export const MEMBER_PROFILE_KEY = ['member-profile'] as const

/**
 * 회원 한 명의 신원 — 이름을 누른 뒤에만 읽는다.
 *
 * <p>소속·직위는 자주 바뀌지 않고 같은 사람의 이름이 여러 자리에 서므로 낡는 시간을 길게 둔다.
 */
export function useMemberProfileQuery(memberId: string | null) {
  return useQuery({
    queryKey: [...MEMBER_PROFILE_KEY, memberId],
    queryFn: () => getMemberProfile(memberId as string),
    enabled: memberId !== null,
    staleTime: 10 * 60_000,
  })
}

export const ADMIN_MEMBERS_KEY = ['admin-members'] as const

/**
 * 관리자 회원 목록. 검색어·필터·정렬·페이지 전체가 쿼리 키라서 조건이 다르면 다른 캐시로 잡힌다.
 * 다른 관리자도 같은 목록을 승인·비활성화하므로 마스터 데이터보다 짧게 둔다.
 */
export function useAdminMembersQuery(query: AdminMemberQuery) {
  return useQuery({
    queryKey: [...ADMIN_MEMBERS_KEY, query],
    queryFn: ({ signal }) => getAdminMembers(query, signal),
    staleTime: 30_000,
  })
}

export const ADMIN_MEMBER_COUNTS_KEY = ['admin-member-counts'] as const

/** 상태별 회원 수. 목록과 같은 이유로 짧게 둔다 */
export function useAdminMemberCountsQuery() {
  return useQuery({ queryKey: ADMIN_MEMBER_COUNTS_KEY, queryFn: getAdminMemberCounts, staleTime: 30_000 })
}

export const ADMIN_ACTIVITIES_KEY = ['admin-activities'] as const

/** 관리자 활동 로그 한 페이지. 이어 붙이는 더 보기 목록으로 합치는 일은 화면 쪽에서 한다 */
export function useAdminActivitiesQuery(cursor?: string, activityType?: AdminActivityType) {
  return useQuery({
    queryKey: [...ADMIN_ACTIVITIES_KEY, cursor, activityType],
    queryFn: () => getAdminActivities(cursor, activityType),
    staleTime: 30_000,
  })
}

/**
 * 내 정보 수정 — 서버가 받는 것은 전화번호·소속 구청·팀·직위 넷이다.
 *
 * <p>이름과 이메일은 이 길로 고칠 수 없다. 화면은 그 둘을 읽는 줄로만 세운다.
 */
export function useUpdateMyProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateMyProfile,
    // 관리자 화면이 열려 있으면 그 목록의 내 줄도 함께 낡는다
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_KEY })
      void queryClient.invalidateQueries({ queryKey: ADMIN_ACTIVITIES_KEY })
    },
  })
}

export function useUpdateAdminMemberMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAdminMember,
    // 정보 수정은 상태를 바꾸지 않으므로 인원수는 그대로 두고 목록과 활동 로그만 비운다
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_KEY })
      void queryClient.invalidateQueries({ queryKey: ADMIN_ACTIVITIES_KEY })
    },
  })
}

interface ChangeAdminMemberArgs {
  memberId: string
  action: AdminMemberAction
}

export function useChangeAdminMemberMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, action }: ChangeAdminMemberArgs) => changeAdminMember(memberId, action),
    // 승인, 거절, 활성화, 권한 변경 모두 인원수와 활동 로그에 영향을 주므로 셋 다 비운다
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_KEY })
      void queryClient.invalidateQueries({ queryKey: ADMIN_MEMBER_COUNTS_KEY })
      void queryClient.invalidateQueries({ queryKey: ADMIN_ACTIVITIES_KEY })
    },
  })
}
