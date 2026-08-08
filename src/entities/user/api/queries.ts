import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changeAdminMember, getAdminActivities, getAdminMemberCounts, getAdminMembers, updateAdminMember } from './userApi'
import type { AdminActivityType, AdminMemberAction, AdminMemberQuery } from './userApi'

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
