import { parse } from 'exifr'

const MAX_DIMENSION = 800
const WEBP_QUALITY = 0.85
const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])

/**
 * 시간대가 적히지 않은 촬영 시각은 한국 시각으로 읽는다 — `shared/lib/date.ts` 와 같은 규칙이다.
 *
 * <p>보는 사람의 시간대로 읽으면 안 된다. 여기서 만든 값이 곧 조사기록의 조사 시각이 되고,
 * 최종조사는 그 값을 날짜로 견주므로 아홉 시간이 밀리면 회차 차례가 뒤집힌다. 부천시 현장을 찍은
 * 사진의 벽시계는 노트북 설정이 무엇이든 한국 시각이다.
 */
const KST_OFFSET = '+09:00'
const KST_ZONE = 'Asia/Seoul'

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
  const bitmap = await decodeImage(decoded)
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (context === null) throw new Error(UNSUPPORTED_BROWSER)
    context.drawImage(bitmap.source, 0, 0, width, height)

    const blob = await encodeWebp(canvas, width, height)
    const baseName = file.name.replace(/\.[^.]*$/, '') || 'image'
    return {
      image: new File([blob], `${baseName}.webp`, { type: 'image/webp' }),
      capturedAt,
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error('사진을 변환하지 못했습니다. 다른 사진으로 다시 시도해 주세요.')
  } finally {
    bitmap.release()
  }
}

/**
 * 줄여 그린 캔버스를 WebP 로 굽는다.
 *
 * <p>캔버스가 구워 주면 그것을 쓴다. 사파리는 WebP 를 펼 줄은 알아도 구울 줄은 모르는데(iOS·macOS 모두),
 * 모르는 형식을 요구받으면 못 한다고 알리는 대신 조용히 PNG 를 내준다. 그래서 무엇이 나왔는지 형식을
 * 보고 갈라야 한다 — 성공 여부로는 갈리지 않는다.
 *
 * <p>굽지 못하는 브라우저에서는 libwebp 를 받아 우리가 굽는다. 다른 형식으로 물러설 자리가 없다.
 * 서버는 파일 앞머리의 RIFF·WEBP 표시를 확인하고 저장 이름도 .webp 로 짓는다 — 저장은 한 형식이라는
 * 약속이 서버 쪽에 박혀 있다.
 *
 * <p>인코더는 300KB 가 넘으므로 첫 화면에 싣지 않는다. 필요한 브라우저에서, 사진을 실제로 고른 뒤에만 받는다.
 */
async function encodeWebp(canvas: HTMLCanvasElement, width: number, height: number): Promise<Blob> {
  const drawn = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY))
  if (drawn?.type === 'image/webp') return drawn

  const context = canvas.getContext('2d')
  if (context === null) throw new Error(UNSUPPORTED_BROWSER)
  const pixels = context.getImageData(0, 0, width, height)

  let encode: (data: ImageData, options?: { quality: number }) => Promise<ArrayBuffer>
  try {
    encode = (await import('@jsquash/webp/encode')).default
  } catch (error) {
    console.error('WebP encoder load failed', error)
    throw new Error('사진 변환기를 내려받지 못했습니다. 연결을 확인하고 다시 시도해 주세요.')
  }
  try {
    return new Blob([await encode(pixels, { quality: Math.round(WEBP_QUALITY * 100) })], { type: 'image/webp' })
  } catch (error) {
    console.error('WebP encode failed', error)
    throw new Error('사진을 변환하지 못했습니다. 다른 사진으로 다시 시도해 주세요.')
  }
}

/** 캔버스에 그릴 수 있게 편 그림과 그 크기 */
interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

/**
 * 그림을 편다 — 세 갈래를 차례로 시도한다.
 *
 * <p>`createImageBitmap` 에 방향 옵션까지 주는 것이 가장 정확하지만, 옵션 사전을 모르는 사파리는 그 자리에서
 * 예외를 던진다. 그래서 옵션 없이 한 번 더, 그래도 안 되면 `<img>` 로 편다. 마지막 갈래에서도 요즘 브라우저는
 * EXIF 방향을 스스로 반영하므로 세워 찍은 사진이 눕지 않는다.
 */
async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    for (const options of [{ imageOrientation: 'from-image' } as const, undefined]) {
      try {
        const bitmap = options === undefined ? await createImageBitmap(blob) : await createImageBitmap(blob, options)
        return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() }
      } catch {
        // 다음 갈래로
      }
    }
  }
  const url = URL.createObjectURL(blob)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error(UNSUPPORTED_BROWSER))
      element.src = url
    })
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

/** 사용자가 적은 촬영 일시를 서버가 받는 OffsetDateTime 문자열로 바꾼다 — 적힌 벽시계는 한국 시각이다. */
export function localDateTimeToOffset(value: string): string {
  if (Number.isNaN(new Date(value).getTime())) throw new Error('촬영 일시를 확인해 주세요.')
  return `${value.length === 16 ? `${value}:00` : value}${KST_OFFSET}`
}

/** 촬영 일시 입력칸의 처음 값 — 브라우저 시간대가 무엇이든 한국 시각을 적는다. */
export function currentLocalDateTime(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_ZONE, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date())
  const at = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '00'
  return `${at('year')}-${at('month')}-${at('day')}T${at('hour')}:${at('minute')}:${at('second')}`
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

/**
 * 받을 수 있는 사진인지 — 이름의 확장자나 파일 형식 둘 중 하나만 맞으면 받는다.
 *
 * <p>확장자만 보면 안 된다. 아이폰 사진 보관함이 내주는 파일은 이름이 `image` 처럼 확장자 없이 오기도 한다.
 * 형식만 보아도 안 된다. 파일 탐색기에서 고른 파일은 형식이 빈 문자열로 오는 경우가 있다.
 */
function assertSupportedImage(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const byName = SUPPORTED_EXTENSIONS.has(extension)
  const byType = /^image\/(jpe?g|png|webp|hei[cf])(-sequence)?$/i.test(file.type)
  if (!byName && !byType) {
    throw new Error(`${SUPPORTED_LABEL} 사진만 등록할 수 있습니다.`)
  }
}

function isHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
}

/**
 * EXIF 의 촬영 시각을 OffsetDateTime 문자열로.
 *
 * <p>EXIF 의 `DateTimeOriginal` 은 시간대가 없는 벽시계라 exifr 이 그 숫자를 그대로 담아 준다.
 * 카메라가 `OffsetTimeOriginal` 을 함께 적어 뒀으면 그 시간대를 쓰고, 없으면 한국 시각으로 읽는다.
 */
function formatOffsetDateTime(date: Date, explicitOffset?: string): string {
  const offset = explicitOffset?.match(/^[+-]\d{2}:\d{2}$/)?.[0] ?? KST_OFFSET
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${offset}`
}
