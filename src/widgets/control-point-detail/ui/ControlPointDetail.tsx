import { TM_ORIGINS } from '@/shared/lib/crs'
import type { ControlPoint, PointType } from '@/entities/control-point'
import { btn } from '@/shared/ui/classes'

interface ControlPointDetailProps {
  point: ControlPoint | null
  activeProjectName: string | null
  surveyed: boolean
  lost: boolean
  onToggleSurvey: (id: string) => void
  onClose: () => void
  onToggleLost: (id: string) => void
}

const TYPE_BADGE: Record<PointType, string> = {
  지적삼각점: 'bg-gray-900',
  지적삼각보조점: 'bg-gray-500',
  지적도근점: 'bg-gray-700',
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
        <button type="button" className="cursor-pointer border-0 bg-transparent text-xl leading-none text-gray-500 dark:text-gray-400" onClick={props.onClose} aria-label="닫기">×</button>
      </div>

      <dl className="mb-3 grid grid-cols-[64px_1fr] gap-x-2.5 gap-y-1 text-[13px] [&_dd]:tabular-nums [&_dd]:text-gray-900 [&_dt]:text-gray-500 dark:[&_dd]:text-gray-100 dark:[&_dt]:text-gray-400">
        <dt>위도</dt><dd>{p.lat.toFixed(7)}</dd>
        <dt>경도</dt><dd>{p.lng.toFixed(7)}</dd>
        <dt>TM 원점</dt><dd>{epsgLabel(p.tmEpsg)} ({p.tmEpsg})</dd>
        <dt>TM X</dt><dd>{p.tmX.toFixed(3)} m</dd>
        <dt>TM Y</dt><dd>{p.tmY.toFixed(3)} m</dd>
      </dl>

      {props.activeProjectName ? (
        <div className="mb-3 flex flex-col gap-2 border-t border-gray-200 pt-2.5 dark:border-gray-700">
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
              {props.lost ? '망실' : props.surveyed ? '조사완료' : '미조사'}
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
      ) : (
        <p className="mb-3 border-t border-gray-200 pt-2.5 text-[12px] text-gray-400 dark:border-gray-700 dark:text-gray-500">
          조사 프로젝트를 선택하면 이 점의 조사·망실 상태를 기록할 수 있습니다.
        </p>
      )}

    </aside>
  )
}
