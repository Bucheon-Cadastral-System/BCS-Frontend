import { useRef } from 'react'
import { POINT_TYPES } from '@/entities/control-point'
import type { PointType, MapTheme } from '@/entities/control-point'
import { btn, selectCls, ctlLabel } from '@/shared/ui/classes'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'

interface MapToolbarProps {
  addMode: boolean
  onToggleAdd: () => void
  addType: PointType
  onChangeType: (t: PointType) => void
  showCadastral: boolean
  onToggleCadastral: () => void
  count: number
  onImportCsv: (file: File) => void
  onClearAll: () => void
  theme: MapTheme
  onToggleTheme: () => void
}

export function MapToolbar(props: MapToolbarProps) {
  const fileRef = useRef<HTMLInputElement | null>(null)

  return (
    <header className="flex flex-wrap items-center gap-4 bg-gray-800 px-3.5 py-2 text-gray-50">
      <div className="flex items-center gap-2">
        <img className="h-7 w-auto" src="/logo2.png" alt="" />
        <h1 className="whitespace-nowrap text-base font-bold max-sm:text-sm">지적기준점 관리 프로그램</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <label className={ctlLabel}>
          종류
          <select className={selectCls} value={props.addType} onChange={(e) => props.onChangeType(e.target.value as PointType)}>
            {POINT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <button type="button" className={btn(props.addMode ? 'on' : undefined)} onClick={props.onToggleAdd}>
          {props.addMode ? '추가 모드 ON' : '지도 클릭으로 추가'}
        </button>

        <label className="inline-flex items-center gap-1 text-[13px] text-gray-300">
          <input type="checkbox" checked={props.showCadastral} onChange={props.onToggleCadastral} />
          지적도
        </label>

        <button type="button" className={btn()} onClick={() => fileRef.current?.click()}>
          CSV 불러오기
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) props.onImportCsv(f)
            e.target.value = ''
          }}
        />

        <span className="text-[13px] text-gray-400">{props.count}점</span>
        <button type="button" className={btn('danger')} onClick={props.onClearAll}>
          전체 삭제
        </button>
      </div>
      <div className="ml-auto shrink-0">
        <ThemeToggle dark={props.theme === 'dark'} onToggle={props.onToggleTheme} />
      </div>
    </header>
  )
}
