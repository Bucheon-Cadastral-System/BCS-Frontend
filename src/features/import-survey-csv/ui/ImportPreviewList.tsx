import type { PreviewEntry, PreviewStatus } from '../model/useImportPreviews'
import { rowErrorLines } from '../model/readFile'
import { STATUS_ROW, STATUS_ROW_TONE } from '@/shared/ui/statusRow'
import { StatusIcon } from '@/shared/ui/StatusIcon'
import type { StatusTone } from '@/shared/ui/statusRow'
import { MODAL_BLEED } from '@/shared/ui/Modal'
import { PROGRESS_FILL } from '@/shared/ui/classes'

const ROW_TONE: Partial<Record<PreviewStatus['kind'], StatusTone>> = { done: 'success', failed: 'danger' }

/** 읽는 중인 파일들의 상태 목록. 창을 새로 띄우지 않고 고르는 자리에서 그대로 보여 준다. */
export function ImportPreviewList({ entries }: { entries: PreviewEntry[] }) {
  return (
    // 창 너비를 다 쓰는 줄 목록 — 파일마다 테두리를 두르면 개수가 많을 때 상자가 겹겹이 쌓여 읽기 어렵다.
    // 위아래 모두 창의 선(머리말·버튼 줄)에 바로 붙인다: 사이를 띄우면 빈 띠와 겹선이 남는다.
    <ul className={`${MODAL_BLEED} divide-y divide-line-row`}>
      {/* 이름·수정시각이 같은 파일을 함께 올릴 수 있어 키는 붙인 순서로 잡는다 */}
      {entries.map((entry, index) => (
        // 읽기를 마친 줄은 바탕을 옅게 물들여 결과가 목록에서 바로 읽히게 한다
        <li key={index} className={`${STATUS_ROW} ${STATUS_ROW_TONE[ROW_TONE[entry.status.kind] ?? 'none']}`}>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[13px] text-ink-2">{entry.file.name}</span>
            <ProgressBar status={entry.status} />
            <StatusText status={entry.status} />
          </div>
          <StatusMark status={entry.status} />
        </li>
      ))}
    </ul>
  )
}

function StatusMark({ status }: { status: PreviewStatus }) {
  if (status.kind === 'done') return <StatusIcon shape="check" label="읽음" />
  if (status.kind === 'failed') return <StatusIcon shape="warn" label="실패" />
  return <span className="shrink-0 text-[11px] text-ink-3">{percentLabel(status)}</span>
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
    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-track">
      {reading ? (
        <div className="progress-wave h-full w-full rounded-full" />
      ) : (
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${PROGRESS_FILL}`}
          style={{ width: `${status.kind === 'uploading' ? status.percent : 0}%` }}
        />
      )}
    </div>
  )
}

function StatusText({ status }: { status: PreviewStatus }) {
  if (status.kind === 'failed') {
    return <p className="mt-1 text-[11px] text-danger">{status.reason}</p>
  }
  if (status.kind !== 'done') return null

  // 담당자가 손쓸 수 있는 것만 알린다 — 대상 건수와 고쳐야 할 행.
  const { totalRows, errors } = status.preview
  if (errors.length > 0) {
    return (
      <div className="mt-1 text-[11px] leading-[1.5] text-amber">
        <p>
          {totalRows}건 중 {errors.length}건 오류
        </p>
        <ul className="mt-1 space-y-[3px]">
          {rowErrorLines(errors, 2).map((line) => (
            <li key={line} className="flex gap-1.5">
              <span aria-hidden>·</span>
              <span className="min-w-0 flex-1">{line}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  return <p className="mt-1 text-[11px] text-ink-3">대상 <span >{totalRows}</span>건</p>
}
