import { parse } from 'exifr'

const MAX_DIMENSION = 800
const WEBP_QUALITY = 0.85
const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])

/** 사용자에게 보이는 형식 목록 — 확장자 여섯 가지를 네 이름으로 묶는다(jpeg·heif 는 같은 것의 다른 표기다). */
export const SUPPORTED_LABEL = 'JPG · PNG · WebP · HEIC'

/**
 * 브라우저가 낡아 캔버스나 WebP 인코딩을 못 할 때. 두 갈래를 가르지 않는 이유는
 * 사용자가 할 일이 어느 쪽이든 같기 때문이다 — 원인을 나눠 봐야 고르는 행동이 달라지지 않는다.
 */
const UNSUPPORTED_BROWSER = '이 브라우저에서는 사진을 변환할 수 없습니다. 최신 버전 브라우저에서 열어 주세요.'

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
    if (context === null) throw new Error(UNSUPPORTED_BROWSER)
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result?.type === 'image/webp' ? resolve(result) : reject(new Error(UNSUPPORTED_BROWSER)),
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
    throw error instanceof Error ? error : new Error('사진을 변환하지 못했습니다. 다른 사진으로 다시 시도해 주세요.')
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
    // CSP 빌드는 unsafe-eval 없이 동작하고 최신 libheif가 최근 iPhone 형식을 해석한다.
    const { heicTo } = await import('heic-to/csp')
    return await heicTo({ blob: file, type: 'image/png' })
  } catch (error) {
    console.error('HEIC/HEIF decode failed', error)
    throw new Error('이 사진 형식을 읽지 못했습니다. 사진 앱에서 JPG로 내보낸 뒤 다시 시도해 주세요.')
  }
}

function assertSupportedImage(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(`${SUPPORTED_LABEL} 사진만 등록할 수 있습니다.`)
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
