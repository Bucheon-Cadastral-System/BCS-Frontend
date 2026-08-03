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

// 마커는 라이트·다크 모두 흰 칩을 유지한다(지도 위 대비). 조사완료는 화면 강조색인 청록, 망실은 붉은색,
// 선택은 밝은 청록 링으로 나타낸다. 라벨만 테마에 따라 밝기를 바꾼다.
const PALETTE: Record<MapTheme, Palette> = {
  light: { paper: '#ffffff', ink: '#111827', aux: '#4b5563', lost: '#dc2626', sel: '#0E6B5C', done: '#0E6B5C', label: '#16302c', labelHalo: '#ffffff' },
  dark: { paper: '#ffffff', ink: '#111827', aux: '#4b5563', lost: '#dc2626', sel: '#38B8A0', done: '#23A88F', label: '#f8fafc', labelHalo: '#0f172a' },
}

/**
 * 지적기준점 공식 도식 마커 (36x36 · 중심 18,18). 라이트/다크 팔레트 대응.
 * 삼각점=크로스헤어 원(⊕) / 삼각보조점=채운 원(●) / 도근점=작은 빈 원(○).
 * 후광(paper)로 배경 대비, 선택=청록 링, 망실=빨강+빨간 X 뱃지, 조사완료=청록 V 뱃지.
 */
function svgFor(type: PointType, selected: boolean, lost: boolean, done: boolean, p: Palette): string {
  // 조사 결과를 도식 선 색으로도 보여 준다 — 뱃지는 작아서 줌아웃에서는 잘 안 보인다. 망실 판정이 먼저.
  const ink = lost ? p.lost : done ? p.done : p.ink
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
    const inner = lost ? p.lost : done ? p.done : p.aux
    shape =
      `<circle cx="18" cy="18" r="9" fill="${p.paper}" stroke="${p.paper}" stroke-width="4"/>` +
      `<circle cx="18" cy="18" r="9" fill="${inner}" stroke="${ink}" stroke-width="1.8"/>`
  } else {
    shape =
      `<circle cx="18" cy="18" r="6.5" fill="${p.paper}" stroke="${p.paper}" stroke-width="4"/>` +
      `<circle cx="18" cy="18" r="6.5" fill="${p.paper}" stroke="${ink}" stroke-width="1.8"/>`
  }

  // 망실=빨간 X, 조사완료(정상)=파란/초록 V. (망실도 done이지만 lost를 먼저 판정)
  const badge = lost
    ? `<circle cx="28" cy="8" r="6" fill="${p.lost}" stroke="#ffffff" stroke-width="1.5"/>` +
      '<path d="M25.6 5.6 L30.4 10.4 M30.4 5.6 L25.6 10.4" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>'
    : done
      ? `<circle cx="28" cy="8" r="6" fill="${p.done}" stroke="#ffffff" stroke-width="1.5"/>` +
        '<path d="M25.3 8 L27 9.8 L30.7 6" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
      : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">${sel}${shape}${badge}</svg>`
}

/**
 * 도식은 (종류·선택·망실·조사됨·테마) 조합에만 달려 있어 가짓수가 48개뿐이다.
 * 점 수천 개를 한 화면에 그리면 스타일 함수가 그만큼 불리므로, 조합마다 한 번만 만들어 돌려 쓴다.
 */
const iconCache = new Map<string, Icon>()
const plainStyleCache = new Map<string, Style>()

function styleKey(type: PointType, selected: boolean, lost: boolean, done: boolean, theme: MapTheme): string {
  return `${theme}|${type}|${selected ? 1 : 0}|${lost ? 1 : 0}|${done ? 1 : 0}`
}

function markerIcon(key: string, type: PointType, selected: boolean, lost: boolean, done: boolean, theme: MapTheme): Icon {
  const cached = iconCache.get(key)
  if (cached) {
    return cached
  }
  const icon = new Icon({
    src: 'data:image/svg+xml;base64,' + btoa(svgFor(type, selected, lost, done, PALETTE[theme])),
  })
  iconCache.set(key, icon)
  return icon
}

/**
 * @param withLabel 이름을 함께 그릴지. 멀리서 보면 라벨끼리 겹쳐 읽을 수 없어 도식만 남긴다.
 */
export function controlPointStyle(
  cp: ControlPoint,
  selected: boolean,
  survey: SurveyView = 'none',
  theme: MapTheme = 'light',
  withLabel = true,
): Style {
  // 우상단 뱃지: 망실=빨간 X, 조사완료=V (둘 다 '조사됨')
  const lost = survey === 'lost'
  const done = survey === 'done' || lost
  const key = styleKey(cp.type, selected, lost, done, theme)

  if (!withLabel) {
    // 이름이 빠지면 같은 조합의 점들이 완전히 같은 스타일이라 하나를 공유할 수 있다
    const cached = plainStyleCache.get(key)
    if (cached) {
      return cached
    }
    const style = new Style({ image: markerIcon(key, cp.type, selected, lost, done, theme) })
    plainStyleCache.set(key, style)
    return style
  }

  const pal = PALETTE[theme]
  return new Style({
    image: markerIcon(key, cp.type, selected, lost, done, theme),
    text: new Text({
      text: cp.name,
      offsetY: -20,
      font: '12px system-ui, sans-serif',
      fill: new Fill({ color: pal.label }),
      stroke: new Stroke({ color: pal.labelHalo, width: 3 }),
    }),
  })
}
