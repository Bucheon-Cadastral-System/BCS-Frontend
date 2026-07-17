import type { SurveyProject } from '@/entities/survey-project'
import { btn, selectCls, ctlLabel } from '@/shared/ui/classes'

interface SurveyProjectBarProps {
  projects: SurveyProject[]
  activeProjectId: string | null
  onChangeActive: (id: string | null) => void
  onCreate: (name: string) => void
  onDeleteActive: () => void
  surveyedCount: number
  totalCount: number
}

export function SurveyProjectBar(props: SurveyProjectBarProps) {
  function handleNew() {
    const name = window.prompt('조사 프로젝트 이름 (예: 2026.7.1.자 조사)', '')
    if (name && name.trim()) props.onCreate(name.trim())
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-gray-700 bg-gray-900 px-3.5 py-1.5 text-[13px] text-gray-200">
      <label className={ctlLabel}>
        조사 프로젝트
        <select
          className={selectCls}
          value={props.activeProjectId ?? ''}
          onChange={(e) => props.onChangeActive(e.target.value || null)}
        >
          <option value="">(선택 안 함)</option>
          {props.projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      <button type="button" className={btn()} onClick={handleNew}>＋ 새 조사</button>

      {props.activeProjectId && (
        <>
          <span className="text-gray-400">
            조사 {props.surveyedCount} / 전체 {props.totalCount}
          </span>
          <button type="button" className={btn('danger')} onClick={props.onDeleteActive}>
            이 조사 삭제
          </button>
        </>
      )}

      <span className="ml-auto inline-flex items-center gap-3 text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-full border border-green-600 bg-green-500" />조사완료
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-full bg-gray-400 opacity-50" />미조사
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-full border border-red-900 bg-red-600" />망실
        </span>
      </span>
    </div>
  )
}
