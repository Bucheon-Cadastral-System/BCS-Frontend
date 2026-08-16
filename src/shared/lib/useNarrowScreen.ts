import { useSyncExternalStore } from 'react'

/**
 * 좁은 화면(모바일 배치)의 경계 — Tailwind lg 와 같은 값이라 CSS 와 동작이 같은 지점에서 갈린다.
 *
 * <p>px 이 아니라 rem 으로 적는다. lg 는 64rem 이라, 글자를 키워 둔 기기에서는 그 경계가 1024px 이 아니다.
 * 같은 지점에서 갈리지 않으면 CSS 는 좁은 배치인데 코드는 넓은 배치로 판단하는 폭이 생긴다.
 */
const NARROW = '(width < 64rem)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(NARROW)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * 지금이 모바일 배치인지.
 *
 * <p>자리와 크기는 CSS 로 가르지만, 무엇이 동시에 설 수 있는지 같은 동작 규칙은 CSS 로 가를 수 없다.
 * 좁은 화면에서는 시트가 화면을 거의 덮어 좌측 패널과 상세가 함께 설 수 없고, 그 배타 규칙을 화면 폭으로
 * 판단해야 하므로 여기서 읽는다.
 */
export function useNarrowScreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW).matches,
    () => false, // 서버 렌더가 없어 실제로 쓰이지 않지만, 훅 계약상 넓은 화면을 기본으로 둔다
  )
}
