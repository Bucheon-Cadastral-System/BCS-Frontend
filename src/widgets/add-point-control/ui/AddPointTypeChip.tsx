import { useRef, useState } from 'react'
import { POINT_TYPES, PointTypeIcon } from '@/entities/control-point'
import type { PointType } from '@/entities/control-point'
import { MapChip } from '@/shared/ui/MapChip'
import { useDismiss } from '@/shared/lib/useDismiss'

/**
 * 추가 모드에서 어떤 종류를 찍는 중인지 보여주는 칩 (조사 프로젝트 칩과 같은 자리·모양).
 * 누르면 종류 목록이 열려 바로 바꿀 수 있다.
 */
export function AddPointTypeChip(props: { type: PointType; onChange: (type: PointType) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  useDismiss({ enabled: open, onDismiss: () => setOpen(false), ref: rootRef })

  return (
    <div ref={rootRef} className="relative">
      <MapChip
        label="현재 선택중"
        value={props.type}
        accent="active"
        title="추가할 기준점 종류 바꾸기"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        leading={<PointTypeIcon type={props.type} className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        trailing={
          <svg
            viewBox="0 0 24 24"
            className={`size-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        }
      />

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
