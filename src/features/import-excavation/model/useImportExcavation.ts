import { useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/shared/api/http'
import { CONTROL_POINTS_KEY } from '@/entities/control-point'
import { SURVEY_PROJECTS_KEY } from '@/entities/survey-project'

interface ImportExcavationArgs {
  file: File
  name: string
}

export interface ImportSummary {
  projectId: number
  totalRows: number
  newPoints: number
  existingPoints: number
  createdRecords: number
}

/** 굴착협의 CSV 업로드 — 서버가 프로젝트 생성·기준점 등록·기존조사 기록을 한 번에 처리한다. */
export function useImportExcavation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, name }: ImportExcavationArgs) => {
      const form = new FormData()
      form.append('file', file)
      form.append('name', name)
      const res = await http.post<ImportSummary>('/api/imports/excavation-consultation', form)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTROL_POINTS_KEY })
      queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY })
      queryClient.invalidateQueries({ queryKey: ['survey-records'] })
    },
  })
}
