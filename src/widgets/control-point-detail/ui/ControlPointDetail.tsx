import { TM_ORIGINS } from '@/shared/lib/crs'
import type { ControlPoint } from '@/entities/control-point'

interface ControlPointDetailProps {
  point: ControlPoint | null
  activeProjectName: string | null
  surveyed: boolean
  onToggleSurvey: (id: string) => void
  onClose: () => void
  onToggleLost: (id: string) => void
  onDelete: (id: string) => void
}

function epsgLabel(epsg: string): string {
  return TM_ORIGINS.find((o) => o.epsg === epsg)?.label ?? epsg
}

export function ControlPointDetail(props: ControlPointDetailProps) {
  const p = props.point
  if (!p) return null

  return (
    <aside className="detail">
      <div className="detail__head">
        <span className="detail__type" data-type={p.type}>{p.type}</span>
        <strong className="detail__name">{p.name}</strong>
        <button type="button" className="detail__close" onClick={props.onClose} aria-label="닫기">×</button>
      </div>

      <dl className="detail__grid">
        <dt>위도</dt><dd>{p.lat.toFixed(7)}</dd>
        <dt>경도</dt><dd>{p.lng.toFixed(7)}</dd>
        <dt>TM 원점</dt><dd>{epsgLabel(p.tmEpsg)} ({p.tmEpsg})</dd>
        <dt>TM X</dt><dd>{p.tmX.toFixed(3)} m</dd>
        <dt>TM Y</dt><dd>{p.tmY.toFixed(3)} m</dd>
        <dt>등록</dt><dd>{new Date(p.createdAt).toLocaleString('ko-KR')}</dd>
        <dt>상태</dt><dd>{p.lost ? '망실' : '정상'}</dd>
      </dl>

      {props.activeProjectName && (
        <div className="detail__survey">
          <div className="detail__survey-row">
            <span className="detail__survey-proj">{props.activeProjectName}</span>
            <span className={`badge ${props.surveyed ? 'badge--done' : 'badge--todo'}`}>
              {props.surveyed ? '조사완료' : '미조사'}
            </span>
          </div>
          <button
            type="button"
            className={`btn ${props.surveyed ? '' : 'btn--on'}`}
            onClick={() => props.onToggleSurvey(p.id)}
          >
            {props.surveyed ? '조사 취소' : '조사 완료 표시'}
          </button>
        </div>
      )}

      <div className="detail__actions">
        <button type="button" className={`btn ${p.lost ? 'btn--on' : ''}`} onClick={() => props.onToggleLost(p.id)}>
          {p.lost ? '망실 해제' : '망실 표시'}
        </button>
        <button type="button" className="btn btn--danger" onClick={() => props.onDelete(p.id)}>삭제</button>
      </div>
    </aside>
  )
}
