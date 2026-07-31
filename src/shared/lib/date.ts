/**
 * 오늘 날짜 (YYYY-MM-DD).
 * `toISOString()` 은 UTC 기준이라 한국 시각으로 자정 직후엔 하루 전 날짜가 나오므로 로컬 값으로 만든다.
 */
export function today(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
