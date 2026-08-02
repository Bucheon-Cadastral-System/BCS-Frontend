/**
 * 오늘 날짜 (YYYY-MM-DD).
 * `toISOString()` 은 UTC 기준이라 한국 시각으로 자정 직후엔 하루 전 날짜가 나오므로 로컬 값으로 만든다.
 */
export function today(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * YYYY-MM-DD 를 표시용(2026. 7. 1.)으로. 날짜 문자열 자체가 권위값이므로 Date 로 바꾸지 않는다 —
 * `new Date('2026-07-01')` 은 UTC 자정으로 읽혀 한국 시각에선 하루 전으로 보인다.
 */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  if (year === undefined || month === undefined || day === undefined) return iso
  return `${year}. ${Number(month)}. ${Number(day)}.`
}
