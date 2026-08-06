import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
    onSuccess: (_image, args) => queryClient.invalidateQueries({
      queryKey: [...CONTROL_POINT_IMAGES_KEY, args.projectId, args.pointId],
    }),
  })
}
