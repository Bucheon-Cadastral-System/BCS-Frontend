import { http } from './http'
import { invalidateAuthentication, setAccessToken } from './tokenStore'
export { refreshAccessToken } from './refreshToken'

const VERIFIER_KEY = 'bcs-pkce-verifier'
const OAUTH_POPUP_COMPLETE = 'bcs:kakao-oauth-complete'
let exchangeRequest: { code: string; promise: Promise<void> } | null = null

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function startKakaoLogin() {
  // 사용자 클릭이 살아 있을 때 먼저 열어야 팝업 차단기에 걸리지 않는다.
  const loginWindow = window.open('', '_blank', 'popup,width=520,height=720')
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const loginUrl = `/api/auth/oauth2/kakao?code_challenge=${base64Url(new Uint8Array(digest))}`

  if (!loginWindow) {
    sessionStorage.setItem(VERIFIER_KEY, verifier)
    window.location.replace(loginUrl)
    return
  }

  // 새 창은 아직 같은 출처의 빈 문서라 해당 창의 PKCE 저장소를 채울 수 있다.
  loginWindow.sessionStorage.setItem(VERIFIER_KEY, verifier)

  const cleanup = () => {
    window.removeEventListener('message', handleMessage)
    window.clearInterval(closedCheck)
  }
  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== loginWindow || event.data?.type !== OAUTH_POPUP_COMPLETE) return
    cleanup()
    // 카카오를 열지 않은 원래 탭만 메인으로 교체하므로 외부 인증 화면이 방문 기록에 남지 않는다.
    window.location.replace('/')
  }
  const closedCheck = window.setInterval(() => {
    if (!loginWindow.closed) return
    cleanup()
  }, 500)

  window.addEventListener('message', handleMessage)
  loginWindow.location.replace(loginUrl)
}

/** 팝업에서 토큰 교환을 마치면 원래 탭에 완료를 알리고 인증 창을 닫는다. */
export function completeKakaoPopupLogin(): boolean {
  if (!window.opener || window.opener.closed) return false
  window.opener.postMessage({ type: OAUTH_POPUP_COMPLETE }, window.location.origin)
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
