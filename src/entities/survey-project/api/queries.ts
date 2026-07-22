import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSurveyProjectApi, fetchSurveyProjects } from './surveyProjectApi'

export const SURVEY_PROJECTS_KEY = ['survey-projects'] as const

export function useSurveyProjectsQuery() {
  return useQuery({ queryKey: SURVEY_PROJECTS_KEY, queryFn: fetchSurveyProjects })
}

export function useCreateSurveyProjectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSurveyProjectApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY }),
  })
}
