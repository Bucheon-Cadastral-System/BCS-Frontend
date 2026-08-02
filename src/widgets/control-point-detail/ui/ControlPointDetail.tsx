import { TM_ORIGINS } from '@/shared/lib/crs'
import type { ControlPoint, PointType } from '@/entities/control-point'
import { SURVEY_STATUS_LABEL } from '@/entities/survey-record'
import { btn } from '@/shared/ui/classes'

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

const TYPE_BADGE: Record<PointType, string> = {
  지적삼각점: 'bg-gray-900',
  지적삼각보조점: 'bg-gray-500',
  지적도근점: 'bg-gray-700',
}

/** 값과 아이콘을 함께 눌러 클립보드로 복사한다. 복사 결과는 부모가 알린다. */
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
      className="group inline-flex items-center gap-1.5 text-left"
    >
      <span className="underline decoration-gray-300 underline-offset-2 group-hover:decoration-gray-500 dark:decoration-gray-600 dark:group-hover:decoration-gray-400">
        {value}
      </span>
      <svg
        viewBox="0 0 24 24"
        className="size-4 shrink-0 text-gray-400 transition-colors group-hover:text-gray-700 dark:group-hover:text-gray-100"
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

function epsgLabel(epsg: string): string {
  return TM_ORIGINS.find((o) => o.epsg === epsg)?.label ?? epsg
}

export function ControlPointDetail(props: ControlPointDetailProps) {
  const p = props.point
  if (!p) return null

  return (
    <aside className="absolute right-3 top-3 z-[5] w-[300px] max-w-[calc(100%-24px)] rounded-lg border border-gray-200 bg-white p-3.5 shadow-xl dark:border-gray-700 dark:bg-gray-800 max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:w-auto max-sm:max-w-none max-sm:rounded-b-none max-sm:rounded-t-2xl">
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${TYPE_BADGE[p.type]}`}>{p.type}</span>
        <strong className="flex-1 text-[15px] text-gray-900 dark:text-gray-100">{p.name}</strong>
        <button type="button" className="border-0 bg-transparent text-xl leading-none text-gray-500 dark:text-gray-400" onClick={props.onClose} aria-label="닫기">×</button>
      </div>

      <dl className="mb-3 grid last:mb-0 grid-cols-[64px_1fr] gap-x-2.5 gap-y-1 text-[13px] [&_dd]:tabular-nums [&_dd]:text-gray-900 [&_dt]:text-gray-500 dark:[&_dd]:text-gray-100 dark:[&_dt]:text-gray-400">
        {/* 이름은 표시용이고 점을 가리키는 값은 관리번호라 좌표보다 먼저 둔다 */}
        <dt>관리번호</dt>
        <dd>
          <CopyButton value={p.pointNo} label="관리번호 복사" onCopied={props.onCopied} />
        </dd>
        <dt>위도</dt><dd>{p.lat.toFixed(7)}</dd>
        <dt>경도</dt><dd>{p.lng.toFixed(7)}</dd>
        <dt>TM 원점</dt><dd>{epsgLabel(p.tmEpsg)} ({p.tmEpsg})</dd>
        {/* 성과 표기는 측량 관례를 따른다 — X 가 북(northing), Y 가 동(easting)이다 */}
        <dt>TM X</dt><dd>{p.northing.toFixed(3)} m</dd>
        <dt>TM Y</dt><dd>{p.easting.toFixed(3)} m</dd>
      </dl>

      {props.activeProjectName ? (
        <div className="mb-3 flex flex-col gap-2 border-t last:mb-0 border-gray-200 pt-2.5 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[13px] text-gray-700 dark:text-gray-300">{props.activeProjectName}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                props.lost
                  ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                  : props.surveyed
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {SURVEY_STATUS_LABEL[props.lost ? 'lost' : props.surveyed ? 'done' : 'todo']}
            </span>
          </div>
          <div className="flex gap-2">
            <button type="button" className={`flex-1 text-center ${btn(props.surveyed ? undefined : 'on')}`} onClick={() => props.onToggleSurvey(p.id)}>
              {props.surveyed ? '조사 취소' : '조사 완료'}
            </button>
            <button type="button" className={`flex-1 text-center ${btn(props.lost ? 'on' : 'danger')}`} onClick={() => props.onToggleLost(p.id)}>
              {props.lost ? '망실 해제' : '망실'}
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  )
}
