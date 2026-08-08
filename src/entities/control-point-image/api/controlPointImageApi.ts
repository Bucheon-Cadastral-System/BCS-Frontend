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
  // 서버가 저장 파일명에서 UUID를 제거해 Content-Disposition으로 내려준다.
  // 인증 요청을 Blob으로 받은 뒤 직접 저장하므로 브라우저가 헤더를 자동 적용하지 않아 여기서 복원한다.
  anchor.download = downloadFileName(response.headers['content-disposition'], image.originalFileName)
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function downloadFileName(contentDisposition: string | undefined, fallback: string): string {
  const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const plain = contentDisposition?.match(/filename="([^"]+)"/i)?.[1]
  let value = fallback
  try {
    if (encoded !== undefined) value = decodeURIComponent(encoded)
    else if (plain !== undefined) value = plain
  } catch {
    value = fallback
  }

  // 구버전 서버나 프록시가 UUID 포함 이름을 넘겨도 사용자 저장명에서는 제거한다.
  return value
    .replace(/_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.webp$)/i, '')
    .normalize('NFC')
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
