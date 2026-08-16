let accessToken: string | null = null
let authenticationVersion = 0
const authenticationLostListeners = new Set<() => void>()
const authorizationForbiddenListeners = new Set<() => void>()

export function getAccessToken() { return accessToken }
export function getAuthenticationVersion() { return authenticationVersion }
export function setAccessToken(token: string | null) {
  const authenticationLost = accessToken !== null && token === null
  accessToken = token
  if (authenticationLost) authenticationLostListeners.forEach((listener) => listener())
}

export function subscribeAuthenticationLost(listener: () => void): () => void {
  authenticationLostListeners.add(listener)
  return () => authenticationLostListeners.delete(listener)
}

export function subscribeAuthorizationForbidden(listener: () => void): () => void {
  authorizationForbiddenListeners.add(listener)
  return () => authorizationForbiddenListeners.delete(listener)
}

export function notifyAuthorizationForbidden() {
  authorizationForbiddenListeners.forEach((listener) => listener())
}

/** 진행 중인 토큰 갱신 결과까지 무효화하고 로컬 인증을 종료한다. */
export function invalidateAuthentication() {
  authenticationVersion += 1
  setAccessToken(null)
}
