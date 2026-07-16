import type { SurveyProject } from '@/entities/survey-project'

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
    <div className="projectbar">
      <label className="ctl">
        조사 프로젝트
        <select
          value={props.activeProjectId ?? ''}
          onChange={(e) => props.onChangeActive(e.target.value || null)}
        >
          <option value="">(선택 안 함)</option>
          {props.projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      <button type="button" className="btn" onClick={handleNew}>＋ 새 조사</button>

      {props.activeProjectId && (
        <>
          <span className="projectbar__progress">
            조사 {props.surveyedCount} / 전체 {props.totalCount}
          </span>
          <button type="button" className="btn btn--danger" onClick={props.onDeleteActive}>
            이 조사 삭제
          </button>
        </>
      )}

      <span className="legend">
        <span><i className="dot dot--done" />조사완료</span>
        <span><i className="dot dot--todo" />미조사</span>
        <span><i className="dot dot--lost" />망실</span>
      </span>
    </div>
  )
}
