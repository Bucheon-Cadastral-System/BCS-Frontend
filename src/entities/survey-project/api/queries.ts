import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSurveyProjectApi, deleteSurveyProjectApi, fetchSurveyProjects, fetchSurveyTargets, updateSurveyProjectApi } from './surveyProjectApi'

export const SURVEY_PROJECTS_KEY = ['survey-projects'] as const

export function useSurveyProjectsQuery() {
  return useQuery({ queryKey: SURVEY_PROJECTS_KEY, queryFn: fetchSurveyProjects })
}

export const SURVEY_TARGETS_KEY = ['survey-targets'] as const

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY }),
  })
}

export function useDeleteSurveyProjectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSurveyProjectApi,
    // 대상·기록이 함께 지워지므로 그 캐시들도 비운다
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY })
      void queryClient.invalidateQueries({ queryKey: SURVEY_TARGETS_KEY })
      void queryClient.invalidateQueries({ queryKey: ['survey-records'] })
    },
  })
}
