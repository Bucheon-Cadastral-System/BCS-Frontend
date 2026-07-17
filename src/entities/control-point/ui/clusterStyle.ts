import { Style, Icon } from 'ol/style'
import type { PointType } from '../model/types'
import type { MapTheme } from './markerStyle'

/**
 * 클러스터 payload 계약 (provider 무관).
 * OL Cluster / Supercluster / 서버사이드 어느 방식이든 이 모양으로 만들어 렌더링에 넘긴다.
 */
export interface ClusterInfo {
  count: number
  byType: Record<PointType, number>
  bySurvey: { done: number; todo: number; lost: number }
}

interface ChipPalette {
  chip: string
  halo: string
  text: string
  track: string
  done: string
  todo: string
  lost: string
}

// 지도 배경 반대 톤으로 칩을 깔아 대비 확보 (라이트맵=다크칩 / 다크맵=라이트칩). done=파랑.
const CHIP: Record<MapTheme, ChipPalette> = {
  light: { chip: '#1e293b', halo: '#ffffff', text: '#ffffff', track: '#475569', done: '#60a5fa', todo: '#cbd5e1', lost: '#f87171' },
  dark: { chip: '#ffffff', halo: '#0f172a', text: '#0f172a', track: '#cbd5e1', done: '#16a34a', todo: '#64748b', lost: '#dc2626' },
}

/** 개수 구간별 반지름 (네이버 부동산식 크기 차등) */
function radiusForCount(count: number): number {
  if (count < 10) return 15
  if (count < 50) return 19
  if (count < 200) return 24
  return 29
}

/** 조사 비율(조사완료/미조사/망실) 도넛 + 중앙 개수 뱃지 SVG */
function clusterBadgeSvg(info: ClusterInfo, c: ChipPalette): string {
  const R = radiusForCount(info.count)
  const size = (R + 6) * 2
  const cx = size / 2
  const ringR = R - 4
  const sw = 4
  const circ = 2 * Math.PI * ringR

  const segs = [
    { v: info.bySurvey.done, color: c.done },
    { v: info.bySurvey.todo, color: c.todo },
    { v: info.bySurvey.lost, color: c.lost },
  ]
  const total = Math.max(1, segs.reduce((s, x) => s + x.v, 0))

  let offset = 0
  const arcs = segs
    .filter((s) => s.v > 0)
    .map((s) => {
      const len = (s.v / total) * circ
      const el =
        `<circle cx="${cx}" cy="${cx}" r="${ringR}" fill="none" stroke="${s.color}" stroke-width="${sw}" ` +
        `stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cx})"/>`
      offset += len
      return el
    })
    .join('')

  const fontSize = info.count >= 1000 ? 12 : 14
  const label = info.count >= 1000 ? `${Math.round(info.count / 100) / 10}k` : String(info.count)

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<circle cx="${cx}" cy="${cx + 1.5}" r="${R}" fill="#000000" opacity="0.25"/>` +
    `<circle cx="${cx}" cy="${cx}" r="${R}" fill="${c.chip}" stroke="${c.halo}" stroke-width="2"/>` +
    `<circle cx="${cx}" cy="${cx}" r="${ringR}" fill="none" stroke="${c.track}" stroke-width="${sw}"/>` +
    arcs +
    `<text x="${cx}" y="${cx}" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="system-ui, sans-serif" font-size="${fontSize}" font-weight="700" fill="${c.text}">${label}</text>` +
    `</svg>`

  return 'data:image/svg+xml;base64,' + btoa(svg)
}

export function clusterStyle(info: ClusterInfo, theme: MapTheme = 'light'): Style {
  return new Style({ image: new Icon({ src: clusterBadgeSvg(info, CHIP[theme]) }) })
}
