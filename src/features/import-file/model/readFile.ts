import type { ImportFilePreview } from '../api/previewImportFile'

/**
 * 파일에 반드시 있어야 하는 열 — 서버가 요구하는 목록(ImportFileMapper.BASE_COLUMNS)과 같아야 한다.
 * 하나라도 없으면 서버가 행을 읽지 않고 파일째로 거부하므로, 파일을 고르기 전에 미리 적어 둔다.
 * 요구하는 것은 열 이름이지 칸의 값이 아니다.
 */
export const REQUIRED_COLUMNS = [
  '기준점번호',
  '종류',
  '기준점명',
  '좌표계구분',
  'X좌표',
  'Y좌표',
  '토지소재지',
  '상세주소',
  '설치일자',
  '기존조사내용',
  '기존조사일',
]

/** 서버가 읽어 본 파일 한 건 — 파일 자체와 그 결과를 함께 들고 다닌다. */
export interface ReadFile {
  file: File
  preview: ImportFilePreview
}

/** 읽어 둔 파일의 요약 한 줄 — 등록하기 전에 대상이 몇 건인지, 확인할 행이 있는지 보인다. */
export function summaryOf(read: ReadFile): string {
  const { totalRows, errors, warnings } = read.preview
  const parts = [`대상 ${totalRows}건`]
  if (errors.length > 0) parts.push(`오류 ${errors.length}건`)
  if (warnings.length > 0) parts.push(`경고 ${warnings.length}건`)
  return parts.join(' · ')
}

/** 고칠 행이 남아 등록할 수 없는 파일인지 */
export function hasRowErrors(preview: ImportFilePreview): boolean {
  return preview.errors.length > 0
}

/** 확인이 필요한 파일 — 행 경고나 서식 열 단서(빠진 열·다른 서식의 열)가 있다. 등록을 막지는 않는다. */
export function needsReview(preview: ImportFilePreview): boolean {
  return preview.warnings.length > 0 || preview.missingColumns.length > 0 || preview.foreignColumns.length > 0
}

/**
 * 보내도 바뀌는 것이 없는 파일인지 — 파일에 적힌 점이 모두 이미 등록된 값과 같다.
 * 점마다의 판정이 없으면(조사 대상지로 읽은 결과) 알 수 없으므로 보내야 한다.
 */
export function nothingToRegister(preview: ImportFilePreview): boolean {
  return preview.points !== undefined && preview.points.every((point) => point.action === 'UNCHANGED')
}

/** 등록을 막는 이유의 첫 문장 — 어디를 고쳐야 하는지는 아래 행 목록이 말한다 */
export const BLOCKED_BY_ROW_ERRORS = '잘못된 행이 있어 등록할 수 없습니다. 파일을 수정한 뒤 다시 등록해 주세요.'

/**
 * 등록을 막아야 하는 이유 — 서버는 잘못된 행이 하나라도 있으면 파일 전체를 거부한다.
 * 보내 봐야 같은 사유로 실패하므로 미리 막는다.
 */
export function blockingReasonOf(read: ReadFile): string | undefined {
  return read.preview.errors.length === 0 ? undefined : BLOCKED_BY_ROW_ERRORS
}

/**
 * 행 번호가 붙은 사유(오류·경고)를 한 줄에 하나씩. 목록이 길면 앞의 몇 건만 적고 나머지는 개수로 줄인다.
 * 한 줄로 이어 붙이면 어디서 끊어 읽어야 할지 알 수 없다.
 */
export function rowIssueLines(rows: { row: number; message: string }[], limit = 4): string[] {
  const head = rows.slice(0, limit).map((r) => `${r.row}행 · ${r.message}`)
  return rows.length > limit ? [...head, `그 밖 ${rows.length - limit}건`] : head
}
