import { useSyncExternalStore } from 'react'

/** 좁은 화면(모바일 배치)의 경계 — Tailwind lg 와 같은 값이라 CSS 와 동작이 같은 지점에서 갈린다 */
const NARROW = '(max-width: 1023.98px)'

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
