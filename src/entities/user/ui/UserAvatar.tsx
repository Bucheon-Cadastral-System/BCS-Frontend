import { avatarColor } from '../model/avatarColor'

/**
 * 이름 첫 글자를 담는 동그란 표식.
 * 바탕색은 이름에서 뽑으므로 같은 사람은 어느 화면에서나 같은 색으로 나타난다.
 * 크기·글자 크기는 쓰는 자리가 정한다(className).
 */
export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-[#EFFBF7] ${className ?? ''}`}
      style={{ backgroundColor: avatarColor(name) }}
    >
      {name.slice(0, 1)}
    </span>
  )
}
