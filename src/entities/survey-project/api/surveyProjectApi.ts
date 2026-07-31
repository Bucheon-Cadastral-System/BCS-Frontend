import { http } from '@/shared/api/http'
import type { SurveyProject, SurveyProjectDraft } from '../model/types'

interface ServerSurveyProject {
  id: number
  name: string
  note: string | null
}

function toSurveyProject(server: ServerSurveyProject): SurveyProject {
  return { id: String(server.id), name: server.name, note: server.note }
}

/**
 * 서버로 보내는 조사 프로젝트 값.
 * `type` 은 화면에서 받지 않는 개념이지만 서버가 아직 필수로 요구해 고정값을 채운다.
 * 조사 기간은 서버에 대응 필드가 없어 지금은 저장되지 않는다.
 * 작성자는 보내지 않는다 — 클라이언트가 지정하면 위조할 수 있으므로 서버가 인증된 사용자로 기록해야 한다.
 */
export function toSurveyProjectPayload(draft: SurveyProjectDraft) {
  return {
    type: 'GENERAL',
    name: draft.name,
    note: draft.note,
    startedOn: draft.startedOn,
    endedOn: draft.endedOn,
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
