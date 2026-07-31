import { useState } from 'react'
import { POINT_TYPES, PointTypeIcon } from '@/entities/control-point'
import type { PointType } from '@/entities/control-point'

/**
 * 추가 모드에서 어떤 종류를 찍는 중인지 보여주는 칩 (조사 프로젝트 칩과 같은 자리·모양).
 * 누르면 종류 목록이 열려 바로 바꿀 수 있다.
 */
export function AddPointTypeChip(props: { type: PointType; onChange: (type: PointType) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="추가할 기준점 종류 바꾸기"
        className="flex max-w-[320px] items-center gap-3 rounded-xl border border-blue-300 bg-white/95 py-2.5 pl-3.5 pr-4 shadow-lg backdrop-blur hover:bg-white dark:border-blue-500/60 dark:bg-gray-800/95 dark:hover:bg-gray-800"
      >
        <PointTypeIcon type={props.type} className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <span className="min-w-0 text-left">
          <span className="block text-[11px] font-medium leading-tight text-gray-500 dark:text-gray-400">현재 선택중</span>
          <span className="block truncate text-[15px] font-semibold leading-snug text-gray-900 dark:text-gray-100">{props.type}</span>
        </span>
        <svg viewBox="0 0 24 24" className={`size-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul className="absolute left-0 top-full z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
          {POINT_TYPES.map((t) => (
            <li key={t}>
              <button
                type="button"
                onClick={() => {
                  props.onChange(t)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  t === props.type ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                <PointTypeIcon type={t} className="h-4 w-4" />
                {t}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
