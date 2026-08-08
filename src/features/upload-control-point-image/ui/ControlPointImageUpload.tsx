import { useEffect, useRef, useState } from 'react'
import {
  downloadControlPointImage,
  fetchControlPointImageFile,
  useControlPointImageQuery,
  useUploadControlPointImageMutation,
} from '@/entities/control-point-image'
import { SURVEY_STATUS_LABEL, SURVEY_STATUS_TONE, deriveSurveyStatus } from '@/entities/survey-record'
import type { SurveyResult } from '@/entities/survey-record'
import { ApiError } from '@/shared/api/http'
import {
  SUPPORTED_LABEL,
  currentLocalDateTime,
  extractCapturedAt,
  localDateTimeToOffset,
  prepareControlPointImage,
} from '@/shared/lib/controlPointImage'
import { CHIP_BTN, FIELD_AREA } from '@/shared/ui/classes'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'

/** 고를 수 있는 판정. 미조사는 여기 없다 — 현장에 다녀와 사진을 남기면서 '안 봤다'를 고를 수는 없다. */
const CHOICES: SurveyResult[] = ['INTACT', 'LOST', 'UNAVAILABLE', 'ETC']

const PREVIEW_BOX = 'flex h-[132px] w-full items-center justify-center'

interface ControlPointImageUploadProps {
  projectId: string
  pointId: string
  /** 지금 기록된 판정 — 창을 열 때 미리 골라 둔다. 미조사면 null */
  result: SurveyResult | null
  /** 등록에 성공했다. 알림과 목록 갱신은 화면 전체를 아는 쪽이 한다 */
  onSuccess: () => void
  /** 창 밖에서 알려야 할 실패 — 받는 쪽이 토스트로 띄운다 */
  onError: (message: string) => void
}

/** 사진을 고른 뒤 등록을 확정하기까지 들고 있는 값. */
interface Draft {
  file: File
  /** EXIF 에서 읽은 촬영 시각. 없으면 null 이고 사용자가 직접 적는다 */
  capturedAt: string | null
  /** capturedAt 이 null 일 때 쓰는 입력값 */
  localDateTime: string
  result: SurveyResult
  note: string
}

