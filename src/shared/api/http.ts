import axios, { AxiosError } from 'axios'

/** 백엔드 API 기본 주소 — 미지정 시 로컬 Spring. 배포에선 동일 오리진 뒤 프록시를 쓰므로 빈 문자열 지정. */
const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

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

export const http = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
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
      problem?.detail ?? (status ? `요청에 실패했습니다 (${status})` : '서버에 연결할 수 없습니다'),
    )
  },
)
