/**
 * 저장된 번호(숫자만)를 읽는 자리에 세울 때의 표기 — `010-1234-5678`.
 *
 * <p>서버는 숫자만 담고 입력칸도 숫자만 받는다. 구분선은 읽을 때만 붙이므로 여기 한 곳에서 만든다.
 * 11자리가 아닌 값(옛 자료·잘못 들어온 값)은 손대지 않고 그대로 보인다.
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length !== 11) return phone
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}
