import axios from 'axios'
import { API_BASE_URL, API_TIMEOUT_MS } from './config'
import { getAuthenticationVersion, setAccessToken } from './tokenStore'

let refreshRequest: Promise<string | null> | null = null

/** 앱 초기화와 401 재시도가 하나의 토큰 갱신 요청을 공유한다. */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshRequest) {
    const requestVersion = getAuthenticationVersion()
    refreshRequest = axios.post<{ accessToken: string }>(`${API_BASE_URL}/api/auth/token/refresh`, undefined, {
      timeout: API_TIMEOUT_MS,
      withCredentials: true,
    })
      .then(({ data }) => {
        if (requestVersion !== getAuthenticationVersion()) return null
        setAccessToken(data.accessToken)
        return data.accessToken
      })
      .catch(() => {
        if (requestVersion !== getAuthenticationVersion()) return null
        setAccessToken(null)
        return null
      })
      .finally(() => { refreshRequest = null })
  }
  return refreshRequest
}
