import type { ControlPoint } from './types'
import { SEED_DOGEUN_BUCHEON } from './seedDogeun'

// 프로토타입 저장소: localStorage (백엔드 연동 전).
const STORAGE_KEY = 'bcs.controlPoints.v1'

export function loadPoints(): ControlPoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // 최초 실행(저장 이력 없음)이면 임시 부천 도근점 시드로 시작. 이후엔 저장값 사용(전체삭제=빈 배열도 존중).
    if (raw === null) return SEED_DOGEUN_BUCHEON
    return JSON.parse(raw) as ControlPoint[]
  } catch {
    return []
  }
}

export function savePoints(points: ControlPoint[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(points))
}
