import type { PreviewEntry, PreviewStatus } from '../model/useImportPreviews'
import type { ImportFilePreview } from '../api/previewImportFile'
import { hasRowErrors, rowErrorLines } from '../model/readFile'
import { STATUS_ROW, STATUS_ROW_TONE } from '@/shared/ui/statusRow'
import { StatusIcon } from '@/shared/ui/StatusIcon'
import type { StatusTone } from '@/shared/ui/statusRow'
import { MODAL_BLEED } from '@/shared/ui/Modal'
import { PROGRESS_FILL } from '@/shared/ui/classes'

/**
 * 다른 용도의 파일을 올렸는지 알아차릴 단서 — 어느 쪽이든 등록은 막지 않는다.
 * 이 서식에만 있는 열이 없는 서식(기준점)은 빠진 열로 가려낼 수 없어 다른 서식의 열이 있는지로 본다.
 */
function noticesOf(preview: ImportFilePreview) {
  return [
    { title: '이 서식에 있어야 할 열이 없습니다', columns: preview.missingColumns },
    { title: '다른 서식에만 있는 열이 있습니다', columns: preview.foreignColumns },
  ].filter((notice) => notice.columns.length > 0)
}

/** 줄 바탕 — 읽기를 마쳤어도 고칠 행이나 확인할 것이 남았으면 성공으로 물들이지 않는다 */
function rowTone(status: PreviewStatus): StatusTone {
  if (status.kind === 'failed') return 'danger'
  if (status.kind !== 'done') return 'none'
  if (hasRowErrors(status.preview)) return 'danger'
  return status.preview.warnings.length > 0 || noticesOf(status.preview).length > 0 ? 'caution' : 'success'
}

/**
 * 읽는 중인 파일들의 상태 목록. 창을 새로 띄우지 않고 고르는 자리에서 그대로 보여 준다.
 * 같은 서식을 조사 대상지로도 기준점으로도 올리므로, 건수를 무엇으로 부를지는 쓰는 쪽이 정한다.
 */
export function ImportPreviewList({ entries, unit = '대상' }: { entries: PreviewEntry[]; unit?: string }) {
  return (
    // 창 너비를 다 쓰는 줄 목록 — 파일마다 테두리를 두르면 개수가 많을 때 상자가 겹겹이 쌓여 읽기 어렵다.
    // 위아래 모두 창의 선(머리말·버튼 줄)에 바로 붙인다: 사이를 띄우면 빈 띠와 겹선이 남는다.
    // 행 사이 선은 가장 진한 선 토큰으로 — 톤 바탕이 깔린 줄 사이에서 흐린 선은 묻힌다
    <ul className={`${MODAL_BLEED} divide-y divide-line-btn`}>
      {/* 이름·수정시각이 같은 파일을 함께 올릴 수 있어 키는 붙인 순서로 잡는다 */}
      {entries.map((entry, index) => {
        const tone = rowTone(entry.status)
        return (
          // 읽기를 마친 줄은 바탕을 옅게 물들여 결과가 목록에서 바로 읽히게 한다
          <li key={index} className={`${STATUS_ROW} ${STATUS_ROW_TONE[tone]}`}>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">{entry.file.name}</span>
              <ProgressBar status={entry.status} />
              <StatusText status={entry.status} unit={unit} />
            </div>
            <StatusMark status={entry.status} />
          </li>
        )
      })}
    </ul>
  )
}

function StatusMark({ status }: { status: PreviewStatus }) {
  // 읽기에 성공해도 고칠 행이 남았으면 등록할 수 없다 — 체크는 그대로 쓸 수 있는 파일에만 준다
  if (status.kind === 'done') {
    if (hasRowErrors(status.preview)) return <StatusIcon shape="warn" label="등록 불가" />
    if (status.preview.warnings.length > 0 || noticesOf(status.preview).length > 0) {
      return <StatusIcon shape="caution" label="확인 필요" />
    }
    return <StatusIcon shape="check" label="읽음" />
  }
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

function StatusText({ status, unit }: { status: PreviewStatus; unit: string }) {
  if (status.kind === 'failed') {
    return <p className="mt-1 break-keep text-[11px] leading-[1.5] wrap-anywhere text-danger">{status.reason}</p>
  }
  if (status.kind !== 'done') return null

  // 담당자가 손쓸 수 있는 것만 알린다 — 대상 건수와 고쳐야 할 행.
  const { totalRows, errors } = status.preview
  const notices = noticesOf(status.preview)
  if (errors.length > 0) {
    return (
      <div className="mt-1 break-keep text-[11px] leading-[1.5] wrap-anywhere text-danger">
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
  const warnings = status.preview.warnings
  return (
    <>
      <p className="mt-1 text-[11px] text-ink-3">{unit} {totalRows}건</p>
      {/* 등록은 막지 않는다 — 좌표계구분이 잘못된 행이 여기서 드러나므로 행 번호와 사유를 그대로 보여 준다 */}
      {warnings.length > 0 && (
        <div className="mt-1 break-keep text-[11px] leading-[1.5] wrap-anywhere text-amber">
          <p>확인이 필요한 행 {warnings.length}건</p>
          <ul className="mt-1 space-y-[3px]">
            {rowErrorLines(warnings, 2).map((line) => (
              <li key={line} className="flex gap-1.5">
                <span aria-hidden>·</span>
                <span className="min-w-0 flex-1">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* 등록을 막지는 않는다 — 다른 용도의 파일을 잘못 올렸는지 담당자가 판단할 단서다.
          줄 바탕과 오른쪽 삼각형이 이미 확인할 것이 있다고 알리므로 글에는 상자를 두르지 않는다 */}
      {notices.length > 0 && (
        <div className="mt-1 space-y-1.5 break-keep text-[11px] leading-[1.5] wrap-anywhere text-amber">
          {notices.map((notice) => (
            <div key={notice.title}>
              <p>{notice.title}</p>
              <ul className="mt-1 space-y-[3px]">
                {notice.columns.map((column) => (
                  <li key={column} className="flex gap-1.5">
                    <span aria-hidden>·</span>
                    <span className="min-w-0 flex-1">{column}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {/* 두 단서가 함께 나와도 확인할 것은 하나라 안내는 마지막에 한 번만 둔다 */}
          <p className="text-ink-3">다른 용도의 파일이 아닌지 확인해 주세요.</p>
        </div>
      )}
    </>
  )
}
