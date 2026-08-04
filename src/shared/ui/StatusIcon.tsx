import type { StatusShape } from './statusRow'
import { SHAPE_COLOR } from './statusRow'

/** 목록 줄 오른쪽 끝의 상태 표시 — 성공은 체크, 제외는 X, 오류·확인 요청은 경고 삼각형 */
export function StatusIcon({ shape, label }: { shape: StatusShape; label: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-4 shrink-0 ${SHAPE_COLOR[shape]}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
    >
      {shape === 'cross' ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : shape === 'warn' || shape === 'caution' ? (
        <>
          <path d="M12 4 2.5 20h19L12 4z" />
          <path d="M12 10v3.5M12 17h.01" />
        </>
      ) : (
        <path d="m5 13 4 4L19 7" />
      )}
    </svg>
  )
}
