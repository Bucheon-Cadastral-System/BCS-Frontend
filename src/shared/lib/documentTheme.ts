import type { MapTheme } from '@/shared/model/theme'

/** 문서 바탕과 브라우저가 그리는 부분(주소창 색조·스크롤바)이 따르는 색 */
const CANVAS: Record<MapTheme, string> = { dark: '#04090b', light: '#d3dad7' }

/**
 * 고른 밝기를 문서 뿌리에 적는다.
 *
 * <p>클래스를 화면 안쪽이 아니라 `<html>` 에 두는 이유는 앱이 덮어 그리지 않는 자리 때문이다.
 * 문서 바탕, 브라우저가 그리는 기본 요소(color-scheme), 아이폰에서 화면을 늘렸을 때 드러나는 여백은
 * 모두 뿌리를 보고 색을 정한다. 안쪽에만 적으면 라이트로 두고도 그 자리들만 어둡게 남는다.
 */
export function applyDocumentTheme(theme: MapTheme): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('theme-light', theme === 'light')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CANVAS[theme])
}
