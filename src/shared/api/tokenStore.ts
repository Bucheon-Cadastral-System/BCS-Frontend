let accessToken: string | null = null
const authenticationLostListeners = new Set<() => void>()

export function getAccessToken() { return accessToken }
export function setAccessToken(token: string | null) {
  const authenticationLost = accessToken !== null && token === null
  accessToken = token
  if (authenticationLost) authenticationLostListeners.forEach((listener) => listener())
}

export function subscribeAuthenticationLost(listener: () => void): () => void {
  authenticationLostListeners.add(listener)
  return () => authenticationLostListeners.delete(listener)
}
