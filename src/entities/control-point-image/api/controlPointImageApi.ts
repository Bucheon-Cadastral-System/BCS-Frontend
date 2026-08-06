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

interface PageResponse<T> {
  content: T[]
}

export async function fetchControlPointImage(projectId: string, pointId: string): Promise<ControlPointImage | null> {
  const response = await http.get<PageResponse<ControlPointImage>>(
    `/api/control-points/${pointId}/images`,
    { params: { page: 0, size: 100 } },
  )
  return response.data.content.find((image) => String(image.projectId) === projectId) ?? null
}

export async function fetchControlPointImageFile(imageId: number): Promise<Blob> {
  const response = await http.get<Blob>(`/api/control-point-images/${imageId}/file`, { responseType: 'blob' })
  return response.data
}

export async function downloadControlPointImage(image: ControlPointImage): Promise<void> {
  const response = await http.get<Blob>(`/api/control-point-images/${image.id}/download`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = image.originalFileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
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
