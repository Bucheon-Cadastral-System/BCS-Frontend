import { useState } from 'react'
import { MemberProfileDialog } from './MemberProfileDialog'

/**
 * 사람 이름 한 자리 — 누르면 그 사람의 신원이 선다.
 *
 * <p>id 를 모르는 이름은 글자로만 세운다. 파일로 들어온 기록과 인증이 붙기 전에 남긴 기록이 그렇다.
 */
export function MemberName(props: { id: string | null; name: string | null; className?: string }) {
  const [open, setOpen] = useState(false)
  const name = props.name ?? ''
  const className = props.className ?? ''

  if (name === '') {
    return <span className="text-ink-4">정보 없음</span>
  }
  if (props.id === null) {
    return <span className={`truncate ${className}`}>{name}</span>
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`max-w-full truncate text-teal-text underline-offset-2 hover:underline ${className}`}
      >
        {name}
      </button>
      {open && <MemberProfileDialog memberId={props.id} onClose={() => setOpen(false)} />}
    </>
  )
}
