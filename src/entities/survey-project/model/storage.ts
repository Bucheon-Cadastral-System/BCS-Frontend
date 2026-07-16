import type { SurveyProject } from './types'

const STORAGE_KEY = 'bcs.surveyProjects.v1'

export function loadProjects(): SurveyProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SurveyProject[]) : []
  } catch {
    return []
  }
}

export function saveProjects(projects: SurveyProject[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}
