import { POINT_TYPES } from '@/entities/control-point'
import type { PointType } from '@/entities/control-point'

export interface CsvRow {
  type: PointType
  name: string
  lng: number
  lat: number
}

// 헤더명 → 표준 필드 매핑 (한글/영문 허용)
const HEADER_ALIASES: Record<string, keyof CsvRow> = {
  종류: 'type', 구분: 'type', type: 'type',
  이름: 'name', 점명: 'name', 기준점명: 'name', name: 'name',
  위도: 'lat', lat: 'lat', latitude: 'lat',
  경도: 'lng', lng: 'lng', lon: 'lng', longitude: 'lng',
}

function splitLine(line: string): string[] {
  return line.split(',').map((c) => c.trim())
}

/**
 * CSV 텍스트 파싱. 최소한 위도/경도 컬럼이 있어야 한다.
 * 예) 종류,이름,위도,경도  또는  type,name,lat,lng
 */
export function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) return []

  const headers = splitLine(lines[0]).map(
    (h) => HEADER_ALIASES[h] ?? HEADER_ALIASES[h.toLowerCase()] ?? h,
  )

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i])
    const rec: Record<string, string> = {}
    headers.forEach((h, idx) => {
      rec[h] = cells[idx] ?? ''
    })

    const lat = Number(rec.lat)
    const lng = Number(rec.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    const type: PointType = (POINT_TYPES as readonly string[]).includes(rec.type)
      ? (rec.type as PointType)
      : POINT_TYPES[2]

    rows.push({ type, name: rec.name || `점${i}`, lng, lat })
  }
  return rows
}
