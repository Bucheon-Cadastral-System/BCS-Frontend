import { Style, Icon, Fill, Stroke, Text } from 'ol/style'
import type { ControlPoint, PointType } from '../model/types'

/** 조사상태 표현: none=프로젝트 없음, todo=미조사(흐리게), done=조사완료(정상·체크), lost=망실(빨강) */
export type SurveyView = 'none' | 'todo' | 'done' | 'lost'
export type MapTheme = 'light' | 'dark'

interface Palette {
  paper: string // 마커 바탕/후광
  ink: string // 선/도식
  aux: string // 보조점 채움
  lost: string // 망실
  sel: string // 선택 링
  done: string // 조사완료 체크 (파랑)
  label: string // 이름 글자
  labelHalo: string // 이름 후광
}

const PALETTE: Record<MapTheme, Palette> = {
  light: { paper: '#ffffff', ink: '#111827', aux: '#4b5563', lost: '#dc2626', sel: '#f59e0b', done: '#2563eb', label: '#111827', labelHalo: '#ffffff' },
  // 다크맵에서도 마커는 흰 칩 유지(대비 위해). 완료=초록(파랑은 다크맵과 뭉개짐), 라벨만 밝게.
  dark: { paper: '#ffffff', ink: '#111827', aux: '#4b5563', lost: '#dc2626', sel: '#f59e0b', done: '#22c55e', label: '#f8fafc', labelHalo: '#0f172a' },
}

/**
 * 지적기준점 공식 도식 마커 (36x36 · 중심 18,18). 라이트/다크 팔레트 대응.
 * 삼각점=크로스헤어 원(⊕) / 삼각보조점=채운 원(●) / 도근점=작은 빈 원(○).
 * 후광(paper)로 배경 대비, 선택=주황 링, 망실=빨강, 조사완료=파란 체크.
 */
function svgFor(type: PointType, selected: boolean, lost: boolean, done: boolean, p: Palette): string {
  const ink = lost ? p.lost : p.ink
  const sel = selected ? `<circle cx="18" cy="18" r="14" fill="none" stroke="${p.sel}" stroke-width="3"/>` : ''

  let shape = ''
  if (type === '지적삼각점') {
    const r = 9
    shape =
      `<circle cx="18" cy="18" r="${r}" fill="${p.paper}" stroke="${p.paper}" stroke-width="4"/>` +
      `<circle cx="18" cy="18" r="${r}" fill="${p.paper}" stroke="${ink}" stroke-width="1.8"/>` +
      `<line x1="${18 - r}" y1="18" x2="${18 + r}" y2="18" stroke="${ink}" stroke-width="1.6"/>` +
      `<line x1="18" y1="${18 - r}" x2="18" y2="${18 + r}" stroke="${ink}" stroke-width="1.6"/>`
  } else if (type === '지적삼각보조점') {
    const inner = lost ? p.lost : p.aux
    shape =
      `<circle cx="18" cy="18" r="9" fill="${p.paper}" stroke="${p.paper}" stroke-width="4"/>` +
      `<circle cx="18" cy="18" r="9" fill="${inner}" stroke="${ink}" stroke-width="1.8"/>`
  } else {
    shape =
      `<circle cx="18" cy="18" r="6.5" fill="${p.paper}" stroke="${p.paper}" stroke-width="4"/>` +
      `<circle cx="18" cy="18" r="6.5" fill="${p.paper}" stroke="${ink}" stroke-width="1.8"/>`
  }

  const badge = done
    ? `<circle cx="28" cy="8" r="6" fill="${p.done}" stroke="#ffffff" stroke-width="1.5"/>` +
      '<path d="M25.3 8 L27 9.8 L30.7 6" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">${sel}${shape}${badge}</svg>`
}

function markerDataUri(type: PointType, selected: boolean, lost: boolean, done: boolean, p: Palette): string {
  return 'data:image/svg+xml;base64,' + btoa(svgFor(type, selected, lost, done, p))
}

export function controlPointStyle(
  cp: ControlPoint,
  selected: boolean,
  survey: SurveyView = 'none',
  theme: MapTheme = 'light',
): Style {
  const pal = PALETTE[theme]
  const faded = survey === 'todo'
  return new Style({
    image: new Icon({
      // 망실도 조사완료의 한 종류 → 조사됨(done|lost)이면 우상단 체크 뱃지 표시
      src: markerDataUri(cp.type, selected, survey === 'lost', survey === 'done' || survey === 'lost', pal),
      opacity: faded ? 0.45 : 1,
    }),
    text: new Text({
      text: cp.name,
      offsetY: -20,
      font: '12px system-ui, sans-serif',
      fill: new Fill({ color: faded ? (theme === 'dark' ? '#64748b' : '#9ca3af') : pal.label }),
      stroke: new Stroke({ color: pal.labelHalo, width: 3 }),
    }),
  })
}
