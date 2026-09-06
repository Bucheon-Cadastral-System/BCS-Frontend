import { http } from './http'
import { invalidateAuthentication, setAccessToken } from './tokenStore'
export { refreshAccessToken } from './refreshToken'

const VERIFIER_KEY = 'bcs-pkce-verifier'
const POPUP_MARKER_KEY = 'bcs-kakao-login-popup'
const POPUP_ATTEMPT_KEY = 'bcs-kakao-login-attempt'
const OAUTH_POPUP_COMPLETE = 'bcs:kakao-oauth-complete'
const OAUTH_POPUP_CHANNEL = 'bcs:kakao-oauth'
const OAUTH_POPUP_TIMEOUT_MS = 10 * 60 * 1000
let exchangeRequest: { code: string; promise: Promise<void> } | null = null

export type OAuthPopupLandingPath = '/signup'

type OAuthPopupCompleteMessage = {
  type: typeof OAUTH_POPUP_COMPLETE
  attemptId: string
  landingPath?: OAuthPopupLandingPath
}

function isPopupCompleteMessage(value: unknown, attemptId: string): value is OAuthPopupCompleteMessage {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Partial<OAuthPopupCompleteMessage>
  const landingPathIsValid = message.landingPath === undefined || message.landingPath === '/signup'
  return message.type === OAUTH_POPUP_COMPLETE && message.attemptId === attemptId && landingPathIsValid
}

function openOAuthChannel(): BroadcastChannel | null {
  return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(OAUTH_POPUP_CHANNEL)
}

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function startKakaoLogin(
  onComplete: (landingPath?: OAuthPopupLandingPath) => void | Promise<void> = () => window.location.replace('/'),
) {
  // 사용자 클릭이 살아 있을 때 먼저 열어야 팝업 차단기에 걸리지 않는다.
  const loginWindow = window.open('', '_blank', 'popup,width=520,height=720')
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)))
  const attemptId = crypto.randomUUID()

  if (loginWindow) {
    // 외부 인증 화면을 거쳐 opener 연결이 끊겨도 이 창이 로그인 팝업이었다는 사실은 남는다.
    loginWindow.sessionStorage.setItem(VERIFIER_KEY, verifier)
    loginWindow.sessionStorage.setItem(POPUP_MARKER_KEY, 'true')
    loginWindow.sessionStorage.setItem(POPUP_ATTEMPT_KEY, attemptId)
  }

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const loginUrl = `/api/auth/oauth2/kakao?code_challenge=${base64Url(new Uint8Array(digest))}`

  if (!loginWindow) {
    sessionStorage.setItem(VERIFIER_KEY, verifier)
    window.location.replace(loginUrl)
    return
  }

  if (loginWindow.closed) return

  const channel = openOAuthChannel()
  let completed = false
  const cleanup = () => {
    window.removeEventListener('message', handleMessage)
    channel?.removeEventListener('message', handleChannelMessage)
    channel?.close()
    window.clearTimeout(timeout)
  }
  const handleComplete = (landingPath?: OAuthPopupLandingPath) => {
    if (completed) return
    completed = true
    cleanup()
    void onComplete(landingPath)
  }
  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== loginWindow || !isPopupCompleteMessage(event.data, attemptId)) return
    handleComplete(event.data.landingPath)
  }
  const handleChannelMessage = (event: MessageEvent) => {
    if (!isPopupCompleteMessage(event.data, attemptId)) return
    handleComplete(event.data.landingPath)
  }
  // 외부 인증의 COOP 정책이 opener를 끊으면 실제로 열린 팝업도 closed로 보일 수 있다.
  // 닫힘 여부 대신 로그인 시도의 유효 시간까지만 완료 신호를 기다린다.
  const timeout = window.setTimeout(cleanup, OAUTH_POPUP_TIMEOUT_MS)

  window.addEventListener('message', handleMessage)
  channel?.addEventListener('message', handleChannelMessage)
  loginWindow.location.replace(loginUrl)
}

/** 팝업에서 토큰 교환을 마치면 원래 탭에 완료를 알리고 인증 창을 닫는다. */
export function completeKakaoPopupLogin(landingPath?: OAuthPopupLandingPath): boolean {
  if (sessionStorage.getItem(POPUP_MARKER_KEY) !== 'true') return false

  const attemptId = sessionStorage.getItem(POPUP_ATTEMPT_KEY)
  if (!attemptId) return false

  const message: OAuthPopupCompleteMessage = { type: OAUTH_POPUP_COMPLETE, attemptId, landingPath }
  sessionStorage.removeItem(POPUP_MARKER_KEY)
  sessionStorage.removeItem(POPUP_ATTEMPT_KEY)

  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(message, window.location.origin)
  }
  const channel = openOAuthChannel()
  channel?.postMessage(message)
  channel?.close()
  window.close()
  return true
}

async function performExchange(code: string) {
  const codeVerifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!codeVerifier) throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.')
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

export async function logout() {
  invalidateAuthentication('signed-out')
  await http.post('/api/auth/logout')
}
