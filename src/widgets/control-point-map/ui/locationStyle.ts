import type { FeatureLike } from 'ol/Feature'
import { Icon, Style } from 'ol/style'
import { MARKER_ATLAS_CELL } from '@/entities/control-point'
import { readThemeVar } from '@/shared/lib/themeVar'

/**
 * 현재 위치 도식 — 셀 36×36, 중심 (18,18). 기준점 아틀라스와 같은 규격이라 눈높이가 같다.
 *
 * <p>원을 쓰지 않는다. 기준점 도식은 셋 모두 흰 칩 위의 원(⊕ ● ○)이라, 원으로 그리면 크기와 색만
 * 다른 또 하나의 기준점으로 읽힌다.
 *
 * <p>방향각이 있으면 화살촉을 돌리고, 없으면 마름모로 둔다. heading 은 실내·데스크톱에서 거의 늘 비어
 * 있는데, 그때도 화살촉을 세워 두면 알지 못하는 방향을 가리키게 된다.
 *
 * <p>색은 현재 위치 전용 한 쌍이다. 면은 배경지도가 바뀌어도 같은 값을 쓰고, 테두리만 배경 밝기를 따라
 * 뒤집는다. 테두리가 뒤집히므로 테마가 바뀌면 다시 만들어야 하고, 그래서 만드는 자리를 함수로 둔다.
 */
const ARROW_PATH = 'M18 4 L28.6 29.5 L18 23.6 L7.4 29.5 Z'
const IDLE_PATH = 'M18 5.5 L30.5 18 L18 30.5 L5.5 18 Z'

/** 테두리는 장식이 아니라 대비 장치다 — 라이트 배경지도의 흰 도로 위에서는 면만으로 윤곽이 서지 않는다 */
const EDGE_WIDTH = 2.6

/** paint-order: 테두리를 면 밖으로 밀어 도식이 굵기의 절반만큼 깎이지 않게 한다 */
function icon(path: string, fill: string, edge: string, rotateWithView: boolean): Icon {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MARKER_ATLAS_CELL}" height="${MARKER_ATLAS_CELL}" viewBox="0 0 36 36">` +
    `<path d="${path}" fill="${fill}" stroke="${edge}" stroke-width="${EDGE_WIDTH}" paint-order="stroke" stroke-linejoin="round"/>` +
    '</svg>'
  return new Icon({ src: 'data:image/svg+xml;base64,' + btoa(svg), rotateWithView })
}

/**
 * 위치 레이어의 스타일 함수를 만든다 — heading(도, 북 0° 시계방향)이 있으면 화살촉을 그 각도로 돌린다.
 * 화살촉은 rotateWithView 로 지도를 돌려도 지리 방향을 지킨다.
 */
export function makeLocationStyle(root: Element): (feature: FeatureLike) => Style {
  const fill = readThemeVar(root, '--color-locate', '#ffe23d')
  const edge = readThemeVar(root, '--color-locate-edge', '#ffffff')
  const arrowIcon = icon(ARROW_PATH, fill, edge, true)
  const arrow = new Style({ image: arrowIcon, zIndex: 101 })
  const idle = new Style({ image: icon(IDLE_PATH, fill, edge, false), zIndex: 101 })
  return (feature) => {
    const heading = feature.get('heading') as number | undefined
    if (heading === undefined) return idle
    arrowIcon.setRotation((heading * Math.PI) / 180)
    return arrow
  }
}
