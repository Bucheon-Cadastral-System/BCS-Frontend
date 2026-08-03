/**
 * 색 전환을 끈 채로 값을 바꾼다.
 * 테마를 뒤집으면 색 토큰이 한꺼번에 바뀌는데, 요소마다 걸어 둔 전환(transition-colors)이 저마다 돌아
 * 글자는 아직 옛 색, 바탕은 벌써 새 색인 중간 화면이 보인다. 바뀌는 순간에만 전환을 멈춰 한 번에 갈아 끼운다.
 */
export function withoutTransition(change: () => void) {
  const root = document.documentElement
  root.classList.add('no-transition')
  change()
  // 두 프레임 뒤에 되돌린다 — 바뀐 색이 그려진 다음이라야 전환이 다시 걸려도 뒤늦게 애니메이션이 시작되지 않는다
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove('no-transition'))
  })
}
