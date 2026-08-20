import axios, { AxiosError } from 'axios'
import { API_BASE_URL, API_TIMEOUT_MS } from './config'
import { getAccessToken } from './tokenStore'
import { refreshAccessToken } from './refreshToken'

/** API 기본 주소 — 기본은 동일 오리진(개발=Vite 프록시, 배포=Caddy 프록시). 별도 오리진이 필요할 때만 지정. */

/** 검증 실패에서 서버가 짚어 주는 칸 하나 — field 는 본문 필드명이나 파라미터명, 없으면 null */
export interface FieldError {
  field: string | null
  message: string
}

/** 실패 응답(RFC 9457 ProblemDetail)의 판별 코드를 담는 에러 — 화면 분기는 message가 아니라 code로 한다. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  /** 어느 칸이 왜 걸렸는지 — 검증 실패가 아니면 빈 배열 */
  readonly errors: readonly FieldError[]

  constructor(code: string, status: number, detail: string, errors: readonly FieldError[] = []) {
    super(detail)
    this.code = code
    this.status = status
    this.errors = errors
  }
}

interface ProblemDetail {
  code?: string
  detail?: string
  errors?: FieldError[]
}

/**
 * 코드별 안내 문구.
 *
 * <p>서버가 주는 detail 은 대부분 사람에게 하는 말이지만, 일부는 코드를 부르는 쪽에게 하는 말이다.
 * "page는 0 이상이어야 합니다. 입력값=-1" 같은 문장은 사용자가 읽어도 할 수 있는 일이 없다.
 * 그런 코드만 여기서 우리 말로 바꾸고, 나머지는 서버 문장을 그대로 쓴다.
 */
const MESSAGE_BY_CODE: Record<string, string> = {
  COMMON_INTERNAL_ERROR: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  // 어느 요청이 왜 거절됐는지 가리지 못하는 자리라 할 일을 일러 주지 않는다 — 새로고침으로 풀리지 않는 실패가 여기로 온다
  COMMON_BAD_REQUEST: '요청을 처리하지 못했습니다.',
  PAGE_REQUEST_INVALID: '목록을 불러올 수 없습니다. 화면을 새로고침해 주세요.',
  CURSOR_INVALID: '목록을 이어 불러올 수 없습니다. 화면을 새로고침해 주세요.',
  AUTH_UNAUTHORIZED: '로그인이 필요합니다. 다시 로그인해 주세요.',
  AUTHENTICATION_REQUIRED: '로그인이 필요한 기능입니다.',
  AUTH_FORBIDDEN: '이 작업을 수행할 권한이 없습니다.',
}

/**
 * 화면에 띄울 한 문장을 고른다.
 *
 * <p>검증 실패는 칸별 사유가 가장 구체적이라 그것을 먼저 쓴다. 그다음이 우리가 정한 문구,
 * 마지막이 서버 문장이다. 셋 다 없으면 무엇을 하다 실패했는지만이라도 말한다.
 */
function messageOf(problem: ProblemDetail | undefined, status: number): string {
  const field = problem?.errors?.[0]?.message
  if (field !== undefined && field !== '') return field
  const known = problem?.code === undefined ? undefined : MESSAGE_BY_CODE[problem.code]
  if (known !== undefined) return known
  if (problem?.detail !== undefined && problem.detail !== '') return problem.detail
  return status ? '요청을 처리하지 못했습니다.' : '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
}

// Content-Type은 axios가 본문 타입으로 정한다(객체=JSON, FormData=multipart) — 고정하면 파일 업로드가 깨진다
export const http = axios.create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT_MS, withCredentials: true })
/** 게스트 공개 API 전용 — 토큰·쿠키 첨부와 401 토큰 갱신을 하지 않는다. */
export const publicHttp = axios.create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT_MS, withCredentials: false })

http.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as (typeof error.config & { _retried?: boolean })
  const isAuthEndpoint = typeof config?.url === 'string' && config.url.startsWith('/api/auth/')
  if (error.response?.status === 401 && config && !config._retried && !isAuthEndpoint) {
    config._retried = true
    const token = await refreshAccessToken()
    if (token) return http(config)
  }
  return Promise.reject(error)
})

// 모든 실패를 ApiError로 정규화 — 네트워크 오류(응답 없음)는 status 0
async function throwApiError(error: AxiosError<ProblemDetail>): Promise<never> {
  const status = error.response?.status ?? 0
  const problem = await problemOf(error.response?.data)
  throw new ApiError(problem?.code ?? 'UNKNOWN', status, messageOf(problem, status), problem?.errors ?? [])
}

/**
 * 실패 본문을 읽는다.
 *
 * <p>파일을 받는 요청은 응답을 Blob 으로 받겠다고 미리 정해 두므로, 서버가 실패를 JSON 으로 내려도
 * 그 JSON 이 Blob 에 담겨 온다. 풀어 읽지 않으면 사유를 아는 응답을 두고도 일반 문구만 띄우게 된다.
 */
async function problemOf(data: unknown): Promise<ProblemDetail | undefined> {
  if (!(data instanceof Blob)) return data as ProblemDetail | undefined
  try {
    return JSON.parse(await data.text()) as ProblemDetail
  } catch {
    // 파일이 아니라 실패라는 것만 아는 응답 — 문구는 상태 코드로 고른다
    return undefined
  }
}

http.interceptors.response.use((response) => response, throwApiError)
publicHttp.interceptors.response.use((response) => response, throwApiError)
