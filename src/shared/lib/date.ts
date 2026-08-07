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
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (matched === null) return iso
  const [, year, month, day] = matched
  return `${year}. ${Number(month)}. ${Number(day)}.`
}

/**
 * 시각을 한국 날짜로. 서버가 최종조사일을 KST 로 뽑는 것과 같은 규칙이라 두 줄이 어긋나지 않는다.
 * 날짜만 오는 값은 formatDate 를 쓴다 — 이쪽은 시각이 실려 오는 값 전용이다.
 */
export function formatKstDate(iso: string): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return iso
  return at.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric' })
}
