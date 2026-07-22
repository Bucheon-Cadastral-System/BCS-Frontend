import { api, apiJson } from '@/shared/api/http'
import type { SurveyRecord } from '../model/types'

interface ServerSurveyRecord {
  id: number
  projectId: number
  pointId: number
  result: 'INTACT' | 'LOST' | 'ETC'
  surveyedAt: string
  note: string | null
}

/** 서버 결과 어휘(완전/망실/기타) → 프론트 lost 플래그. 기타(ETC)는 망실 아님으로 표시한다. */
function toSurveyRecord(server: ServerSurveyRecord): SurveyRecord {
  return {
    projectId: String(server.projectId),
    pointId: String(server.pointId),
    surveyedAt: server.surveyedAt,
    lost: server.result === 'LOST',
  }
}

export async function fetchSurveyRecords(projectId: string): Promise<SurveyRecord[]> {
  const res = await api<{ content: ServerSurveyRecord[] }>(`/api/survey-projects/${projectId}/records`)
  return res.content.map(toSurveyRecord)
}

/** 조사 기록/정정 — 서버가 기존 기록이면 판정 정정으로 처리한다. */
export async function putSurveyRecord(projectId: string, pointId: string, lost: boolean): Promise<SurveyRecord> {
  const server = await apiJson<ServerSurveyRecord>(
    `/api/survey-projects/${projectId}/records/${pointId}`,
    'PUT',
    { result: lost ? 'LOST' : 'INTACT' },
  )
  return toSurveyRecord(server)
}

/** 조사 취소 — 레코드 삭제. */
export function deleteSurveyRecord(projectId: string, pointId: string): Promise<void> {
  return api<void>(`/api/survey-projects/${projectId}/records/${pointId}`, { method: 'DELETE' })
}
