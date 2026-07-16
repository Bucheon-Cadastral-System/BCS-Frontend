import type { ControlPoint } from './types'

// 프로토타입 저장소: localStorage (백엔드 연동 전).
const STORAGE_KEY = 'bcs.controlPoints.v1'

export function loadPoints(): ControlPoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ControlPoint[]) : []
  } catch {
    return []
  }
}

export function savePoints(points: ControlPoint[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(points))
}