export function ControlPointImageUpload(props: ControlPointImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const mutation = useUploadControlPointImageMutation()
  const imageQuery = useControlPointImageQuery(props.projectId, props.pointId)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const image = imageQuery.data ?? null
  // 사진 정보를 못 받은 것과 사진 파일을 못 받은 것은 사용자에게 같은 일이다 — 사진이 안 보인다
  const loadFailed = imageQuery.isError || previewFailed

  useEffect(() => {
    if (image === null) {
      setPreviewUrl(null)
      setPreviewFailed(false)
      return
    }
    let active = true
    let objectUrl: string | null = null
    setPreviewUrl(null)
    setPreviewFailed(false)
    void fetchControlPointImageFile(image.id)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      })
      .catch(() => {
        if (active) setPreviewFailed(true)
      })
    return () => {
      active = false
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl)
    }
  }, [image, reloadKey])

  // 알림은 카드 밖으로 내보내므로 부모가 바뀌어도 같은 실패로 두 번 뜨지 않게 최신 함수만 들고 있는다
  const notify = useRef(props.onError)
  notify.current = props.onError
  const notified = useRef(false)
  useEffect(() => {
    if (!loadFailed) {
      notified.current = false
      return
    }
    if (notified.current) return
    notified.current = true
    notify.current('기준점 사진을 불러오지 못했습니다.')
  }, [loadFailed])

  function reload() {
    setPreviewFailed(false)
    setReloadKey((count) => count + 1)
    void imageQuery.refetch()
  }

  async function select(file: File | undefined) {
    if (file === undefined) return
    if (inputRef.current !== null) inputRef.current.value = ''
    try {
      const capturedAt = await extractCapturedAt(file)
      setDialogError(null)
      setDraft({
        file,
        capturedAt,
        localDateTime: currentLocalDateTime(),
        // 지금 기록이 있으면 그것을 처음 값으로 둔다. 대개 지난번과 같은 판정이라 손이 덜 간다
        result: props.result ?? 'INTACT',
        note: '',
      })
    } catch (error) {
      props.onError(messageOf(error))
    }
  }

  async function confirm() {
    if (draft === null) return
    setSaving(true)
    setDialogError(null)
    try {
      const capturedAt = draft.capturedAt ?? localDateTimeToOffset(draft.localDateTime)
      const prepared = await prepareControlPointImage(draft.file, capturedAt)
      const note = draft.result === 'ETC' && draft.note.trim() !== '' ? draft.note.trim() : null
      await mutation.mutateAsync({
        projectId: props.projectId,
        pointId: props.pointId,
        result: draft.result,
        note,
        ...prepared,
      })
      setDraft(null)
      props.onSuccess()
    } catch (error) {
      // 창이 떠 있는 동안의 실패는 이 자리에서 알린다 — 뒤쪽에 띄우면 배경 딤에 가려 보이지 않는다
      setDialogError(messageOf(error))
    } finally {
      setSaving(false)
    }
  }

  async function download() {
    if (image === null) return
    setDownloading(true)
    try {
      await downloadControlPointImage(image)
    } catch (error) {
      props.onError(messageOf(error))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mt-2.5 border-t border-line-soft pt-2.5">
      {(image !== null || loadFailed) && (
        <div className="mb-2.5 overflow-hidden rounded-chip border border-line-soft bg-field">
          {loadFailed ? (
            // 무엇이 잘못됐는지는 토스트가 말했다. 여기 남는 것은 다시 해 볼 자리 하나다
            <div className={PREVIEW_BOX}>
              <button
                type="button"
                onClick={reload}
                aria-label="사진 다시 불러오기"
                title="다시 불러오기"
                className="flex size-9 items-center justify-center rounded-full border border-line-btn text-ink-3 transition-colors hover:bg-hover hover:text-ink-2"
              >
                <ReloadIcon className="size-4" />
              </button>
            </div>
          ) : previewUrl === null ? (
            <div className={`${PREVIEW_BOX} text-[11px] text-ink-3`}>사진 불러오는 중…</div>
          ) : (
            <img src={previewUrl} alt="등록한 사진" className="h-[132px] w-full object-cover" />
          )}
          {image !== null && (
            <div className="flex items-center gap-2 border-t border-line-soft px-2.5 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] text-ink-2">{image.originalFileName}</p>
                <p className="mt-0.5 text-[10.5px] text-ink-3">촬영 {formatCapturedAt(image.capturedAt)}</p>
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
          )}
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
        onClick={() => inputRef.current?.click()}
      >
        {image === null ? '사진 등록' : '사진 교체'}
      </button>
      <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-3">{SUPPORTED_LABEL} 파일을 올릴 수 있습니다.</p>

      {draft !== null && (
        <ConfirmDialog
          message="기준점 사진 등록"
          detail={(
            <div className="text-left">
              {/* 사진만으로는 정상인지 망실인지 가릴 수 없다. 올리는 사람이 그 자리에서 고른다 */}
              <p className="mb-2 text-center">현장에서 본 상태를 함께 남깁니다.</p>
              <span className="block text-[11.5px] text-ink-2">판정</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {CHOICES.map((choice) => {
                  const status = deriveSurveyStatus(choice)
                  const picked = draft.result === choice
                  return (
                    <button
                      key={choice}
                      type="button"
                      disabled={saving}
                      aria-pressed={picked}
                      onClick={() => setDraft({ ...draft, result: choice })}
                      className={`rounded-chip border px-2.5 py-[5px] text-[12px] font-medium transition-colors disabled:opacity-50 ${
                        picked ? SURVEY_STATUS_TONE[status] : 'border-line-btn bg-transparent text-ink-3 hover:bg-hover'
                      }`}
                    >
                      {SURVEY_STATUS_LABEL[status]}
                    </button>
                  )
                })}
              </div>

              {draft.result === 'ETC' && (
                <label className="mt-2 block text-[11.5px] text-ink-2">
                  비고
                  <textarea
                    value={draft.note}
                    disabled={saving}
                    placeholder="현장 상태·참고 사항"
                    className={`${FIELD_AREA} mt-1 h-14`}
                    onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                  />
                </label>
              )}

              <label className="mt-2 block text-[11.5px] text-ink-2">
                촬영 날짜와 시간
                {draft.capturedAt === null ? (
                  <input
                    type="datetime-local"
                    step="1"
                    value={draft.localDateTime}
                    disabled={saving}
                    className="mt-1 h-9 w-full rounded-chip border border-line bg-field px-2.5 text-[12.5px] text-ink outline-none focus:border-teal"
                    onChange={(event) => setDraft({ ...draft, localDateTime: event.target.value })}
                  />
                ) : (
                  <span className="mt-1 block text-[12.5px] text-ink">{formatCapturedAt(draft.capturedAt)}</span>
                )}
              </label>
              {/* 사진에 촬영 정보가 없을 때만 뜬다 — 조사일이 이 값을 따르므로 맞는지 한 번 보게 한다 */}
              {draft.capturedAt === null && (
                <p className="mt-1 text-[11px] text-ink-3">
                  사진에 촬영 정보가 없어 현재 시간을 넣었습니다. 다르면 고쳐 주세요.
                </p>
              )}
            </div>
          )}
          error={dialogError ?? undefined}
          confirmLabel="등록"
          cancelLabel="취소"
          busy={saving}
          busyLabel="등록 중…"
          confirmDisabled={draft.capturedAt === null && draft.localDateTime === ''}
          onConfirm={() => void confirm()}
          onCancel={() => setDraft(null)}
        />
      )}
    </div>
  )
}

function ReloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return '사진을 처리하지 못했습니다. 다른 사진으로 다시 시도해 주세요.'
}

function formatCapturedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date)
}
