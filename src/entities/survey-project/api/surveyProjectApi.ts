import { http } from '@/shared/api/http'
import type { SurveyProject, SurveyProjectType } from '../model/types'

interface ServerSurveyProject {
  id: number
  type: SurveyProjectType
  name: string
  note: string | null
}

function toSurveyProject(server: ServerSurveyProject): SurveyProject {
  return { id: String(server.id), type: server.type, name: server.name }
}

export async function fetchSurveyProjects(): Promise<SurveyProject[]> {
  const res = await http.get<{ content: ServerSurveyProject[] }>('/api/survey-projects')
  return res.data.content.map(toSurveyProject)
}

export async function createSurveyProjectApi(
  { name, type }: { name: string; type: SurveyProjectType },
): Promise<SurveyProject> {
  const res = await http.post<ServerSurveyProject>('/api/survey-projects', { type, name })
  return toSurveyProject(res.data)
}
