import { useRef } from 'react'
import { POINT_TYPES } from '@/entities/control-point'
import type { PointType } from '@/entities/control-point'
import { TM_ORIGINS } from '@/shared/lib/crs'
import type { TmEpsg } from '@/shared/lib/crs'

interface MapToolbarProps {
  addMode: boolean
  onToggleAdd: () => void
  addType: PointType
  onChangeType: (t: PointType) => void
  tmEpsg: TmEpsg
  onChangeEpsg: (e: TmEpsg) => void
  showCadastral: boolean
  onToggleCadastral: () => void
  count: number
  onImportCsv: (file: File) => void
  onClearAll: () => void
  isAdmin: boolean
  onOpenUserManagement: () => void
}

export function MapToolbar(props: MapToolbarProps) {
  const fileRef = useRef<HTMLInputElement | null>(null)

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <img className="toolbar__logo" src="/logo2.png" alt="" />
        <h1 className="toolbar__title">지적기준점 관리 프로그램</h1>
      </div>
      <div className="toolbar__controls">
        <label className="ctl">
          종류
          <select value={props.addType} onChange={(e) => props.onChangeType(e.target.value as PointType)}>
            {POINT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className="ctl">
          원점
          <select value={props.tmEpsg} onChange={(e) => props.onChangeEpsg(e.target.value as TmEpsg)}>
            {TM_ORIGINS.map((o) => (
              <option key={o.epsg} value={o.epsg}>{o.label}</option>
            ))}
          </select>
        </label>

        <button type="button" className={`btn ${props.addMode ? 'btn--on' : ''}`} onClick={props.onToggleAdd}>
          {props.addMode ? '추가 모드 ON' : '지도 클릭으로 추가'}
        </button>

        <label className="ctl ctl--check">
          <input type="checkbox" checked={props.showCadastral} onChange={props.onToggleCadastral} />
          지적도
        </label>

        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
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

        <span className="toolbar__count">{props.count}점</span>
        <button type="button" className="btn btn--danger" onClick={props.onClearAll}>
          전체 삭제
        </button>
        {props.isAdmin && (
          <button type="button" className="btn toolbar__admin" onClick={props.onOpenUserManagement}>
            사용자 관리
          </button>
        )}
      </div>
    </header>
  )
}
