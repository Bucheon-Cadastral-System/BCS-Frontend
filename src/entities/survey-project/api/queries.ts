import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSurveyProjectApi, fetchSurveyProjects, fetchSurveyTargets } from './surveyProjectApi'

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY }),
  })
}
