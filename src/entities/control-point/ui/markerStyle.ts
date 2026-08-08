import type { SurveyStatus } from '@/entities/survey-record'
import { Style, Icon, Fill, Stroke, Text } from 'ol/style'
import type { ControlPoint, PointType } from '../model/types'
import { POINT_TYPES } from '../model/types'

/** 조사상태 표현: none=프로젝트 없음, todo=미조사(흐리게), done=정상(체크), lost=망실(빨강) */
// 조사 상태는 survey-record 가 권위 — 'none' 은 조사 화면이 아닐 때(상태 자체가 없음)를 뜻한다
export type SurveyView = SurveyStatus | 'none'
export type MapTheme = 'light' | 'dark'

interface Palette {
  paper: string // 마커 바탕/후광
  ink: string // 선/도식
  aux: string // 보조점 채움
  lost: string // 망실
  unavailable: string // 조사불가
  etc: string // 기타
  sel: string // 선택 링
  done: string // 정상 체크 (파랑)
  label: string // 이름 글자
  labelHalo: string // 이름 후광
}

/**
 * 도식에 반영하는 갈래. 미조사와 '조사 화면 아님'은 겉모습이 같아 한 칸을 함께 쓴다.
 * 나머지 넷은 결과가 서로 다른 사실이라 색과 뱃지를 따로 가진다.
 */
const MARKER_VARIANTS = ['plain', 'done', 'lost', 'unavailable', 'etc'] as const
type MarkerVariant = (typeof MARKER_VARIANTS)[number]

function variantOf(survey: SurveyView): MarkerVariant {
  return survey === 'todo' || survey === 'none' ? 'plain' : survey
}

// 마커는 라이트·다크 모두 흰 칩을 유지한다(지도 위 대비). 정상은 화면 강조색인 청록, 망실은 붉은색,
// 선택은 밝은 청록 링으로 나타낸다. 라벨만 테마에 따라 밝기를 바꾼다.
const PALETTE: Record<MapTheme, Palette> = {
  light: { paper: '#ffffff', ink: '#16302C', aux: '#4D6963', lost: '#A6402F', unavailable: '#B07A18', etc: '#4D5A60', sel: '#23A88F', done: '#0E6B5C', label: '#16302C', labelHalo: '#ffffff' },
  dark: { paper: '#ffffff', ink: '#16302C', aux: '#4D6963', lost: '#A6402F', unavailable: '#B07A18', etc: '#4D5A60', sel: '#38B8A0', done: '#23A88F', label: '#E6EFF1', labelHalo: '#04080A' },
}

/**
 * 지적기준점 공식 도식 마커 (36x36 · 중심 18,18). 라이트/다크 팔레트 대응.
 * 삼각점=크로스헤어 원(⊕) / 삼각보조점=채운 원(●) / 도근점=작은 빈 원(○).
 * 후광(paper)로 배경 대비, 선택=청록 링, 망실=빨강+빨간 X 뱃지, 정상=청록 V 뱃지.
 */
/** 갈래별 도식 선 색 — 뱃지는 작아서 줌아웃에서 잘 안 보이므로 선 색으로도 결과를 말한다. */
function variantColor(variant: MarkerVariant, p: Palette): string | null {
  if (variant === 'done') return p.done
  if (variant === 'lost') return p.lost
  if (variant === 'unavailable') return p.unavailable
  if (variant === 'etc') return p.etc
  return null
}

/** 갈래별 우측 상단 뱃지 — 정상은 체크, 망실은 X, 조사불가는 느낌표, 기타는 가로줄. */
function badgeFor(variant: MarkerVariant, p: Palette): string {
  const color = variantColor(variant, p)
  if (color === null) return ''
  const plate = `<circle cx="28" cy="8" r="6" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>`
  const glyph =
    variant === 'done'
      ? '<path d="M25.3 8 L27 9.8 L30.7 6" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
      : variant === 'lost'
        ? '<path d="M25.6 5.6 L30.4 10.4 M30.4 5.6 L25.6 10.4" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>'
        : variant === 'unavailable'
          ? '<path d="M28 4.9 L28 8.4" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>' +
            '<circle cx="28" cy="10.7" r="1" fill="#ffffff"/>'
          : '<path d="M25.4 8 L30.6 8" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>'
  return plate + glyph
}

