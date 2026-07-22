import type { SurveyProject } from './types'

export function createSurveyProject(name: string): SurveyProject {
  return { id: crypto.randomUUID(), name }
}
