import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
// 프로젝트 목록 키는 그 엔티티가 소유한다(반대 방향 수입과 같은 이유).
// 서로 수입하지만 둘 다 함수 안에서만 쓰므로 초기화 순환은 없다
import { SURVEY_PROJECTS_KEY } from '@/entities/survey-project'
import { deleteSurveyRecord, fetchSurveyRecords, putSurveyRecord } from './surveyRecordApi'
import type { SurveyResult } from '../model/types'

/** 조사기록 캐시 키의 공통 접두 — 프로젝트 무관 일괄 무효화(프로젝트 삭제 등)가 이 값으로 맞춘다 */
export const SURVEY_RECORDS_KEY = ['survey-records'] as const

export function surveyRecordsKey(projectId: string) {
  return [...SURVEY_RECORDS_KEY, projectId] as const
}

/**
 * 활성 프로젝트의 조사기록 — 프로젝트 미선택(null)이면 조회하지 않는다.
 * 여러 조사자가 같은 프로젝트를 동시에 기록하므로 마스터 데이터보다 짧게 잡아 남의 기록도 비교적 빨리 반영한다.
 */
export function useSurveyRecordsQuery(projectId: string | null) {
  return useQuery({
    queryKey: surveyRecordsKey(projectId as string),
    queryFn: () => fetchSurveyRecords(projectId as string),
    enabled: projectId !== null,
    staleTime: 30_000,
  })
}

interface RecordSurveyArgs {
  projectId: string
  pointId: string
  result: SurveyResult
  /** 기타를 고를 때의 사유 — 그 외 결과는 null */
  note: string | null
}

export function useRecordSurveyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, pointId, result, note }: RecordSurveyArgs) =>
      putSurveyRecord(projectId, pointId, result, note),
    // 목록의 완료 표시가 조사 수(서버 요약)를 따르므로 프로젝트 목록도 함께 비운다
    onSuccess: (_, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: surveyRecordsKey(projectId) })
      void queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY })
    },
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
    // 취소는 완료였던 프로젝트를 진행중으로 되돌릴 수 있다 — 기록과 같이 목록도 비운다
    onSuccess: (_, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: surveyRecordsKey(projectId) })
      void queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY })
    },
  })
}
