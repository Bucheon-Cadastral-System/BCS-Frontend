import { useEffect, useRef, useState } from 'react'
import {
  downloadControlPointImage,
  fetchControlPointImageFile,
  useControlPointImageQuery,
  useUploadControlPointImageMutation,
} from '@/entities/control-point-image'
import { ApiError } from '@/shared/api/http'
import {
  currentLocalDateTime,
  extractCapturedAt,
  localDateTimeToOffset,
  prepareControlPointImage,
} from '@/shared/lib/controlPointImage'
import { CHIP_BTN } from '@/shared/ui/classes'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'

interface ControlPointImageUploadProps {
  projectId: string
  pointId: string
  onSuccess: () => void
  onError: (message: string) => void
}

interface MissingCaptureTime {
  file: File
  localDateTime: string
}

export function ControlPointImageUpload(props: ControlPointImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const mutation = useUploadControlPointImageMutation()
  const imageQuery = useControlPointImageQuery(props.projectId, props.pointId)
  const [preparing, setPreparing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [missingCaptureTime, setMissingCaptureTime] = useState<MissingCaptureTime | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const pending = preparing || mutation.isPending

  useEffect(() => {
    const image = imageQuery.data
    if (image === null || image === undefined) {
      setPreviewUrl(null)
      return
    }
    let active = true
    let objectUrl: string | null = null
    void fetchControlPointImageFile(image.id)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      })
      .catch(() => {
        if (active) setPreviewUrl(null)
      })
    return () => {
      active = false
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl)
    }
  }, [imageQuery.data])

  async function select(file: File | undefined) {
    if (file === undefined) return
    setPreparing(true)
    try {
      const capturedAt = await extractCapturedAt(file)
      if (capturedAt === null) {
        setDialogError(null)
        setMissingCaptureTime({ file, localDateTime: currentLocalDateTime() })
        return
      }
      await upload(file, capturedAt)
    } catch (error) {
      props.onError(messageOf(error))
    } finally {
      setPreparing(false)
      if (inputRef.current !== null) inputRef.current.value = ''
    }
  }

  async function confirmMissingCaptureTime() {
    if (missingCaptureTime === null) return
    setPreparing(true)
    setDialogError(null)
    try {
      const capturedAt = localDateTimeToOffset(missingCaptureTime.localDateTime)
      await upload(missingCaptureTime.file, capturedAt)
      setMissingCaptureTime(null)
    } catch (error) {
      setDialogError(messageOf(error))
    } finally {
      setPreparing(false)
    }
  }

  async function upload(file: File, capturedAt: string) {
    const prepared = await prepareControlPointImage(file, capturedAt)
    await mutation.mutateAsync({ projectId: props.projectId, pointId: props.pointId, ...prepared })
    props.onSuccess()
  }

  async function download() {
    if (imageQuery.data === null || imageQuery.data === undefined) return
    setDownloading(true)
    try {
      await downloadControlPointImage(imageQuery.data)
    } catch (error) {
      props.onError(messageOf(error))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mt-2.5 border-t border-line-soft pt-2.5">
      {imageQuery.isPending && <p className="mb-2 text-center text-[11px] text-ink-3">현장 이미지를 불러오는 중…</p>}
      {imageQuery.isError && (
        <button type="button" className="mb-2 w-full text-[11px] text-danger" onClick={() => void imageQuery.refetch()}>
          이미지를 불러오지 못했습니다. 다시 시도
        </button>
      )}
      {imageQuery.data !== null && imageQuery.data !== undefined && (
        <div className="mb-2.5 overflow-hidden rounded-chip border border-line-soft bg-field">
          {previewUrl === null ? (
            <div className="flex h-[132px] items-center justify-center text-[11px] text-ink-3">미리보기 불러오는 중…</div>
          ) : (
            <img src={previewUrl} alt="등록된 기준점 현장" className="h-[132px] w-full object-cover" />
          )}
          <div className="flex items-center gap-2 border-t border-line-soft px-2.5 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] text-ink-2">{imageQuery.data.originalFileName}</p>
              <p className="mt-0.5 text-[10.5px] text-ink-3">
                촬영 {formatCapturedAt(imageQuery.data.capturedAt)} · {imageQuery.data.width}×{imageQuery.data.height}
              </p>
            </div>
            <button
              type="button"
              disabled={downloading}
              className="shrink-0 text-[11px] font-medium text-teal-text disabled:opacity-50"
              onClick={() => void download()}
            >
              {downloading ? '받는 중…' : '다운로드'}
            </button>
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={(event) => void select(event.target.files?.[0])}
      />
      <button
        type="button"
        className={`${CHIP_BTN} h-9 w-full text-[12.5px]`}
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {preparing ? '사진 처리 중…' : mutation.isPending ? '업로드 중…' : '현장 이미지 등록·교체'}
      </button>
      <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-3">
        JPG·PNG·WebP·HEIC를 최대 800px WebP로 변환해 등록합니다.
      </p>

      {missingCaptureTime !== null && (
        <ConfirmDialog
          message="사진 촬영정보가 없습니다."
          detail={(
            <div className="text-left">
              <p className="mb-2 text-center">현재 시간을 촬영시각으로 사용합니다. 필요하면 직접 수정해 주세요.</p>
              <label className="block text-[11.5px] text-ink-2">
                촬영 날짜와 시간
                <input
                  type="datetime-local"
                  step="1"
                  value={missingCaptureTime.localDateTime}
                  disabled={pending}
                  className="mt-1 h-9 w-full rounded-chip border border-line bg-field px-2.5 text-[12.5px] text-ink outline-none focus:border-teal"
                  onChange={(event) => setMissingCaptureTime({ ...missingCaptureTime, localDateTime: event.target.value })}
                />
              </label>
            </div>
          )}
          error={dialogError ?? undefined}
          confirmLabel="이 시간으로 등록"
          cancelLabel="취소"
          busy={pending}
          busyLabel="사진 처리 중…"
          confirmDisabled={missingCaptureTime.localDateTime === ''}
          onConfirm={() => void confirmMissingCaptureTime()}
          onCancel={() => setMissingCaptureTime(null)}
        />
      )}
    </div>
  )
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return '이미지를 처리하지 못했습니다.'
}

function formatCapturedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date)
}
