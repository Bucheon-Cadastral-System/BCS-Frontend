// 공용 Tailwind 유틸 클래스 (다크 툴바 계열 버튼/셀렉트/라벨)

export function btn(variant?: 'on' | 'danger'): string {
  const base = 'text-[13px] px-2.5 py-1.5 rounded-md border cursor-pointer disabled:opacity-50'
  if (variant === 'on') return `${base} border-blue-600 bg-blue-600 text-white hover:bg-blue-500`
  if (variant === 'danger') return `${base} border-red-800 bg-red-900 text-gray-50 hover:bg-red-800`
  return `${base} border-gray-600 bg-gray-700 text-gray-50 hover:bg-gray-600`
}

export const selectCls =
  'text-[13px] px-1.5 py-1 rounded-md border border-gray-600 bg-gray-900 text-gray-50'

export const ctlLabel = 'inline-flex items-center gap-1.5 text-[13px] text-gray-300'
