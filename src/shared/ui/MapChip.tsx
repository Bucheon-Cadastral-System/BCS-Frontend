import type { ReactNode } from 'react'

/**
 * 지도 위에 떠 있는 상태 칩의 공통 껍데기 (좌상단 오버레이).
 * 조사 프로젝트 칩·추가 종류 칩이 같은 모양이라 여기서 한 번만 정의한다(따로 두면 한쪽만 바뀌어 어긋난다).
 */
export function MapChip(props: {
  label: string
  value: string
  /** 값 왼쪽 표식(점·아이콘) */
  leading?: ReactNode
  /** 값 오른쪽 부가 표시(진행률·펼침 화살표) */
  trailing?: ReactNode
  accent?: 'default' | 'active'
  title?: string
  onClick: () => void
  'aria-expanded'?: boolean
}) {
  const active = props.accent === 'active'
  return (
    <button
      type="button"
      onClick={props.onClick}
      title={props.title}
      aria-expanded={props['aria-expanded']}
      className={`flex max-w-[320px] items-center gap-3 rounded-xl border bg-white/95 py-2.5 pl-3.5 pr-4 shadow-lg backdrop-blur hover:bg-white dark:bg-gray-800/95 dark:hover:bg-gray-800 ${
        active ? 'border-blue-300 dark:border-blue-500/60' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {props.leading}
      <span className="min-w-0 text-left">
        <span className="block text-[11px] font-medium leading-tight text-gray-500 dark:text-gray-400">{props.label}</span>
        <span className="block truncate text-[15px] font-semibold leading-snug text-gray-900 dark:text-gray-100">
          {props.value}
        </span>
      </span>
      {props.trailing}
    </button>
  )
}
