import type { SurveyRecord } from './types'

const STORAGE_KEY = 'bcs.surveyRecords.v1'

export function loadRecords(): SurveyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SurveyRecord[]) : []
  } catch {
    return []
  }
}

export function saveRecords(records: SurveyRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}
