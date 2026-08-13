import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
// 사진 등록 한 번이 조사기록까지 바꾸므로(서버가 한 트랜잭션으로 처리한다) 그쪽 캐시도 함께 비운다
import { invalidateLastSurveys, SURVEY_PROJECTS_KEY, surveyRecordsKey } from '@/shared/api/queryKeys'
import { fetchControlPointImage, uploadControlPointImage } from './controlPointImageApi'

export const CONTROL_POINT_IMAGES_KEY = ['control-point-images'] as const

export function useControlPointImageQuery(projectId: string, pointId: string) {
  return useQuery({
    queryKey: [...CONTROL_POINT_IMAGES_KEY, projectId, pointId],
    queryFn: () => fetchControlPointImage(projectId, pointId),
  })
}

export function useUploadControlPointImageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: uploadControlPointImage,
    onSuccess: (_image, args) => {
      void queryClient.invalidateQueries({
        queryKey: [...CONTROL_POINT_IMAGES_KEY, args.projectId, args.pointId],
      })
      // 판정이 함께 남았다 — 이 셋을 비우지 않으면 상세 카드의 판정과 목록의 완료 표시, 지도의 그 점 색이 옛 값에 머문다
      void queryClient.invalidateQueries({ queryKey: surveyRecordsKey(args.projectId) })
      void queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY })
      invalidateLastSurveys(queryClient, args.pointId)
    },
  })
}
