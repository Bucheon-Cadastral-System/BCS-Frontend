/** 진행률(%) — 분모가 0이면 0. 표시용 반올림 정수. */
export function percent(value: number, total: number): number {
  return total ? Math.round((value / total) * 100) : 0
}
