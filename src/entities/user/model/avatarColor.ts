/**
 * 이름 첫 글자를 담는 동그란 표식.
 * 바탕색은 이름에서 뽑으므로 같은 사람은 어느 화면에서나 같은 색으로 나타난다 — 목록을 훑을 때 이름보다 색이 먼저 잡힌다.
 */

/** 흰 글자를 얹어도 읽히는 짙은 색만 모았다. 청록 하나로 가는 화면이라 강조색과 부딪히지 않는 색조로 고른다. */
const AVATAR_COLORS = [
  '#0f7a66',
  '#1f6f8b',
  '#2f5fa0',
  '#4b4f9e',
  '#6b4694',
  '#8c3f79',
  '#a34057',
  '#9b5a2b',
] as const

/**
 * 이름 → 색.
 * 자릿수를 섞는 곱셈 해시(31)로 글자 순서까지 반영한다. 한글은 한 글자가 코드 포인트 하나라 그대로 더해도 흩어진다.
 */
export function avatarColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (Math.imul(hash, 31) + (char.codePointAt(0) ?? 0)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
