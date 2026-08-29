import { useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  downloadControlPointImage,
  useControlPointImageFileQuery,
  useControlPointImageQuery,
  useUploadControlPointImageMutation,
} from '@/entities/control-point-image'
import { SurveyResultPicker } from '@/entities/survey-record'
import type { SurveyResult } from '@/entities/survey-record'
import { ApiError } from '@/shared/api/http'
import {
  currentLocalDateTime,
  extractCapturedAt,
  IMAGE_PICKER_ACCEPT,
  localDateTimeToOffset,
  prepareControlPointImage,
} from '@/shared/lib/controlPointImage'
import { useDialogBehavior } from '@/shared/lib/useDialogBehavior'
import { Skeleton } from '@/shared/ui/Skeleton'
import { Spinner } from '@/shared/ui/Spinner'
import { CHIP_BTN, FIELD, FIELD_AREA } from '@/shared/ui/classes'
import { FormActions } from '@/shared/ui/FormActions'
import { Modal, ModalField } from '@/shared/ui/Modal'

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
  /**
   * 변환까지 마친 WebP.
   *
   * <p>고른 원본이 아니라 변환한 결과를 든다. 미리보기와 전송이 같은 것을 가리켜 화면에서 본 그림이
   * 그대로 저장되고, 변환도 한 번만 한다. HEIC 원본은 브라우저가 그리지 못하므로 이 순서가 아니면
   * 아이폰 사진의 미리보기가 빈칸으로 뜬다.
   */
  image: File
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
  const [downloading, setDownloading] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [draftUrl, setDraftUrl] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [saving, setSaving] = useState(false)
  /** 사진을 화면 가득 펼쳐 보는 중 */
  const [viewing, setViewing] = useState(false)

  const image = imageQuery.data ?? null
  const fileQuery = useControlPointImageFileQuery(image?.id ?? null)
  // 사진 정보를 못 받은 것과 사진 파일을 못 받은 것은 사용자에게 같은 일이다 — 사진이 안 보인다
  const loadFailed = imageQuery.isError || fileQuery.isError

  // 캐시에 든 것은 Blob 이고, 그리기용 주소는 여기서 만들고 거둔다
  const blob = fileQuery.data ?? null
  useEffect(() => {
    if (blob === null) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  // 알림은 카드 밖으로 내보낸다. 늘 최신 onError 를 부르되 그 함수가 바뀌었다는 이유만으로 효과가
  // 다시 돌지는 않아야 한다 — 부모가 다시 그려질 때마다 같은 실패가 또 뜬다
  const notify = useEffectEvent((message: string) => props.onError(message))
  const notified = useRef(false)
  useEffect(() => {
    if (!loadFailed) {
      notified.current = false
      return
    }
    if (notified.current) return
    notified.current = true
    notify('기준점 사진을 불러오지 못했습니다.')
  }, [loadFailed])

  // 고른 사진의 미리보기 — 서버에 올리기 전이라 브라우저가 들고 있는 것을 그대로 그린다.
  // 창 안에서 상태를 바꿔도 다시 만들지 않게 파일만 지켜본다
  const draftImage = draft?.image ?? null
  useEffect(() => {
    if (draftImage === null) {
      setDraftUrl(null)
      return
    }
    const url = URL.createObjectURL(draftImage)
    setDraftUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [draftImage])

  function reload() {
    void imageQuery.refetch()
    void fileQuery.refetch()
  }

  async function select(file: File | undefined) {
    if (file === undefined) return
    if (inputRef.current !== null) inputRef.current.value = ''
    setPreparing(true)
    try {
      const capturedAt = await extractCapturedAt(file)
      const localDateTime = currentLocalDateTime()
      // 창을 열기 전에 변환한다 — 창에 띄울 미리보기가 곧 전송할 그림이다
      const prepared = await prepareControlPointImage(file, capturedAt ?? localDateTimeToOffset(localDateTime))
      setDraft({
        image: prepared.image,
        capturedAt,
        localDateTime,
        // 지금 기록이 있으면 그것을 처음 값으로 둔다. 대개 지난번과 같은 판정이라 손이 덜 간다
        result: props.result ?? 'INTACT',
        note: '',
      })
    } catch (error) {
      props.onError(messageOf(error))
    } finally {
      setPreparing(false)
    }
  }

  async function confirm() {
    if (draft === null) return
    setSaving(true)
    try {
      const note = draft.result === 'ETC' && draft.note.trim() !== '' ? draft.note.trim() : null
      await mutation.mutateAsync({
        projectId: props.projectId,
        pointId: props.pointId,
        image: draft.image,
        // 창에서 고친 값이 있으면 그것을 따른다 — 변환은 이미 끝났고 시각만 여기서 확정된다
        capturedAt: draft.capturedAt ?? localDateTimeToOffset(draft.localDateTime),
        result: draft.result,
        note,
      })
      setDraft(null)
      props.onSuccess()
    } catch (error) {
      /*
       * 실패는 토스트로 알린다. 창 안에 문구를 세우면 뜰 때마다 버튼 줄이 밀려 자리가 들쭉날쭉해진다.
       * 토스트는 팝오버로 떠서 showModal 로 열린 이 창보다 위에 서므로 딤에 가리지 않는다(shared/ui/Toast).
       * 창은 닫지 않는다 — 고른 사진과 적은 값을 그대로 두고 다시 누를 수 있어야 한다.
       */
      props.onError(messageOf(error))
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
            <Skeleton className="h-[132px] w-full rounded-none" />
          ) : (
            /* 눌러서 크게 본다 — 미리보기는 132px 로 잘라 보여 주므로 사진에 무엇이 찍혔는지는 여기서 다 읽히지 않는다.
               아래 정보·다운로드 줄은 각자 제 일이 있어 이 자리에서 뺀다 */
            <button
              type="button"
              onClick={() => setViewing(true)}
              title="사진 크게 보기"
              aria-label="사진 크게 보기"
              className="block w-full cursor-zoom-in"
            >
              <img src={previewUrl} alt="등록한 사진" className="h-[132px] w-full object-cover" />
            </button>
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
                className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-teal-text disabled:opacity-50"
                onClick={() => void download()}
              >
                {downloading && <Spinner className="size-3" current />}
                {downloading ? '다운로드 중' : '다운로드'}
              </button>
            </div>
          )}
        </div>
      )}

      {/*
        고르는 자리는 라벨이고 버튼이 아니다 — 아이폰 사파리는 스크립트로 부른 input.click() 을 사진 보관함으로
        잇지 못하는 경우가 있다. 라벨은 브라우저가 직접 잇는 길이라 그 틈이 없다.

        받는 형식은 image/* 하나로 둔다. 확장자(.heic 같은)를 섞어 적으면 아이폰 사진 보관함이 그 목록에 맞는
        항목이 없다고 보아 사진을 전부 고를 수 없게 만든다. 형식 판정은 고른 뒤 파일 이름으로 우리가 한다
        (브라우저에 따라 이 값을 비우는 이유는 IMAGE_PICKER_ACCEPT 참고)
      */}
      <label
        // 라벨은 기본이 인라인이라 높이가 먹지 않는다 — 버튼과 같은 상자로 세운다.
        // 포커스 링도 라벨이 대신 두른다 — 실제로 포커스를 받는 칸은 눈에서 감춰 두어(sr-only) 제 링을
        // 그려도 보이지 않는다. 키보드로 다니는 사람에게는 이 링이 지금 어디에 서 있는지를 알리는 유일한 표시다
        className={`${CHIP_BTN} flex h-9 w-full items-center justify-center gap-1.5 text-[12.5px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-teal-edge ${
          preparing ? 'pointer-events-none opacity-60' : 'cursor-pointer'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_PICKER_ACCEPT}
          className="sr-only"
          disabled={preparing}
          onChange={(event) => void select(event.target.files?.[0])}
        />
        {preparing && <Spinner className="size-3.5" current />}
        {preparing ? '처리 중' : image === null ? '사진 등록' : '사진 교체'}
      </label>

      {viewing && previewUrl !== null && (
        <ImageViewer url={previewUrl} caption={image?.originalFileName ?? null} onClose={() => setViewing(false)} />
      )}

      {draft !== null && (
        <Modal
          title="기준점 사진 등록"
          busy={saving}
          onClose={() => setDraft(null)}
          onSubmit={() => void confirm()}
          footer={(
            <FormActions
              submitType="submit"
              submitLabel="등록"
              busyLabel="등록 중"
              busy={saving}
              submitDisabled={draft.capturedAt === null && draft.localDateTime === ''}
              onCancel={() => setDraft(null)}
            />
          )}
        >
          {draftUrl !== null && (
            <img
              src={draftUrl}
              alt="고른 사진"
              className="h-[168px] w-full rounded-chip border border-line-soft bg-field object-contain"
            />
          )}

          {/* 사진만으로는 정상인지 망실인지 가릴 수 없다. 올리는 사람이 그 자리에서 고른다.
              상세 카드에서 쓰는 그 드롭다운이고, 미조사는 빼 둔다 — 현장에 다녀와 '안 봤다'를 고를 수는 없다 */}
          <ModalField label="상태" required>
            <SurveyResultPicker
              result={draft.result}
              disabled={saving}
              allowNone={false}
              onSelect={(choice) => {
                if (choice === 'NONE') return
                setDraft({ ...draft, result: choice })
              }}
            />
          </ModalField>

          {draft.result === 'ETC' && (
            <ModalField label="비고">
              <textarea
                value={draft.note}
                disabled={saving}
                placeholder="현장 상태·참고 사항"
                className={`${FIELD_AREA} h-16`}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              />
            </ModalField>
          )}

          <ModalField label="촬영 일시" required>
            {draft.capturedAt === null ? (
              <input
                type="datetime-local"
                step="1"
                required
                value={draft.localDateTime}
                disabled={saving}
                className={FIELD}
                onChange={(event) => setDraft({ ...draft, localDateTime: event.target.value })}
              />
            ) : (
              <span className="block text-[12.5px] text-ink">{formatCapturedAt(draft.capturedAt)}</span>
            )}
          </ModalField>
        </Modal>
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

/**
 * 사진을 화면 가득 펼쳐 본다.
 *
 * <p>상세의 미리보기는 132px 로 잘라 보여 준다 — 어떤 사진이 붙어 있는지는 알리지만 무엇이 찍혔는지는
 * 그 안에서 다 읽히지 않는다. 그래서 누르면 받아 둔 그 파일을 그대로, 화면에 들어가는 한 크게 띄운다.
 *
 * <p>배경은 어둡게 덮는다. 사진 밖의 것이 눈에 남아 있으면 잘린 자리와 화면의 경계가 섞여 보인다.
 * 그 어두운 자리를 누르면 닫힌다 — 사진 자체는 눌러도 닫히지 않는다(확대해 보려다 닫히면 안 된다).
 *
 * <p>native dialog 로 연다. 최상위 겹으로 올라가 시트·창의 transform·overflow 를 타지 않고,
 * Esc 와 포커스 되돌리기를 브라우저가 맡는다(앱의 다른 창과 같은 규칙).
 */
function ImageViewer(props: { url: string; caption: string | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useDialogBehavior({ dialogRef, onClose: props.onClose })

  return (
    <dialog ref={dialogRef} aria-label="사진 크게 보기" className="m-0 max-h-none max-w-none border-0 bg-transparent p-0">
      <div className="fixed inset-0 z-50 flex flex-col bg-black/85" onClick={props.onClose}>
        <div className="flex shrink-0 items-center justify-end p-2">
          <button
            type="button"
            onClick={props.onClose}
            aria-label="닫기"
            title="닫기"
            className="flex size-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-3">
          <img
            src={props.url}
            alt="등록한 사진"
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        {props.caption !== null && (
          <p className="shrink-0 truncate px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] text-center text-[12px] text-white/70">
            {props.caption}
          </p>
        )}
      </div>
    </dialog>
  )
}
