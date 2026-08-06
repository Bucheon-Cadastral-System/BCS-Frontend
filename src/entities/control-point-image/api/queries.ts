import { useMutation } from '@tanstack/react-query'
import { uploadControlPointImage } from './controlPointImageApi'

export function useUploadControlPointImageMutation() {
  return useMutation({ mutationFn: uploadControlPointImage })
}
