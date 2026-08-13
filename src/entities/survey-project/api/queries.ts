import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LAST_SURVEY_KEY, SURVEY_PROJECTS_KEY, SURVEY_RECORDS_KEY, SURVEY_TARGETS_KEY, surveyRecordsKey } from '@/shared/api/queryKeys'
import type { SurveyRecord } from '@/entities/survey-record'
import { createSurveyProjectApi, deleteSurveyProjectApi, fetchSurveyProjects, fetchSurveyTargets, updateSurveyProjectApi } from './surveyProjectApi'

export { SURVEY_PROJECTS_KEY, SURVEY_TARGETS_KEY } from '@/shared/api/queryKeys'

export function useSurveyProjectsQuery() {
  return useQuery({ queryKey: SURVEY_PROJECTS_KEY, queryFn: fetchSurveyProjects })
}


/** 선택한 조사의 대상 점 — 고른 조사가 없으면 조회하지 않는다. */
export function useSurveyTargetsQuery(projectId: string | null) {
  return useQuery({
    queryKey: [...SURVEY_TARGETS_KEY, projectId],
    queryFn: () => fetchSurveyTargets(projectId as string),
    enabled: projectId !== null,
  })
}

export function useCreateSurveyProjectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSurveyProjectApi,
    // 생성이 대상 지정을 겸하므로 대상 캐시도 함께 비운다
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY })
      void queryClient.invalidateQueries({ queryKey: SURVEY_TARGETS_KEY })
    },
  })
}

export function useUpdateSurveyProjectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSurveyProjectApi,
    onSuccess: (_updated, args) => {
      // 무효화만 하면 재조회가 돌아올 때까지 옛 대상·기록이 그대로 보인다.
      // 성공 응답 = 서버가 이 목록을 받아들였다는 확정이므로, 아는 값을 즉시 캐시에 써 넣는다
      // (요청 전에 미리 바꾸는 낙관적 갱신이 아니라 실패 롤백이 필요 없다).
      queryClient.setQueryData([...SURVEY_TARGETS_KEY, args.id], [...args.targetPointIds])
      // 대상에서 빠진 점의 기록은 서버가 함께 지웠다 — 남는 기록만 걸러 즉시 반영한다
      const kept = new Set(args.targetPointIds)
      queryClient.setQueryData<SurveyRecord[]>(surveyRecordsKey(args.id), (cur) =>
        cur?.filter((r) => kept.has(r.pointId)),
      )
      // 재조회는 그대로 돌린다 — 위 반영이 서버와 어긋났다면 여기서 바로잡힌다
      void queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY })
      void queryClient.invalidateQueries({ queryKey: SURVEY_TARGETS_KEY })
      void queryClient.invalidateQueries({ queryKey: SURVEY_RECORDS_KEY })
      // 대상에서 빠진 점은 그 회차 기록을 잃는다 — 그것이 최신 기록이었다면 최종조사가 되돌아간다
      void queryClient.invalidateQueries({ queryKey: LAST_SURVEY_KEY })
    },
  })
}

export function useDeleteSurveyProjectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSurveyProjectApi,
    // 대상·기록이 함께 지워지므로 그 캐시들도 비운다.
    // 지워진 기록이 그 점의 최신 기록이었다면 최종조사가 이전 회차로 되돌아간다 —
    // 어느 점이 그랬는지는 응답에 없으므로 최종조사는 통째로 비운다
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY })
      void queryClient.invalidateQueries({ queryKey: SURVEY_TARGETS_KEY })
      void queryClient.invalidateQueries({ queryKey: SURVEY_RECORDS_KEY })
      void queryClient.invalidateQueries({ queryKey: LAST_SURVEY_KEY })
    },
  })
}
