import { useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/shared/api/http'
import { CONTROL_POINTS_KEY } from '@/entities/control-point'
import { SURVEY_PROJECTS_KEY, SURVEY_TARGETS_KEY, toSurveyProjectPayload } from '@/entities/survey-project'
import { SURVEY_RECORDS_KEY } from '@/entities/survey-record'
import type { SurveyProjectDraft } from '@/entities/survey-project'

export interface ImportSummary {
  projectId: number
  totalRows: number
  newPoints: number
  existingPoints: number
  updatedPoints: number
  createdRecords: number
}

/** 대상지 파일 업로드 — 서버가 프로젝트 생성·기준점 등록·조사 대상 등록·기존조사 기록을 한 번에 처리한다. */
export function useImportSurveyCsv() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, draft }: { file: File; draft: SurveyProjectDraft }) => {
      const form = new FormData()
      form.append('file', file)
      // 프로젝트 값은 새 조사 만들기와 같은 규칙으로 보낸다 — 파일이 붙었다고 값의 뜻이 달라지지 않는다.
      for (const [key, value] of Object.entries(toSurveyProjectPayload(draft))) {
        if (value !== null) form.append(key, String(value))
      }
      const res = await http.post<ImportSummary>('/api/imports/survey-csv', form)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTROL_POINTS_KEY })
      queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY })
      queryClient.invalidateQueries({ queryKey: SURVEY_TARGETS_KEY })
      queryClient.invalidateQueries({ queryKey: SURVEY_RECORDS_KEY })
    },
  })
}
