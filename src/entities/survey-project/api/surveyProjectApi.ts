import { api, apiJson } from '@/shared/api/http'
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
  const res = await api<{ content: ServerSurveyProject[] }>('/api/survey-projects')
  return res.content.map(toSurveyProject)
}

export async function createSurveyProjectApi(name: string): Promise<SurveyProject> {
  const server = await apiJson<ServerSurveyProject>('/api/survey-projects', 'POST', {
    type: 'GENERAL',
    name,
  })
  return toSurveyProject(server)
}
