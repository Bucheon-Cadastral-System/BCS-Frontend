import { MODAL_CANCEL_BTN, MODAL_SUBMIT_BTN, Modal } from '@/shared/ui/Modal'
import { useImportPreviews } from '../model/useImportPreviews'
import type { PreviewEntry, PreviewStatus } from '../model/useImportPreviews'
import type { SurveyCsvPreview } from '../api/previewSurveyCsv'

export interface ReadFile {
  file: File
  preview: SurveyCsvPreview
}

/**
 * 붙인 파일을 차례로 읽어 보며 상태를 보여 준다.
 * 다 읽고 나면 성공한 파일만 넘겨 조사 입력으로 이어진다 — 실패한 파일은 고쳐서 다시 올려야 한다.
 */
export function ImportProgressModal(props: {
  files: File[]
  onReady: (read: ReadFile[]) => void
  onCancel: () => void
}) {
  const { entries, finished } = useImportPreviews(props.files)
  const succeeded = entries.filter((e) => e.status.kind === 'done')
  const failedCount = entries.length - succeeded.length

  function proceed() {
    props.onReady(
      succeeded.map((e) => ({
        file: e.file,
        preview: (e.status as { kind: 'done'; preview: SurveyCsvPreview }).preview,
      })),
    )
  }

  return (
    <Modal
      title="대상지 파일 읽는 중"
      description={`${props.files.length}개 파일을 차례로 확인합니다.`}
      busy={!finished}
      onClose={props.onCancel}
      footer={
        <>
          <button type="button" className={MODAL_CANCEL_BTN} onClick={props.onCancel}>
            {finished ? '닫기' : '취소'}
          </button>
          <button
            type="button"
            className={MODAL_SUBMIT_BTN}
            onClick={proceed}
            disabled={!finished || succeeded.length === 0}
          >
            {finished && failedCount > 0
              ? `읽은 ${succeeded.length}개로 계속`
              : `계속 (${succeeded.length}개)`}
          </button>
        </>
      }
    >
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.file.name + entry.file.lastModified}>
            <FileRow entry={entry} />
          </li>
        ))}
      </ul>
    </Modal>
  )
}

function FileRow({ entry }: { entry: PreviewEntry }) {
  const { status } = entry
  return (
    <div className="rounded-md border border-gray-200 px-3 py-2 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] text-gray-800 dark:text-gray-200">{entry.file.name}</span>
        <StatusMark status={status} />
      </div>
      <ProgressBar status={status} />
      <StatusText status={status} />
    </div>
  )
}

function StatusMark({ status }: { status: PreviewStatus }) {
  if (status.kind === 'done') {
    return (
      <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="읽음">
        <path d="m5 13 4 4L19 7" />
      </svg>
    )
  }
  if (status.kind === 'failed') {
    return (
      <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-label="실패">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    )
  }
  return <span className="shrink-0 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">{percentLabel(status)}</span>
}

function percentLabel(status: PreviewStatus) {
  if (status.kind === 'uploading') return `${status.percent}%`
  if (status.kind === 'reading') return '읽는 중'
  return '대기'
}

function ProgressBar({ status }: { status: PreviewStatus }) {
  if (status.kind === 'done' || status.kind === 'failed') return null

  // 전송이 끝나면 남은 시간을 알 수 없다 → 채우는 대신 물결이 흐르게 해 '진행 중'만 알린다
  const reading = status.kind === 'reading'
  return (
    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      {reading ? (
        <div className="progress-wave h-full w-full rounded-full" />
      ) : (
        <div
          className="h-full rounded-full bg-blue-500 transition-[width] duration-200"
          style={{ width: `${status.kind === 'uploading' ? status.percent : 0}%` }}
        />
      )}
    </div>
  )
}

function StatusText({ status }: { status: PreviewStatus }) {
  if (status.kind === 'failed') {
    return <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{status.reason}</p>
  }
  if (status.kind !== 'done') return null

  // 담당자가 손쓸 수 있는 것만 알린다 — 대상 건수와 고쳐야 할 행.
  const { totalRows, errors } = status.preview
  if (errors.length > 0) {
    // 손봐야 하는 행이 있다 — 어디를 고쳐야 하는지 앞쪽 몇 건을 보여 준다
    return (
      <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
        {totalRows}건 중 {errors.length}건 오류 · {errors.slice(0, 2).map((e) => `${e.row}행 ${e.message}`).join(' / ')}
        {errors.length > 2 && ` 외 ${errors.length - 2}건`}
      </p>
    )
  }
  return <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">대상 {totalRows}건</p>
}
