import axios, { AxiosError } from 'axios'
import { getAccessToken, setAccessToken } from './tokenStore'

/** API 기본 주소 — 기본은 동일 오리진(개발=Vite 프록시, 배포=Caddy 프록시). 별도 오리진이 필요할 때만 지정. */
const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

/** 실패 응답(RFC 9457 ProblemDetail)의 판별 코드를 담는 에러 — 화면 분기는 message가 아니라 code로 한다. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status: number, detail: string) {
    super(detail)
    this.code = code
    this.status = status
  }
}

interface ProblemDetail {
  code?: string
  detail?: string
}

// Content-Type은 axios가 본문 타입으로 정한다(객체=JSON, FormData=multipart) — 고정하면 파일 업로드가 깨진다
export const http = axios.create({ baseURL: BASE_URL, withCredentials: true })

http.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshRequest: Promise<string | null> | null = null
http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as (typeof error.config & { _retried?: boolean })
  const isAuthEndpoint = typeof config?.url === 'string' && config.url.startsWith('/api/auth/')
  if (error.response?.status === 401 && config && !config._retried && !isAuthEndpoint) {
    config._retried = true
    refreshRequest ??= axios.post<{ accessToken: string }>(`${BASE_URL}/api/auth/token/refresh`, undefined, { withCredentials: true })
      .then(({ data }) => { setAccessToken(data.accessToken); return data.accessToken })
      .catch(() => { setAccessToken(null); return null })
      .finally(() => { refreshRequest = null })
    const token = await refreshRequest
    if (token) return http(config)
  }
  return Promise.reject(error)
})

// 모든 실패를 ApiError로 정규화 — 네트워크 오류(응답 없음)는 status 0
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ProblemDetail>) => {
    const status = error.response?.status ?? 0
    const problem = error.response?.data
    throw new ApiError(
      problem?.code ?? 'UNKNOWN',
      status,
      problem?.detail ?? (status ? '요청을 처리하지 못했습니다.' : '연결에 실패했습니다. 잠시 후 다시 시도해 주세요.'),
    )
  },
)
