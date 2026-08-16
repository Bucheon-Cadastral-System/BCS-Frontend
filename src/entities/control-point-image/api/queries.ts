import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
// 사진 등록 한 번이 조사기록까지 바꾸므로(서버가 한 트랜잭션으로 처리한다) 그쪽 캐시도 함께 비운다
import { invalidateLastSurveys, SURVEY_PROJECTS_KEY, surveyRecordsKey } from '@/shared/api/queryKeys'
import { fetchControlPointImage, fetchControlPointImageFile, uploadControlPointImage } from './controlPointImageApi'

export const CONTROL_POINT_IMAGES_KEY = ['control-point-images'] as const
export const CONTROL_POINT_IMAGE_FILES_KEY = ['control-point-image-files'] as const

/**
 * 사진이 있는지와 그 정보(파일명·촬영 시각). 가리키는 프로젝트나 점이 없으면 묻지 않는다.
 *
 * <p>최종조사와 함께 상세 카드를 세우는 값이라 열 때마다 다시 받는다. 크기는 한 줄짜리 정보다.
 */
export function useControlPointImageQuery(projectId: string | null, pointId: string | null) {
  return useQuery({
    queryKey: [...CONTROL_POINT_IMAGES_KEY, projectId, pointId],
    queryFn: () => fetchControlPointImage(projectId as string, pointId as string),
    enabled: projectId !== null && pointId !== null,
    staleTime: 0,
  })
}

/**
 * 사진 파일 자체.
 *
 * <p>키가 사진 id 라 사진을 교체하면 새 키가 되고, 같은 사진을 다시 열면 받지 않는다. 캐시에는 Blob 만 두고
 * 그리기용 주소(objectURL)는 쓰는 쪽이 만들고 거둔다 — 캐시에 주소를 담으면 언제 거둘지가 사라진다.
 *
 * <p>id 하나에 담긴 그림은 바뀌지 않으므로 낡지 않는 값으로 둔다. 위 사진 정보를 열 때마다 다시 받아
 * 교체를 알아채므로, 여기까지 매번 받으면 수백 KB 를 같은 그림에 두 번 쓰는 셈이 된다.
 */
export function useControlPointImageFileQuery(imageId: number | null) {
  return useQuery({
    queryKey: [...CONTROL_POINT_IMAGE_FILES_KEY, imageId],
    queryFn: () => fetchControlPointImageFile(imageId as number),
    enabled: imageId !== null,
    staleTime: Infinity,
    // 사진 한 장이 수백 KB 다. 상세를 오가는 동안만 들고 있고 그 뒤로는 놓는다
    gcTime: 5 * 60_000,
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
