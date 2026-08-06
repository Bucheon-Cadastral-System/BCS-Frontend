import { useRef, useState } from 'react'
import { useUploadControlPointImageMutation } from '@/entities/control-point-image'
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
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

interface MissingCaptureTime {
  file: File
  localDateTime: string
}

export function ControlPointImageUpload(props: ControlPointImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const mutation = useUploadControlPointImageMutation()
  const [preparing, setPreparing] = useState(false)
  const [missingCaptureTime, setMissingCaptureTime] = useState<MissingCaptureTime | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const pending = preparing || mutation.isPending

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
    props.onSuccess('현장 이미지를 등록했습니다.')
  }

  return (
    <div className="mt-2.5 border-t border-line-soft pt-2.5">
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
