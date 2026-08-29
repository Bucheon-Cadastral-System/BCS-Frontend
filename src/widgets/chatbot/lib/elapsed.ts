/** 기다리는 동안 세는 시간 — 1분을 넘으면 분과 초로 끊는다. */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}초`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes}분` : `${minutes}분 ${rest}초`
}

/** 답변에 붙는 소요 시간 — 10초 미만은 소수 한 자리까지 적는다. 빠른 답은 그 차이가 눈에 띈다. */
export function formatElapsed(ms: number): string {
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)}초`
  return formatSeconds(Math.round(ms / 1000))
}

/**
 * 기다리는 동안의 안내.
 *
 * <p>모델이 도구를 여러 번 부르면 답이 늦는다. 아무 말도 없으면 멈춘 것으로 읽히므로,
 * 초가 쌓이는 동안 무엇을 기다리는지 단계마다 달리 적는다.
 */
export function waitingLabel(seconds: number, waiting: boolean): string {
  if (waiting) return '답변을 계속 만들고 있습니다'
  if (seconds > 45) return '응답이 늦어지고 있습니다'
  if (seconds > 15) return '자료를 찾고 있습니다'
  return ''
}
