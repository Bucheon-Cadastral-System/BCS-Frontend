import { Style, Icon, Fill, Stroke, Text } from 'ol/style'
import type { ControlPoint, PointType } from '../model/types'

/**
 * 지적기준점 공식 도식 마커 (흑백 표준, 36x36 · 중심 18,18).
 *  - 지적삼각점: 크로스헤어 원 (⊕, 3mm)
 *  - 지적삼각보조점: 채운 원 (●, 3mm)
 *  - 지적도근점: 작은 빈 원 (○, 2mm)
 * 밝은/어두운 배경 모두에서 보이도록 흰 후광(halo)을 두름.
 * 선택 = 주황 링, 망실 = 빨강.
 * (종류별 색상 구분이 필요하면 line/fill 을 종류별로 바꾸면 됨)
 */
function svgFor(type: PointType, selected: boolean, lost: boolean): string {
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
    // 지적도근점 (작은 빈 원)
    shape =
      `<circle cx="18" cy="18" r="6.5" fill="#ffffff" stroke="#ffffff" stroke-width="4"/>` +
      `<circle cx="18" cy="18" r="6.5" fill="#ffffff" stroke="${line}" stroke-width="1.8"/>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">${sel}${shape}</svg>`
}

function markerDataUri(type: PointType, selected: boolean, lost: boolean): string {
  // base64 데이터 URI (SVG 아이콘 렌더링에 가장 안정적)
  return 'data:image/svg+xml;base64,' + btoa(svgFor(type, selected, lost))
}

export function controlPointStyle(p: ControlPoint, selected: boolean): Style {
  return new Style({
    image: new Icon({ src: markerDataUri(p.type, selected, p.lost) }),
    text: new Text({
      text: p.name,
      offsetY: -20,
      font: '12px system-ui, sans-serif',
      fill: new Fill({ color: '#111827' }),
      stroke: new Stroke({ color: '#ffffff', width: 3 }),
    }),
  })
}
