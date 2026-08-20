import { avatarColor } from '../model/avatarColor'

/**
 * 이름 첫 글자를 담는 동그란 표식.
 * 바탕색은 이름에서 뽑으므로 같은 사람은 어느 화면에서나 같은 색으로 나타난다.
 * 크기·글자 크기는 쓰는 자리가 정한다(className).
 *
 * @param guest 로그인하지 않고 보는 상태 — 뽑을 이름이 없으므로 자리표시 대신 그 사실을 적는다
 */
export function UserAvatar({ name, className, guest = false }: { name: string; className?: string; guest?: boolean }) {
  if (guest) {
    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-full bg-teal-wash font-bold text-teal-text ${className ?? ''}`}
      >
        G
      </span>
    )
  }
  // 회원 정보 입력을 마치지 않은 계정은 이름이 없다 — 글자 없는 표식을 쓰고 색도 뽑지 않는다
  if (!name) {
    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-full bg-soft text-ink-4 ${className ?? ''}`}
      >
        ·
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-on-teal ${className ?? ''}`}
      style={{ backgroundColor: avatarColor(name) }}
    >
      {name.slice(0, 1)}
    </span>
  )
}
