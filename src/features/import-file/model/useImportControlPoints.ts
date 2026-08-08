import { useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/shared/api/http'
import { CONTROL_POINTS_KEY, LAST_SURVEY_KEY } from '@/entities/control-point'

export interface ControlPointImportSummary {
  totalRows: number
  /** 파일에만 있던 점 — 새로 등록됨 */
  newPoints: number
  /** 이미 있고 성과도 같아 그대로 둔 점 */
  existingPoints: number
  /** 이미 있었으나 성과·속성이 달라 파일 값으로 덮은 점 */
  updatedPoints: number
}

/** 기준점 파일 업로드 — 조사를 만들지 않고 기준점 마스터만 등록·갱신한다. */
export function useImportControlPoints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const res = await http.post<ControlPointImportSummary>('/api/imports/control-points', form)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTROL_POINTS_KEY })
      // 기준점 파일은 시드 조사를 고쳐 쓴다 — 시드가 바뀌면 최종조사 계산 결과도 바뀐다
      queryClient.invalidateQueries({ queryKey: LAST_SURVEY_KEY })
    },
  })
}
