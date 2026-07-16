import type { SurveyRecord } from './types'

/** 해당 프로젝트에서 그 기준점이 조사완료인지 */
export function isSurveyed(records: SurveyRecord[], projectId: string, pointId: string): boolean {
  return records.some((r) => r.projectId === projectId && r.pointId === pointId)
}

/** 조사완료 ↔ 미조사 토글 (프로젝트별) */
export function toggleSurvey(records: SurveyRecord[], projectId: string, pointId: string): SurveyRecord[] {
  if (isSurveyed(records, projectId, pointId)) {
    return records.filter((r) => !(r.projectId === projectId && r.pointId === pointId))
  }
  return [...records, { projectId, pointId, surveyedAt: new Date().toISOString() }]
}

/** 프로젝트의 조사완료 기준점 id 목록 */
export function surveyedPointIds(records: SurveyRecord[], projectId: string): string[] {
  return records.filter((r) => r.projectId === projectId).map((r) => r.pointId)
}

/** 프로젝트 삭제 시 그 프로젝트의 조사기록 제거 */
export function removeProjectRecords(records: SurveyRecord[], projectId: string): SurveyRecord[] {
  return records.filter((r) => r.projectId !== projectId)
}

/** 기준점 삭제 시 그 기준점의 조사기록 제거 */
export function removePointRecords(records: SurveyRecord[], pointId: string): SurveyRecord[] {
  return records.filter((r) => r.pointId !== pointId)
}
