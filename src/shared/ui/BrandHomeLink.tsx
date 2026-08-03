import { Link } from 'react-router-dom'
import { BrandLockup } from './BrandLockup'
import type { ComponentProps } from 'react'

/** 헤더의 브랜드 락업 — 누르면 메인(지도)으로 이동한다. 표시는 BrandLockup 그대로. */
export function BrandHomeLink(props: ComponentProps<typeof BrandLockup>) {
  return (
    <Link to="/" aria-label="메인 화면으로 이동" className="rounded-ctl focus-visible:outline-2 focus-visible:outline-offset-4">
      <BrandLockup {...props} />
    </Link>
  )
}
