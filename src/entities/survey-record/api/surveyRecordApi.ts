import { http } from '@/shared/api/http'
import type { SurveyRecord, SurveyResult } from '../model/types'

interface ServerSurveyRecord {
  id: number
  projectId: number
  pointId: number
  result: SurveyResult
  surveyedAt: string
  note: string | null
  surveyorName: string | null
}

/** 판정은 서버 어휘 그대로 들고, 지도가 쓰는 망실 여부만 함께 갈라 둔다. */
function toSurveyRecord(server: ServerSurveyRecord): SurveyRecord {
  return {
    projectId: String(server.projectId),
    pointId: String(server.pointId),
    surveyedAt: server.surveyedAt,
    result: server.result,
    lost: server.result === 'LOST',
    surveyorName: server.surveyorName,
    note: server.note,
  }
}

export async function fetchSurveyRecords(projectId: string): Promise<SurveyRecord[]> {
  const res = await http.get<{ content: ServerSurveyRecord[] }>(`/api/survey-projects/${projectId}/records`)
  return res.data.content.map(toSurveyRecord)
}

/**
 * 조사 기록/정정 — 서버가 기존 기록이면 판정 정정으로 처리한다.
 * note는 기타를 고를 때 적는 사유다. 그 외 결과는 적지 않으므로 null로 보낸다.
 */
export async function putSurveyRecord(
  projectId: string,
  pointId: string,
  result: SurveyResult,
  note: string | null,
): Promise<SurveyRecord> {
  const res = await http.put<ServerSurveyRecord>(
    `/api/survey-projects/${projectId}/records/${pointId}`,
    { result, note },
  )
  return toSurveyRecord(res.data)
}

/** 조사 취소 — 레코드 삭제. */
export async function deleteSurveyRecord(projectId: string, pointId: string): Promise<void> {
  await http.delete(`/api/survey-projects/${projectId}/records/${pointId}`)
}
