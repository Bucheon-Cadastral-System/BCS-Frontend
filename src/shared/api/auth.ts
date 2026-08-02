import { http } from './http'
import { setAccessToken } from './tokenStore'

const VERIFIER_KEY = 'bcs-pkce-verifier'
let refreshRequest: Promise<string | null> | null = null
let exchangeRequest: { code: string; promise: Promise<void> } | null = null

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function clearAccessToken() { setAccessToken(null) }

export async function startKakaoLogin() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  window.location.assign(`/api/auth/oauth2/kakao?code_challenge=${base64Url(new Uint8Array(digest))}`)
}

async function performExchange(code: string) {
  const codeVerifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!codeVerifier) throw new Error('로그인 검증 정보가 없습니다. 다시 로그인해 주세요.')
  const { data } = await http.post<{ accessToken: string }>('/api/auth/token/exchange', { code, codeVerifier })
  sessionStorage.removeItem(VERIFIER_KEY)
  setAccessToken(data.accessToken)
}

/** React 개발 모드의 이중 마운트에서도 일회용 교환 코드를 두 번 소비하지 않는다. */
export function exchangeOAuthCode(code: string): Promise<void> {
  if (exchangeRequest?.code === code) return exchangeRequest.promise
  const promise = performExchange(code)
  exchangeRequest = { code, promise }
  return promise
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshRequest) {
    const request = http.post<{ accessToken: string }>('/api/auth/token/refresh')
      .then(({ data }) => { setAccessToken(data.accessToken); return data.accessToken })
      .catch(() => { setAccessToken(null); return null })
      .finally(() => { refreshRequest = null })
    refreshRequest = request
  }
  return refreshRequest!
}

export async function logout() {
  try { await http.post('/api/auth/logout') } finally { clearAccessToken() }
}
