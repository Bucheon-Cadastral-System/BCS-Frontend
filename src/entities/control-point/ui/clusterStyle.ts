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

// 라이트맵=다크 반투명 원 / 다크맵=라이트 반투명 원. done=아래서 채우는 조사비율 색.
const CHIP: Record<MapTheme, { base: string; border: string; done: string; lost: string; text: string }> = {
  light: { base: 'rgba(15,23,42,0.5)', border: '#0f172a', done: '#3b82f6', lost: '#ef4444', text: '#ffffff' },
  dark: { base: 'rgba(241,245,249,0.62)', border: '#0f172a', done: '#22c55e', lost: '#dc2626', text: '#0f172a' },
}

/** 개수 구간별 반지름 (네이버 부동산식 크기 차등) */
function radiusForCount(count: number): number {
  if (count < 10) return 15
  if (count < 50) return 19
  if (count < 200) return 24
  return 29
}

/**
 * 단색 반투명 원 + 진한 border 뱃지. 프로젝트 선택(surveyMode) 시 아래서부터 조사비율만큼 채움(clip).
 * (3/9면 원의 아래 33%가 done 색으로 채워짐)
 */
function clusterBadgeSvg(info: ClusterInfo, c: (typeof CHIP)['light'], surveyMode: boolean): string {
  const R = radiusForCount(info.count)
  const size = (R + 3) * 2
  const cx = size / 2
  const bw = 2.5

  const denom = Math.max(1, info.count)
  const doneH = surveyMode ? (info.bySurvey.done / denom) * 2 * R : 0
  const lostH = surveyMode ? (info.bySurvey.lost / denom) * 2 * R : 0

  let fill = ''
  if (doneH > 0 || lostH > 0) {
    // 아래서부터 done(정상)색으로 채우고, 그 위에 망실만큼 빨강으로 쌓음 (조사됨 = done+lost 비율)
    fill =
      `<clipPath id="cc"><circle cx="${cx}" cy="${cx}" r="${R}"/></clipPath>` +
      (doneH > 0 ? `<rect clip-path="url(#cc)" x="0" y="${cx + R - doneH}" width="${size}" height="${doneH}" fill="${c.done}"/>` : '') +
      (lostH > 0 ? `<rect clip-path="url(#cc)" x="0" y="${cx + R - doneH - lostH}" width="${size}" height="${lostH}" fill="${c.lost}"/>` : '')
  }

  const fontSize = info.count >= 1000 ? 12 : 14
  const label = info.count >= 1000 ? `${Math.round(info.count / 100) / 10}k` : String(info.count)

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<circle cx="${cx}" cy="${cx}" r="${R}" fill="${c.base}"/>` +
    fill +
    `<circle cx="${cx}" cy="${cx}" r="${R}" fill="none" stroke="${c.border}" stroke-width="${bw}"/>` +
    `<text x="${cx}" y="${cx}" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="system-ui, sans-serif" font-size="${fontSize}" font-weight="700" fill="${c.text}">${label}</text>` +
    `</svg>`

  return 'data:image/svg+xml;base64,' + btoa(svg)
}

export function clusterStyle(info: ClusterInfo, theme: MapTheme = 'light', surveyMode = false): Style {
  return new Style({ image: new Icon({ src: clusterBadgeSvg(info, CHIP[theme], surveyMode) }) })
}
