import { TM_ORIGINS } from '@/shared/lib/crs'
import type { ControlPoint } from '@/entities/control-point'
import { PointTypeIcon } from '@/entities/control-point'
import { SURVEY_STATUS_LABEL } from '@/entities/survey-record'

interface ControlPointDetailProps {
  point: ControlPoint | null
  activeProjectName: string | null
  surveyed: boolean
  lost: boolean
  onToggleSurvey: (id: string) => void
  onClose: () => void
  onToggleLost: (id: string) => void
  /** 관리번호를 복사한 결과 — 알림은 화면 전체를 아는 쪽이 띄운다 */
  onCopied: (ok: boolean) => void
}

function epsgLabel(epsg: string): string {
  return TM_ORIGINS.find((o) => o.epsg === epsg)?.label ?? epsg
}

/** 값을 클립보드로 복사한다. 복사 결과는 부모가 알린다. */
function CopyButton(props: { value: string; label: string; onCopied: (ok: boolean) => void }) {
  const { value, label, onCopied } = props

  async function copy() {
    try {
      // 클립보드는 보안 컨텍스트(HTTPS·localhost)에서만 열린다
      await navigator.clipboard.writeText(value)
      onCopied(true)
    } catch {
      onCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={label}
      aria-label={label}
      className="flex size-6 shrink-0 items-center justify-center rounded-chip bg-field text-ink-3 transition-colors hover:text-teal-text"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[13px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="13" height="13" rx="2" />
        <path d="M16 8h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-3" />
      </svg>
    </button>
  )
}

/** 고른 기준점의 성과와 조사 상태. 지도 위 우측에 떠 있는 카드다. */
export function ControlPointDetail(props: ControlPointDetailProps) {
  const p = props.point
  if (!p) return null

  const status = props.lost ? 'lost' : props.surveyed ? 'done' : 'todo'
  const chipTone =
    status === 'lost'
      ? 'bg-danger-wash text-danger'
      : status === 'done'
        ? 'bg-teal-wash-strong text-teal-text'
        : 'bg-soft text-ink-3'

  return (
    <aside className="panel-in w-[300px] max-w-[calc(100%-24px)] overflow-hidden rounded-pill border border-line bg-panel shadow-panel backdrop-blur-[12px]">
      <div className="flex items-center gap-[9px] border-b border-line-soft py-3 pl-3.5 pr-2.5">
        <span className="flex shrink-0 text-teal-text">
          <PointTypeIcon type={p.type} className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[14.5px] font-semibold text-ink">{p.name}</span>
          <span className="block text-[10.5px] text-ink-4">{p.type}</span>
        </span>
        <button
          type="button"
          onClick={props.onClose}
          title="닫기"
          aria-label="닫기"
          className="flex size-[26px] items-center justify-center rounded-chip text-ink-3 transition-colors hover:bg-danger-wash hover:text-danger"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-3.5 pb-[13px] pt-3">
        {/* 이름은 표시용이고 점을 가리키는 값은 관리번호라 좌표보다 먼저 둔다 */}
        <div className="mb-3 flex items-center gap-[9px] rounded-chip border border-line-pill bg-field py-[7px] pl-2.5 pr-2">
          <span className="shrink-0 text-[10.5px] text-ink-4">관리번호</span>
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink">{p.pointNo}</span>
          <CopyButton value={p.pointNo} label="관리번호 복사" onCopied={props.onCopied} />
        </div>

        <dl className="grid grid-cols-[64px_1fr] gap-x-2.5 gap-y-[7px] text-[12.5px] [&_dd]:font-mono [&_dd]:text-ink-2 [&_dt]:text-ink-3">
          <dt>위도</dt>
          <dd>{p.lat.toFixed(7)}</dd>
          <dt>경도</dt>
          <dd>{p.lng.toFixed(7)}</dd>
          <dt>TM 원점</dt>
          <dd className="font-sans text-[12px]">
            {epsgLabel(p.tmEpsg)} <span className="font-mono text-ink-3">({p.tmEpsg})</span>
          </dd>
          {/* 성과 표기는 측량 관례를 따른다 — X 가 북(northing), Y 가 동(easting)이다 */}
          <dt>TM X</dt>
          <dd>{p.northing.toFixed(3)} m</dd>
          <dt>TM Y</dt>
          <dd>{p.easting.toFixed(3)} m</dd>
        </dl>
      </div>

      {props.activeProjectName !== null && (
        <div className="border-t border-line-soft bg-soft px-3.5 pb-[13px] pt-[11px]">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">{props.activeProjectName}</span>
            <span className={`shrink-0 rounded-chip px-[9px] py-[3px] text-[10.5px] font-semibold ${chipTone}`}>
              {SURVEY_STATUS_LABEL[status]}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => props.onToggleSurvey(p.id)}
              className="h-9 flex-1 rounded-chip border border-line-btn bg-btn text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-hover"
            >
              {props.surveyed ? '조사 취소' : '조사 완료'}
            </button>
            <button
              type="button"
              onClick={() => props.onToggleLost(p.id)}
              className="h-9 flex-1 rounded-chip border border-danger-btn-edge bg-danger-wash text-[12.5px] font-medium text-danger transition-colors hover:bg-danger-wash-strong"
            >
              {props.lost ? '망실 해제' : '망실'}
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