/**
 * 지적기준점 공식 도식 마커 (36x36 · 중심 18,18). 라이트/다크 팔레트 대응.
 * 삼각점=크로스헤어 원(⊕) / 삼각보조점=채운 원(●) / 도근점=작은 빈 원(○).
 * 후광(paper)로 배경 대비, 선택=청록 링, 조사 결과=도식 선 색과 우측 상단 뱃지.
 */
function svgFor(type: PointType, selected: boolean, variant: MarkerVariant, p: Palette): string {
  const ink = variantColor(variant, p) ?? p.ink
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
    const inner = variantColor(variant, p) ?? p.aux
    shape =
      `<circle cx="18" cy="18" r="9" fill="${p.paper}" stroke="${p.paper}" stroke-width="4"/>` +
      `<circle cx="18" cy="18" r="9" fill="${inner}" stroke="${ink}" stroke-width="1.8"/>`
  } else {
    shape =
      `<circle cx="18" cy="18" r="6.5" fill="${p.paper}" stroke="${p.paper}" stroke-width="4"/>` +
      `<circle cx="18" cy="18" r="6.5" fill="${p.paper}" stroke="${ink}" stroke-width="1.8"/>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">${sel}${shape}${badgeFor(variant, p)}</svg>`
}

/* ── WebGL 점 레이어용 스프라이트 아틀라스 ──
 * 캔버스 벡터 렌더는 팬·줌 중 재실행(2천 drawImage×실행기 오버헤드)이 구조적 비용이라,
 * 도식은 WebGL 레이어가 GPU 로 그린다. WebGL 스타일은 텍스처가 하나뿐이라 60개 조합(테마 2×종류 3×선택 2×갈래 5)을
 * 한 장에 이어 붙이고, 점마다 몇 번째 칸인지(sym)를 피처 속성으로 든다. */

/** 아틀라스 한 칸의 픽셀 크기 — svgFor 의 36×36 과 같아야 한다 */
export const MARKER_ATLAS_CELL = 36
/** 아틀라스 총 칸 수 — 테마까지 한 줄에 편다(테마 전환 = sym 재계산, 드문 일이라 충분) */
export const MARKER_ATLAS_CELLS = 60

const TYPE_INDEX: Record<PointType, number> = { [POINT_TYPES[0]]: 0, [POINT_TYPES[1]]: 1, [POINT_TYPES[2]]: 2 }

const VARIANT_INDEX: Record<MarkerVariant, number> = { plain: 0, done: 1, lost: 2, unavailable: 3, etc: 4 }

/** 칸 번호 — 아틀라스를 채우는 자리와 이 함수가 같은 식을 써야 한다. */
function cellIndex(type: PointType, selected: boolean, variant: MarkerVariant, theme: MapTheme): number {
  return (
    (theme === 'dark' ? 30 : 0) +
    TYPE_INDEX[type] * 10 +
    (selected ? 5 : 0) +
    VARIANT_INDEX[variant]
  )
}

/** 이 점이 아틀라스의 몇 번째 칸인지 — 도식 스타일 캐시와 같은 축(테마·종류·선택·갈래)으로 정한다. */
export function markerSymbolIndex(
  type: PointType,
  selected: boolean,
  survey: SurveyView,
  theme: MapTheme,
): number {
  return cellIndex(type, selected, variantOf(survey), theme)
}

let atlasPromise: Promise<string> | null = null

/** 조합 하나를 이미지로 읽는다 — SVG 데이터 URL 은 로드가 비동기라 Promise 로 기다린다. */
function loadSymbol(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('marker atlas: 도식 이미지를 읽지 못했습니다.'))
    image.src = 'data:image/svg+xml;base64,' + btoa(svg)
  })
}

/** 60개 조합을 한 장으로 이어 붙인 아틀라스(데이터 URL) — 한 번 만들어 돌려 쓴다. */
export function markerAtlasUrl(): Promise<string> {
  if (atlasPromise !== null) return atlasPromise
  atlasPromise = (async () => {
    const canvas = document.createElement('canvas')
    canvas.width = MARKER_ATLAS_CELL * MARKER_ATLAS_CELLS
    canvas.height = MARKER_ATLAS_CELL
    const ctx = canvas.getContext('2d')
    if (ctx === null) throw new Error('marker atlas: 캔버스 컨텍스트를 열지 못했습니다.')
    const jobs: Promise<void>[] = []
    for (const theme of ['light', 'dark'] as const) {
      for (const type of POINT_TYPES) {
        for (const selected of [false, true]) {
          for (const variant of MARKER_VARIANTS) {
            const at = cellIndex(type, selected, variant, theme)
            jobs.push(
              loadSymbol(svgFor(type, selected, variant, PALETTE[theme])).then((image) => {
                ctx.drawImage(image, at * MARKER_ATLAS_CELL, 0)
              }),
            )
          }
        }
      }
    }
    await Promise.all(jobs)
    return canvas.toDataURL('image/png')
  })()
  return atlasPromise
}

