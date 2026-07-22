import { http } from '@/shared/api/http'
import type { SurveyProject } from '../model/types'

interface ServerSurveyProject {
  id: number
  type: 'GENERAL' | 'EXCAVATION_CONSULTATION'
  name: string
  note: string | null
}

function toSurveyProject(server: ServerSurveyProject): SurveyProject {
  return { id: String(server.id), name: server.name }
}

export async function fetchSurveyProjects(): Promise<SurveyProject[]> {
  const res = await http.get<{ content: ServerSurveyProject[] }>('/api/survey-projects')
  return res.data.content.map(toSurveyProject)
}

export async function createSurveyProjectApi(name: string): Promise<SurveyProject> {
  const res = await http.post<ServerSurveyProject>('/api/survey-projects', { type: 'GENERAL', name })
  return toSurveyProject(res.data)
}
