import type { SurveyRecord } from './types'

function matches(r: SurveyRecord, projectId: string, pointId: string): boolean {
  return r.projectId === projectId && r.pointId === pointId
}

/** 해당 프로젝트에서 그 기준점이 조사완료인지 (정상·망실 모두 포함) */
export function isSurveyed(records: SurveyRecord[], projectId: string, pointId: string): boolean {
  return records.some((r) => matches(r, projectId, pointId))
}

/** 해당 프로젝트에서 그 기준점이 망실로 판정됐는지 */
export function isLost(records: SurveyRecord[], projectId: string, pointId: string): boolean {
  return records.some((r) => matches(r, projectId, pointId) && r.lost)
}

/**
 * 조사완료(정상) ↔ 미조사 토글. 조사 취소 시 (혹시 모를 중복 포함) 동일 키 레코드를 **모두** 제거.
 * → 조사기록은 (projectId, pointId) 당 최대 1건 불변식 유지.
 */
export function toggleSurvey(records: SurveyRecord[], projectId: string, pointId: string): SurveyRecord[] {
  if (isSurveyed(records, projectId, pointId)) {
    return records.filter((r) => !matches(r, projectId, pointId))
  }
  return [...records, { projectId, pointId, surveyedAt: new Date().toISOString(), lost: false }]
}

/**
 * 망실 ↔ 정상 토글. 미조사면 "망실로 조사"(레코드 생성).
 * 동일 키 중복이 있어도 모두 제거 후 하나로 정규화(surveyedAt 보존).
 */
export function toggleLost(records: SurveyRecord[], projectId: string, pointId: string): SurveyRecord[] {
  const existing = records.find((r) => matches(r, projectId, pointId))
  const nextLost = !(existing?.lost ?? false)
  const surveyedAt = existing?.surveyedAt ?? new Date().toISOString()
  const rest = records.filter((r) => !matches(r, projectId, pointId))
  return [...rest, { projectId, pointId, surveyedAt, lost: nextLost }]
}

/** 프로젝트의 조사완료 기준점 id 목록 (정상·망실 모두) */
export function surveyedPointIds(records: SurveyRecord[], projectId: string): string[] {
  return records.filter((r) => r.projectId === projectId).map((r) => r.pointId)
}

/** 프로젝트의 망실 기준점 id 목록 */
export function lostPointIds(records: SurveyRecord[], projectId: string): string[] {
  return records.filter((r) => r.projectId === projectId && r.lost).map((r) => r.pointId)
}

/** 프로젝트 삭제 시 그 프로젝트의 조사기록 제거 */
export function removeProjectRecords(records: SurveyRecord[], projectId: string): SurveyRecord[] {
  return records.filter((r) => r.projectId !== projectId)
}

/** 기준점 삭제 시 그 기준점의 조사기록 제거 */
export function removePointRecords(records: SurveyRecord[], pointId: string): SurveyRecord[] {
  return records.filter((r) => r.pointId !== pointId)
}
