import type { ReactNode } from 'react'
import type { MapTheme } from '@/entities/control-point'

/**
 * 지도 표시 설정 (좌하단, 줌·축척과 같은 묶음).
 * 지적도·배경 밝기는 지도를 보면서 바로 확인하며 켜고 끄는 값이라 지도 위에 항상 드러내 둔다(누르는 즉시 반영).
 */
export function MapLayerControl(props: {
  showCadastral: boolean
  onToggleCadastral: () => void
  theme: MapTheme
  onToggleTheme: () => void
}) {
  const dark = props.theme === 'dark'

  return (
    <div className="absolute bottom-2 left-2 z-[5] w-12">
      <div className="overflow-hidden rounded border border-gray-300 bg-white shadow-md dark:border-gray-600 dark:bg-gray-800">
      <LayerButton label="지적도" active={props.showCadastral} onClick={props.onToggleCadastral}>
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 13 9 5 9-5" />
        </svg>
      </LayerButton>

      {/* 라벨·아이콘이 현재 배경을 그대로 나타낸다(누르면 반대로 바뀜) */}
      <LayerButton
        label={dark ? '다크' : '라이트'}
        onClick={props.onToggleTheme}
        className="border-t border-gray-200 dark:border-gray-700"
      >
        {dark ? (
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        )}
      </LayerButton>
      </div>
    </div>
  )
}

/** 아이콘 + 라벨 세로 버튼. active를 주면 켜진 상태를 파랑으로 표시한다. */
function LayerButton(props: {
  label: string
  active?: boolean
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      title={props.label}
      className={`flex w-full flex-col items-center gap-1 py-2 ${
        props.active
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
      } ${props.className ?? ''}`}
    >
      {props.children}
      <span className="text-[10px] font-medium leading-none">{props.label}</span>
    </button>
  )
}
