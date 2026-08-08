import type { StatusShape } from './statusRow'
import { SHAPE_COLOR } from './statusRow'

/**
 * 목록 줄 오른쪽 끝의 상태 표시 — 성공은 체크, 제외는 X, 오류·확인 요청은 경고 삼각형.
 * color 를 주면 모양별 기본색 대신 그 색을 쓴다(뜻이 모양이 아니라 도메인 상태에서 오는 자리용).
 */
export function StatusIcon({ shape, label, color }: { shape: StatusShape; label: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-4 shrink-0 ${color ?? SHAPE_COLOR[shape]}`}
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
      ) : shape === 'warn' ? (
        <>
          <path d="M12 4 2.5 20h19L12 4z" />
          <path d="M12 10v3.5M12 17h.01" />
        </>
      ) : shape === 'caution' ? (
        // 가로줄 하나. 삼각형을 씌우면 경고와 한눈에 갈리지 않는다
        <path d="M5 12h14" />
      ) : (
        <path d="m5 13 4 4L19 7" />
      )}
    </svg>
  )
}
