import { useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/shared/api/http'
import { CONTROL_POINTS_KEY } from '@/entities/control-point'
import { SURVEY_PROJECTS_KEY } from '@/entities/survey-project'
import type { SurveyProjectType } from '@/entities/survey-project'

interface ImportSurveyCsvArgs {
  file: File
  name: string
  /** 조사 계기 — 파일 서식과 별개 축이라 업로드할 때 고른다. */
  type: SurveyProjectType
}

export interface ImportSummary {
  projectId: number
  totalRows: number
  newPoints: number
  existingPoints: number
  updatedPoints: number
  createdRecords: number
}

/** 대상지 CSV 업로드 — 서버가 프로젝트 생성·기준점 등록·조사 대상 등록·기존조사 기록을 한 번에 처리한다. */
export function useImportSurveyCsv() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, name, type }: ImportSurveyCsvArgs) => {
      const form = new FormData()
      form.append('file', file)
      form.append('name', name)
      form.append('type', type)
      const res = await http.post<ImportSummary>('/api/imports/survey-csv', form)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTROL_POINTS_KEY })
      queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY })
      queryClient.invalidateQueries({ queryKey: ['survey-records'] })
    },
  })
}
