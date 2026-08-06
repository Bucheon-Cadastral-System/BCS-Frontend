import { http } from '@/shared/api/http'

export interface ControlPointImage {
  id: number
  projectId: number
  controlPointId: number
  url: string
  originalFileName: string
  size: number
  width: number
  height: number
  createdById: number
  capturedAt: string
  createdAt: string
}

export interface UploadControlPointImageArgs {
  projectId: string
  pointId: string
  image: File
  capturedAt: string
}

export async function uploadControlPointImage(args: UploadControlPointImageArgs): Promise<ControlPointImage> {
  const form = new FormData()
  form.append('image', args.image)
  form.append('capturedAt', args.capturedAt)
  const response = await http.put<ControlPointImage>(
    `/api/survey-projects/${args.projectId}/control-points/${args.pointId}/image`,
    form,
  )
  return response.data
}
