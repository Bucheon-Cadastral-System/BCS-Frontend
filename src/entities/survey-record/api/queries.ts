import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteSurveyRecord, fetchSurveyRecords, putSurveyRecord } from './surveyRecordApi'

export function surveyRecordsKey(projectId: string) {
  return ['survey-records', projectId] as const
}

/** 활성 프로젝트의 조사기록 — 프로젝트 미선택(null)이면 조회하지 않는다. */
export function useSurveyRecordsQuery(projectId: string | null) {
  return useQuery({
    queryKey: ['survey-records', projectId],
    queryFn: () => fetchSurveyRecords(projectId as string),
    enabled: projectId !== null,
  })
}

interface RecordSurveyArgs {
  projectId: string
  pointId: string
  lost: boolean
}

export function useRecordSurveyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, pointId, lost }: RecordSurveyArgs) => putSurveyRecord(projectId, pointId, lost),
    onSuccess: (_, { projectId }) =>
      queryClient.invalidateQueries({ queryKey: surveyRecordsKey(projectId) }),
  })
}

interface CancelSurveyArgs {
  projectId: string
  pointId: string
}

export function useCancelSurveyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, pointId }: CancelSurveyArgs) => deleteSurveyRecord(projectId, pointId),
    onSuccess: (_, { projectId }) =>
      queryClient.invalidateQueries({ queryKey: surveyRecordsKey(projectId) }),
  })
}
