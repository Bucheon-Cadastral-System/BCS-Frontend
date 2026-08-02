import type { PreviewEntry, PreviewStatus } from '../model/useImportPreviews'

/** 읽는 중인 파일들의 상태 목록. 창을 새로 띄우지 않고 고르는 자리에서 그대로 보여 준다. */
export function ImportPreviewList({ entries }: { entries: PreviewEntry[] }) {
  return (
    <ul className="w-full space-y-2">
      {/* 이름·수정시각이 같은 파일을 함께 올릴 수 있어 키는 붙인 순서로 잡는다 */}
      {entries.map((entry, index) => (
        <li key={index} className="rounded-md border border-gray-200 px-3 py-2 text-left dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] text-gray-800 dark:text-gray-200">
              {entry.file.name}
            </span>
            <StatusMark status={entry.status} />
          </div>
          <ProgressBar status={entry.status} />
          <StatusText status={entry.status} />
        </li>
      ))}
    </ul>
  )
}

function StatusMark({ status }: { status: PreviewStatus }) {
  if (status.kind === 'done') {
    return (
      <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="읽음">
        <path d="m5 13 4 4L19 7" />
      </svg>
    )
  }
  if (status.kind === 'failed') {
    return (
      <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" role="img" aria-label="실패">
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
    return (
      <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
        {totalRows}건 중 {errors.length}건 오류 · {errors.slice(0, 2).map((e) => `${e.row}행 ${e.message}`).join(' / ')}
        {errors.length > 2 && ` 외 ${errors.length - 2}건`}
      </p>
    )
  }
  return <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">대상 {totalRows}건</p>
}
