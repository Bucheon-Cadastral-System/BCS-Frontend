/**
 * 테마 토큰 값을 읽는다 — 캔버스·OpenLayers 처럼 CSS 를 받지 못하는 자리에서 쓴다.
 *
 * <p>기준 요소는 반드시 테마 클래스 아래에 있는 화면 안쪽 요소여야 한다. 라이트 값은
 * `.theme-light` 아래에서만 덮이므로 문서 뿌리에서 읽으면 라이트에서도 다크 값이 잡힌다.
 * 그릴 대상이 화면에 붙어 있으면 그 요소를, 화면 밖 캔버스면 그것을 띄운 요소를 넘긴다.
 */
export function readThemeVar(root: Element, name: string, fallback: string): string {
  const value = getComputedStyle(root).getPropertyValue(name).trim()
  return value === '' ? fallback : value
}
