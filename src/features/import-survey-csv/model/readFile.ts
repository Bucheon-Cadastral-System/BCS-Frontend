import type { SurveyCsvPreview } from '../api/previewSurveyCsv'

/** 서버가 읽어 본 파일 한 건 — 파일 자체와 그 결과를 함께 들고 다닌다. */
export interface ReadFile {
  file: File
  preview: SurveyCsvPreview
}

/** 읽어 둔 파일의 요약 한 줄 — 등록하기 전에 대상이 몇 건인지 보인다. */
export function summaryOf(read: ReadFile): string {
  const { totalRows, errors } = read.preview
  return errors.length > 0 ? `대상 ${totalRows}건 · 오류 ${errors.length}건` : `대상 ${totalRows}건`
}

/**
 * 등록을 막아야 하는 이유 — 서버는 잘못된 행이 하나라도 있으면 파일 전체를 거부한다.
 * 보내 봐야 같은 사유로 실패하므로 미리 막고 어디를 고쳐야 하는지 알린다.
 */
export function blockingReasonOf(read: ReadFile): string | undefined {
  const { errors } = read.preview
  if (errors.length === 0) return undefined
  return `잘못된 행이 있어 등록할 수 없습니다. 파일을 고쳐 다시 올려 주세요 — ${rowErrorSummary(errors)}`
}

/** 고쳐야 할 행 표기 — 목록이 길어도 앞의 몇 건만 적고 나머지는 개수로 줄인다. */
export function rowErrorSummary(errors: SurveyCsvPreview['errors'], limit = 2): string {
  const head = errors.slice(0, limit).map((e) => `${e.row}행 ${e.message}`).join(' / ')
  return errors.length > limit ? `${head} 외 ${errors.length - limit}건` : head
}
