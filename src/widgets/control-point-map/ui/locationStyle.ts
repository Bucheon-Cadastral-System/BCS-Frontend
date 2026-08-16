import type { FeatureLike } from 'ol/Feature'
import { Icon, Style } from 'ol/style'
import { readThemeVar } from '@/shared/lib/themeVar'

/**
 * 현재 위치 도식 — 셀 56×56, 중심 (28,28).
 *
 * <p>자리는 원이다. 지도에서 '지금 나'는 방향이 아니라 한 점이고, 방향은 그 점에 딸린 값이다.
 * 그래서 방향을 알든 모르든 원은 그 자리에 그대로 서고, 방향을 알 때만 원 밖에 화살촉이 하나 더 붙는다.
 *
 * <p>원 뒤에 번짐을 깐다. 기준점도 원이라 크기와 색만으로는 수십 개 사이에서 '지금 나'가 묻힌다.
 * 번짐은 기준점 도식에 없는 모양이라 그 하나만으로 갈린다. 셀이 기준점 아틀라스(36)보다 큰 것은
 * 번짐이 퍼질 자리 때문이고, 점 자체의 크기는 그대로다.
 *
 * <p>화살촉은 셀의 북쪽에 그려 두고 도식 전체를 방위각만큼 돌린다 — 원과 번짐은 돌려도 같은 모양이라
 * 결과적으로 화살촉만 원 둘레를 도는 것으로 보인다. rotateWithView 로 지도를 돌려도 지리 방향을 지킨다.
 *
 * <p>색은 현재 위치 전용 한 쌍이다. 면은 배경지도가 바뀌어도 같은 값을 쓰고, 테두리만 배경 밝기를 따라
 * 뒤집는다. 테두리가 뒤집히므로 테마가 바뀌면 다시 만들어야 하고, 그래서 만드는 자리를 함수로 둔다.
 */
const CELL = 56
const CENTER = CELL / 2
const DOT_RADIUS = 8
/** 번짐이 퍼지는 반지름 — 점의 세 배쯤에서 완전히 사라진다 */
const GLOW_RADIUS = 26
/**
 * 원 밖에 뜨는 화살촉 — 원과 붙이지 않고 한 칸 띄운다.
 *
 * <p>붙이면 둘이 한 덩어리로 굳어 지도 위의 핀처럼 보인다. 남쪽을 가리킬 때가 특히 그렇다.
 * 띄워 두면 원은 자리, 화살촉은 방향으로 따로 읽힌다.
 */
const ARROW_PATH = 'M28 11.6 L32.2 17.8 L23.8 17.8 Z'

/** 테두리는 장식이 아니라 대비 장치다 — 라이트 배경지도의 흰 도로 위에서는 면만으로 윤곽이 서지 않는다 */
const EDGE_WIDTH = 2.6

/** paint-order: 테두리를 면 밖으로 밀어 도식이 굵기의 절반만큼 깎이지 않게 한다 */
function icon(body: string, glow: string, rotateWithView: boolean): Icon {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${CELL}" viewBox="0 0 ${CELL} ${CELL}">` +
    glow +
    body +
    '</svg>'
  // btoa 는 라틴1 만 받는다 — 색 값과 좌표뿐이라 안전하지만, 문자열을 늘릴 때는 이 제약을 기억해야 한다
  return new Icon({ src: 'data:image/svg+xml;base64,' + btoa(svg), rotateWithView })
}

/**
 * 위치 레이어의 스타일 함수를 만든다 — heading(도, 북 0° 시계방향)이 있으면 화살촉이 그쪽을 가리킨다.
 */
export function makeLocationStyle(root: Element): (feature: FeatureLike) => Style {
  const fill = readThemeVar(root, '--color-locate', '#ffe23d')
  const edge = readThemeVar(root, '--color-locate-edge', '#ffffff')
  const paint = `fill="${fill}" stroke="${edge}" stroke-width="${EDGE_WIDTH}" paint-order="stroke" stroke-linejoin="round"`
  const dot = `<circle cx="${CENTER}" cy="${CENTER}" r="${DOT_RADIUS}" ${paint}/>`
  // 번짐은 면과 다른 색을 쓴다 — 밝은 배경지도 위에서는 같은 노랑이 옅어지는 순간 배경에 묻힌다
  const glowColor = readThemeVar(root, '--color-locate-glow', fill)
  // 가운데가 가장 진하고 변으로 갈수록 사라진다. 안쪽은 원에 가려지므로 중간부터가 실제로 보이는 구간이다
  const glow =
    '<defs><radialGradient id="l">' +
    `<stop offset="30%" stop-color="${glowColor}" stop-opacity=".42"/>` +
    `<stop offset="62%" stop-color="${glowColor}" stop-opacity=".2"/>` +
    `<stop offset="100%" stop-color="${glowColor}" stop-opacity="0"/>` +
    '</radialGradient></defs>' +
    `<circle cx="${CENTER}" cy="${CENTER}" r="${GLOW_RADIUS}" fill="url(#l)"/>`
  // 화살촉을 먼저 그리고 원을 덮는다 — 물린 자리에서 두 테두리가 겹쳐 보이지 않는다
  const headedIcon = icon(`<path d="${ARROW_PATH}" ${paint}/>${dot}`, glow, true)
  const headed = new Style({ image: headedIcon, zIndex: 101 })
  const idle = new Style({ image: icon(dot, glow, false), zIndex: 101 })
  return (feature) => {
    const heading = feature.get('heading') as number | undefined
    if (heading === undefined) return idle
    headedIcon.setRotation((heading * Math.PI) / 180)
    return headed
  }
}