/**
 * 지도 라벨 글꼴 — 캔버스에 그리는 글자라 CSS 를 못 받는다. 화면 토큰을 한 번 읽어 같은 글꼴로 맞춘다.
 * 처음 그릴 때 읽는다 — 모듈을 읽는 시점에는 스타일시트가 아직 붙지 않았을 수 있다.
 */
let labelFontCache = ''
function labelFont(): string {
  if (labelFontCache === '') {
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim()
    labelFontCache = `12px ${family || 'system-ui, sans-serif'}`
  }
  return labelFontCache
}

/**
 * 도식은 (종류·선택·갈래·테마) 조합에만 달려 있어 가짓수가 60개뿐이다.
 * 점 수천 개를 한 화면에 그리면 스타일 함수가 그만큼 불리므로, 조합마다 한 번만 만들어 돌려 쓴다.
 * 라벨 스타일은 이름이 끼어 점마다 다르다 — 테마+이름 키로 따로 캐시한다(재스타일마다 Text·Fill·Stroke 를
 * 새로 만들면 라벨 줌에서 화면 안 점 수만큼 할당이 생긴다).
 */
const iconCache = new Map<string, Icon>()
const plainStyleCache = new Map<string, Style>()
const labelOnlyCache = new Map<string, Style>()
/** 라벨 캐시 상한 — 테마×이름이라 무한하지 않지만, 넘치면 통째로 비워 다음 프레임이 다시 채운다(드문 일회 비용) */
const LABELED_CACHE_LIMIT = 8_000

function styleKey(type: PointType, selected: boolean, variant: MarkerVariant, theme: MapTheme): string {
  return `${theme}|${type}|${selected ? 1 : 0}|${variant}`
}

function markerIcon(key: string, type: PointType, selected: boolean, variant: MarkerVariant, theme: MapTheme): Icon {
  const cached = iconCache.get(key)
  if (cached) {
    return cached
  }
  const icon = new Icon({
    src: 'data:image/svg+xml;base64,' + btoa(svgFor(type, selected, variant, PALETTE[theme])),
  })
  iconCache.set(key, icon)
  return icon
}

/** 도식만 그리는 스타일 — 같은 조합의 점들이 완전히 같은 스타일이라 하나를 공유한다. */
export function controlPointStyle(
  cp: ControlPoint,
  selected: boolean,
  survey: SurveyView = 'none',
  theme: MapTheme = 'light',
): Style {
  const variant = variantOf(survey)
  const key = styleKey(cp.type, selected, variant, theme)

  const cached = plainStyleCache.get(key)
  if (cached) {
    return cached
  }
  const style = new Style({ image: markerIcon(key, cp.type, selected, variant, theme) })
  plainStyleCache.set(key, style)
  return style
}

/**
 * 이름 라벨만 그리는 스타일 — 도식과 레이어를 갈라 declutter 를 라벨 쪽에만 걸기 위한 것.
 * declutter 레이어는 이동·줌 중 캔버스 재사용(fast path)을 못 타 매 프레임 전체를 다시 그리므로,
 * 수천 점을 든 도식 레이어에 걸면 지도 조작 내내 프레임을 깎는다. 라벨 색은 조사 상태와 무관해 테마+이름이 키의 전부다.
 */
export function controlPointLabelStyle(cp: ControlPoint, theme: MapTheme = 'light'): Style {
  const key = `${theme}|${cp.name}`
  const cached = labelOnlyCache.get(key)
  if (cached) {
    return cached
  }
  if (labelOnlyCache.size >= LABELED_CACHE_LIMIT) {
    labelOnlyCache.clear()
  }
  const pal = PALETTE[theme]
  const style = new Style({
    text: new Text({
      text: cp.name,
      offsetY: -20,
      font: labelFont(),
      fill: new Fill({ color: pal.label }),
      stroke: new Stroke({ color: pal.labelHalo, width: 3 }),
    }),
  })
  labelOnlyCache.set(key, style)
  return style
}
