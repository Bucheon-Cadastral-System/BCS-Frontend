import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
// 사진 등록 한 번이 조사기록까지 바꾸므로(서버가 한 트랜잭션으로 처리한다) 그쪽 캐시도 함께 비운다.
// 키는 각 엔티티가 소유한다 — 함수 안에서만 쓰므로 초기화 순환은 없다
import { lastSurveyKey } from '@/entities/control-point'
import { SURVEY_PROJECTS_KEY } from '@/entities/survey-project'
import { surveyRecordsKey } from '@/entities/survey-record'
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
      // 판정이 함께 남았다 — 이 셋을 비우지 않으면 상세 카드의 판정과 목록의 완료 표시가 옛 값에 머문다
      void queryClient.invalidateQueries({ queryKey: surveyRecordsKey(args.projectId) })
      void queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY })
      void queryClient.invalidateQueries({ queryKey: lastSurveyKey(args.pointId) })
    },
  })
}
