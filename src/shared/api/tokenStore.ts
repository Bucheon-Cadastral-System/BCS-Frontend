/**
 * 인증이 끊긴 사유 — 안내와 보낼 곳이 갈리므로 끊는 쪽이 밝힌다.
 *
 * <p>`expired` 는 뜻하지 않게 끊긴 것(갱신 실패)이고 `signed-out` 은 사용자가 스스로 나간 것이다.
 * 스스로 나간 사람에게 만료를 알리면 사실과 다른 말이 된다.
 */
export type AuthenticationLostReason = 'expired' | 'signed-out'

let accessToken: string | null = null
let authenticationVersion = 0
const authenticationLostListeners = new Set<(reason: AuthenticationLostReason) => void>()

export function getAccessToken() { return accessToken }
export function getAuthenticationVersion() { return authenticationVersion }
export function setAccessToken(token: string | null, reason: AuthenticationLostReason = 'expired') {
  const authenticationLost = accessToken !== null && token === null
  accessToken = token
  if (authenticationLost) authenticationLostListeners.forEach((listener) => listener(reason))
}

export function subscribeAuthenticationLost(listener: (reason: AuthenticationLostReason) => void): () => void {
  authenticationLostListeners.add(listener)
  return () => authenticationLostListeners.delete(listener)
}

/** 진행 중인 토큰 갱신 결과까지 무효화하고 로컬 인증을 종료한다. */
export function invalidateAuthentication(reason: AuthenticationLostReason = 'expired') {
  authenticationVersion += 1
  setAccessToken(null, reason)
}
