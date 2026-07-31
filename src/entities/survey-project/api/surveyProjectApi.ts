import { http } from '@/shared/api/http'
import type { SurveyProject, SurveyProjectDraft } from '../model/types'

interface ServerSurveyProject {
  id: number
  name: string
  startedOn: string
  endedOn: string | null
  note: string | null
}

function toSurveyProject(server: ServerSurveyProject): SurveyProject {
  return {
    id: String(server.id),
    name: server.name,
    startedOn: server.startedOn,
    endedOn: server.endedOn,
    note: server.note,
  }
}

/**
 * 서버로 보내는 조사 프로젝트 값.
 * 작성자는 보내지 않는다 — 클라이언트가 지정하면 위조할 수 있으므로 서버가 인증된 사용자로 기록해야 한다.
 */
export function toSurveyProjectPayload(draft: SurveyProjectDraft) {
  return {
    name: draft.name,
    startedOn: draft.startedOn,
    endedOn: draft.endedOn,
    note: draft.note,
  }
}

export async function fetchSurveyProjects(): Promise<SurveyProject[]> {
  const res = await http.get<{ content: ServerSurveyProject[] }>('/api/survey-projects')
  return res.data.content.map(toSurveyProject)
}

export async function createSurveyProjectApi(draft: SurveyProjectDraft): Promise<SurveyProject> {
  const res = await http.post<ServerSurveyProject>('/api/survey-projects', toSurveyProjectPayload(draft))
  return toSurveyProject(res.data)
}
