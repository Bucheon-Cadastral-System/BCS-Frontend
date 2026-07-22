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

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init)
  if (!res.ok) {
    const problem = (await res.json().catch(() => null)) as ProblemDetail | null
    throw new ApiError(problem?.code ?? 'UNKNOWN', res.status, problem?.detail ?? `요청에 실패했습니다 (${res.status})`)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}

export function apiJson<T>(path: string, method: 'POST' | 'PUT', body: unknown): Promise<T> {
  return api<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
