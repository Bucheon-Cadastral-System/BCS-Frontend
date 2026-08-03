/**
 * 결과가 붙는 목록 한 줄의 공용 사양(값).
 * 파일 읽기 목록과 창 옆 현황판이 같은 모양을 써야 해서 여백·바탕색을 여기 모아 둔다.
 */

/** 줄 한 칸 — 내용은 왼쪽에 흐르고 상태 표시는 오른쪽 끝에 세로 가운데로 붙는다 */
export const STATUS_ROW = 'flex w-full items-center gap-3 px-5 py-2.5 text-left'

/** 결과가 난 줄의 바탕 — 글자보다 한 단계 아래로 깔아 줄을 훑을 때 결과가 먼저 잡히게 한다 */
export const STATUS_ROW_TONE = {
  none: '',
  success: 'bg-teal-wash',
  danger: 'bg-danger-wash',
} as const

export type StatusTone = keyof typeof STATUS_ROW_TONE


/** 상태 표시 모양 — 성공은 체크, 제외는 X, 오류는 경고 삼각형 */
export type StatusShape = 'check' | 'cross' | 'warn' | 'muted-check'

export const SHAPE_COLOR: Record<StatusShape, string> = {
  check: 'text-teal-text',
  'muted-check': 'text-ink-4',
  cross: 'text-danger',
  warn: 'text-danger',
}
