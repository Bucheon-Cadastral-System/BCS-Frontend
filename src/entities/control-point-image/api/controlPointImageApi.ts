import { ApiError, http } from '@/shared/api/http'
import type { SurveyResult } from '@/entities/survey-record'

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
  /** 그 자리에서 내린 판정 — 서버가 사진과 한 트랜잭션으로 조사기록에 남긴다 */
  result: SurveyResult
  /** 기타를 골랐을 때의 사유. 다른 갈래에서는 비운다 */
  note: string | null
}

export async function fetchControlPointImage(projectId: string, pointId: string): Promise<ControlPointImage | null> {
  try {
    const response = await http.get<ControlPointImage>(
      `/api/survey-projects/${projectId}/control-points/${pointId}/image`,
    )
    return response.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
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
  // 같은 틱에서 해제하면 브라우저가 저장을 시작하기 전에 주소가 사라져 다운로드가 취소되는 경우가 있다
  setTimeout(() => URL.revokeObjectURL(url), 0)
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

/**
 * 사진과 판정을 한 요청으로 보낸다.
 *
 * <p>둘을 따로 보내면 한쪽만 성공하는 상태가 생기고, 그때 사용자에게 남는 안내는
 * "사진은 올라갔으니 판정만 다시 하세요" 뿐인데 화면으로는 어디까지 됐는지 알 수 없다.
 * 서버가 한 트랜잭션으로 받으므로 되든 안 되든 통째로 된다.
 */
export async function uploadControlPointImage(args: UploadControlPointImageArgs): Promise<ControlPointImage> {
  const form = new FormData()
  form.append('image', args.image)
  form.append('capturedAt', args.capturedAt)
  form.append('result', args.result)
  if (args.note !== null) form.append('note', args.note)
  const response = await http.put<ControlPointImage>(
    `/api/survey-projects/${args.projectId}/control-points/${args.pointId}/image`,
    form,
  )
  return response.data
}
