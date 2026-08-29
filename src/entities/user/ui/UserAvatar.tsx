import { useEffect, useState } from 'react'
import { useProfileImageQuery } from '../api/queries'

/**
 * 프로필 이미지가 있으면 인증 요청으로 받은 파일을 표시하고, 없거나 조회에 실패하면
 * 사람 모양 기본 아이콘을 표시한다. 크기는 쓰는 자리가 정한다(className).
 */
export function UserAvatar({ className, profileImageUrl = null }: { name: string; className?: string; guest?: boolean; profileImageUrl?: string | null }) {
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

  const showImage = objectUrl !== null && !image.isError && !loadFailed

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-soft text-ink-4 ${className ?? ''}`}
    >
      {showImage ? (
        <img src={objectUrl} alt="" className="size-full object-cover" onError={() => setLoadFailed(true)} />
      ) : (
        <svg viewBox="0 0 24 24" className="size-[58%]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        </svg>
      )}
    </span>
  )
}
