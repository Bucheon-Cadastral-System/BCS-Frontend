import { parse } from 'exifr'

const MAX_DIMENSION = 800
const WEBP_QUALITY = 0.85
const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])

interface ExifCaptureTime {
  DateTimeOriginal?: Date
  CreateDate?: Date
  OffsetTimeOriginal?: string
  OffsetTimeDigitized?: string
}

export interface PreparedControlPointImage {
  image: File
  capturedAt: string
}

/** 원본 파일의 EXIF 촬영시각. 메타데이터가 없거나 읽을 수 없으면 null이다. */
export async function extractCapturedAt(file: File): Promise<string | null> {
  assertSupportedImage(file)
  try {
    const exif = await parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'OffsetTimeOriginal', 'OffsetTimeDigitized'],
    }) as ExifCaptureTime | undefined
    const captured = exif?.DateTimeOriginal ?? exif?.CreateDate
    if (!(captured instanceof Date) || Number.isNaN(captured.getTime())) return null
    return formatOffsetDateTime(captured, exif?.OffsetTimeOriginal ?? exif?.OffsetTimeDigitized)
  } catch {
    // PNG·메신저 저장본처럼 EXIF 영역 자체가 없는 파일도 정상 이미지일 수 있다.
    return null
  }
}

/** HEIC/HEIF를 포함한 지원 이미지를 디코딩하고 800px WebP로 만든다. */
export async function prepareControlPointImage(file: File, capturedAt: string): Promise<PreparedControlPointImage> {
  assertSupportedImage(file)
  const decoded = isHeic(file) ? await decodeHeic(file) : file
  const bitmap = await createImageBitmap(decoded, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('이미지를 변환할 수 없는 브라우저입니다.')
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result?.type === 'image/webp' ? resolve(result) : reject(new Error('WebP 변환을 지원하지 않는 브라우저입니다.')),
        'image/webp',
        WEBP_QUALITY,
      )
    })
    const baseName = file.name.replace(/\.[^.]*$/, '') || 'image'
    return {
      image: new File([blob], `${baseName}.webp`, { type: 'image/webp' }),
      capturedAt,
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error('이미지를 변환하지 못했습니다.')
  } finally {
    bitmap.close()
  }
}

/** datetime-local 입력값을 서버가 받는 OffsetDateTime 문자열로 바꾼다. */
export function localDateTimeToOffset(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('촬영 날짜와 시간을 확인해 주세요.')
  return `${value.length === 16 ? `${value}:00` : value}${localOffset(date)}`
}

export function currentLocalDateTime(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    + `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

async function decodeHeic(file: File): Promise<Blob> {
  try {
    // 디코더가 크므로 일반 이미지의 첫 화면에는 싣지 않고 HEIC를 골랐을 때만 받는다.
    const { default: heic2any } = await import('heic2any')
    const decoded = await heic2any({ blob: file, toType: 'image/png', quality: 1 })
    return Array.isArray(decoded) ? decoded[0] : decoded
  } catch {
    throw new Error('HEIC/HEIF 사진을 변환하지 못했습니다. 파일이 손상되지 않았는지 확인해 주세요.')
  }
}

function assertSupportedImage(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error('JPG, JPEG, PNG, WebP, HEIC, HEIF 사진만 등록할 수 있습니다.')
  }
}

function isHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
}

function formatOffsetDateTime(date: Date, explicitOffset?: string): string {
  const offset = explicitOffset?.match(/^[+-]\d{2}:\d{2}$/)?.[0] ?? localOffset(date)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${offset}`
}

function localOffset(date: Date): string {
  const minutes = -date.getTimezoneOffset()
  const sign = minutes >= 0 ? '+' : '-'
  const absolute = Math.abs(minutes)
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
}
