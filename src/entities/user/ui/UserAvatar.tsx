import { useEffect, useState } from 'react'
import { useProfileImageQuery } from '../api/queries'
import { avatarColor } from '../model/avatarColor'

/** 네 갈래가 같은 크기·모양을 쓰도록 묶은 공통 클래스 */
const BASE = 'flex shrink-0 items-center justify-center rounded-full'

/**
 * 프로필 표식 — 등록한 사진이 있으면 그 사진을, 없으면 이름 첫 글자를 담는다.
 * 바탕색은 이름에서 뽑으므로 같은 사람은 어느 화면에서나 같은 색으로 나타난다.
 * 크기·글자 크기는 쓰는 자리가 정한다(className).
 *
 * @param guest 로그인하지 않고 보는 상태 — 뽑을 이름이 없으므로 자리표시 대신 그 사실을 적는다
 */
export function UserAvatar({
  name,
  className,
  guest = false,
  profileImageUrl = null,
}: {
  name: string
  className?: string
  guest?: boolean
  profileImageUrl?: string | null
}) {
  const image = useProfileImageQuery(profileImageUrl)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    setLoadFailed(false)
    if (image.data === undefined) {
      setObjectUrl(null)
      return
    }
    const nextUrl = URL.createObjectURL(image.data)
    setObjectUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [image.data])

  // 조회 실패와 로드 실패는 첫 글자 표식으로 대체한다
  if (objectUrl !== null && !image.isError && !loadFailed) {
    return (
      <span aria-hidden="true" className={`${BASE} overflow-hidden bg-soft ${className ?? ''}`}>
        <img src={objectUrl} alt="" className="size-full object-cover" onError={() => setLoadFailed(true)} />
      </span>
    )
  }
  if (guest) {
    return <span aria-hidden="true" className={`${BASE} bg-teal-wash font-bold text-teal-text ${className ?? ''}`}>G</span>
  }
  // 회원 정보 입력을 마치지 않은 계정은 이름이 없다 — 글자 없는 표식을 쓰고 색도 뽑지 않는다
  if (!name) {
    return <span aria-hidden="true" className={`${BASE} bg-soft text-ink-4 ${className ?? ''}`}>·</span>
  }
  return (
    <span
      aria-hidden="true"
      className={`${BASE} font-semibold text-on-teal ${className ?? ''}`}
      style={{ backgroundColor: avatarColor(name) }}
    >
      {name.slice(0, 1)}
    </span>
  )
}
