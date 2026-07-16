import { Style, Icon, Fill, Stroke, Text } from 'ol/style'
import type { ControlPoint, PointType } from '../model/types'

/** 조사상태 표현: none=프로젝트 없음, todo=미조사(흐리게), done=조사완료(체크) */
export type SurveyView = 'none' | 'todo' | 'done'

/**
 * 지적기준점 공식 도식 마커 (흑백 표준, 36x36 · 중심 18,18).
 *  - 지적삼각점: 크로스헤어 원 (⊕) / 지적삼각보조점: 채운 원 (●) / 지적도근점: 작은 빈 원 (○)
 * 흰 후광으로 배경 대비 확보. 선택=주황 링, 망실=빨강, 조사완료=초록 체크 뱃지.
 */
function svgFor(type: PointType, selected: boolean, lost: boolean, done: boolean): string {
  const line = lost ? '#dc2626' : '#111827'
  const sel = selected
    ? '<circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" stroke-width="3"/>'
    : ''

  let shape = ''
  if (type === '지적삼각점') {
    const r = 9
    shape =
      `<circle cx="18" cy="18" r="${r}" fill="#ffffff" stroke="#ffffff" stroke-width="4"/>` +
      `<circle cx="18" cy="18" r="${r}" fill="#ffffff" stroke="${line}" stroke-width="1.8"/>` +
      `<line x1="${18 - r}" y1="18" x2="${18 + r}" y2="18" stroke="${line}" stroke-width="1.6"/>` +
      `<line x1="18" y1="${18 - r}" x2="18" y2="${18 + r}" stroke="${line}" stroke-width="1.6"/>`
  } else if (type === '지적삼각보조점') {
    const inner = lost ? '#dc2626' : '#4b5563'
    shape =
      `<circle cx="18" cy="18" r="9" fill="#ffffff" stroke="#ffffff" stroke-width="4"/>` +
      `<circle cx="18" cy="18" r="9" fill="${inner}" stroke="${line}" stroke-width="1.8"/>`
  } else {
    shape =
      `<circle cx="18" cy="18" r="6.5" fill="#ffffff" stroke="#ffffff" stroke-width="4"/>` +
      `<circle cx="18" cy="18" r="6.5" fill="#ffffff" stroke="${line}" stroke-width="1.8"/>`
  }

  const badge = done
    ? '<circle cx="28" cy="8" r="6" fill="#16a34a" stroke="#ffffff" stroke-width="1.5"/>' +
      '<path d="M25.3 8 L27 9.8 L30.7 6" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">${sel}${shape}${badge}</svg>`
}

function markerDataUri(type: PointType, selected: boolean, lost: boolean, done: boolean): string {
  return 'data:image/svg+xml;base64,' + btoa(svgFor(type, selected, lost, done))
}

export function controlPointStyle(p: ControlPoint, selected: boolean, survey: SurveyView = 'none'): Style {
  const faded = survey === 'todo'
  return new Style({
    image: new Icon({
      src: markerDataUri(p.type, selected, p.lost, survey === 'done'),
      opacity: faded ? 0.4 : 1,
    }),
    text: new Text({
      text: p.name,
      offsetY: -20,
      font: '12px system-ui, sans-serif',
      fill: new Fill({ color: faded ? '#9ca3af' : '#111827' }),
      stroke: new Stroke({ color: '#ffffff', width: 3 }),
    }),
  })
}
