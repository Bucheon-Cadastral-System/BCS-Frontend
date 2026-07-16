import { createControlPoint } from '@/entities/control-point'
import type { ControlPoint } from '@/entities/control-point'
import type { TmEpsg } from '@/shared/lib/crs'
import { parseCsv } from '../lib/parseCsv'

/** CSV 텍스트 → 기준점 배열 (선택한 TM 원점으로 성과좌표 계산) */
export function controlPointsFromCsv(text: string, tmEpsg: TmEpsg): ControlPoint[] {
  return parseCsv(text).map((r) =>
    createControlPoint({ type: r.type, name: r.name, lng: r.lng, lat: r.lat, tmEpsg }),
  )
}
