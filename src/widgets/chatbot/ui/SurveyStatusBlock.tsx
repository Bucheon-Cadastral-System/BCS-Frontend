import type { ReactNode } from 'react'
import { PROGRESS_FILL } from '@/shared/ui/classes'
import { percent } from '@/shared/lib/percent'
import { SURVEY_STATUS_DOT, SURVEY_STATUS_LABEL } from '@/entities/survey-record'
import type { SurveyStatus } from '@/entities/survey-record'
import { DONE_STATUSES, drawSurveyStatusCard } from '../lib/drawSurveyStatusCard'
import type { SurveyStatusSpec } from '../lib/drawSurveyStatusCard'

const FIELD_OF: Record<Exclude<SurveyStatus, 'todo'>, string> = {
  done: 'intact',
  lost: 'lost',
  unavailable: 'unavailable',
  etc: 'etc',
}

/** 0 이상의 정수만 통과시킨다 — 음수·소수·문자열은 수치가 아니라 사고다. */
function count(value: unknown): number | null {
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : null
}

/**
 * ```survey JSON을 파싱·검증한다. 형식이 어긋나면 null(원문 폴백).
 *
 * <p>백분율과 미조사 수는 받지 않고 여기서 계산한다. 모델이 보낸 값을 그대로 믿으면
 * 카드 안에서 전체·조사 완료·미조사가 서로 맞지 않는 화면이 나온다 — 계층을 눈으로 더해 보는 카드라
 * 그 어긋남이 곧바로 드러난다.
 */
function parseSpec(raw: string): SurveyStatusSpec | null {
  try {
    const p = JSON.parse(raw) as Record<string, unknown>
    const total = count(p.total)
    // done 은 진행률 막대만 그리던 시절의 이름 — 그때 오간 대화가 화면에 남아 있어 함께 받는다
    const surveyed = count(p.surveyed ?? p.done)
    if (total === null || surveyed === null || surveyed > total) return null

    const parts = DONE_STATUSES.map((status) => count(p[FIELD_OF[status]]))
    const sum = parts.reduce<number>((acc, n) => acc + (n ?? 0), 0)
    const complete = parts.every((n) => n !== null) && sum === surveyed
    return {
      title: typeof p.title === 'string' && p.title.trim() !== '' ? p.title : undefined,
      total,
      surveyed,
      breakdown: complete
        ? (Object.fromEntries(
            DONE_STATUSES.map((status, i) => [status, parts[i]]),
          ) as SurveyStatusSpec['breakdown'])
        : null,
    }
  } catch {
    return null
  }
}

/**
 * 조사 현황 카드 — 진행률 막대를 머리에 두고 그 아래 전체 · 조사 완료 · 갈래 · 미조사를 계층으로 세운다.
 *
 * <p>같은 수치를 글 목록으로도 적으면 화면에 두 번 나오므로 모델은 본문에 수치를 되풀이하지 않는다.
 * 막대 규격은 좌측 패널의 프로젝트 상세와 같다 — 같은 사실을 두 화면이 다르게 그리면
 * 사용자가 둘을 견주며 어느 쪽이 맞는지 의심하게 된다.
 */
export function SurveyStatusBlock({ json }: { json: string }) {
  const spec = parseSpec(json)
  if (spec === null) {
    return <pre className="my-1 overflow-x-auto rounded bg-soft p-2 text-xs text-ink-3">{json.trim()}</pre>
  }

  const pct = percent(spec.surveyed, spec.total)
  const notSurveyed = spec.total - spec.surveyed
  const breakdown = spec.breakdown

  const download = () => {
    const canvas = drawSurveyStatusCard(spec)
    if (canvas === null) return
    const a = document.createElement('a')
    a.download = `${spec.title ?? '조사 현황'}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  return (
    <div className="relative my-1 rounded-ctl border border-line-soft bg-soft px-3 py-2.5">
      <button
        type="button"
        onClick={download}
        aria-label="조사 현황 이미지 저장"
        title="조사 현황 이미지 저장"
        className="absolute right-1.5 top-1.5 rounded-chip bg-pill p-1 text-ink-4 transition-colors hover:text-ink-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      {spec.title !== undefined && (
        <div className="mb-2 pr-7 text-[12px] text-ink-2 [overflow-wrap:anywhere]">{spec.title}</div>
      )}

      {/* 제목이 없으면 백분율이 맨 윗줄에 서므로, 그 줄이 저장 버튼 자리를 비켜 준다 */}
      <div
        className={`mb-[7px] flex items-baseline text-[11.5px] text-ink-3 ${spec.title === undefined ? 'pr-7' : ''}`}
      >
        <span className="flex-1">
          조사 <b className="font-semibold text-teal-text">{spec.surveyed}</b> / 전체 <span>{spec.total}</span>
        </span>
        <span className="font-semibold text-teal-text">{pct}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={spec.title === undefined ? '조사 진행률' : `${spec.title} 조사 진행률`}
      >
        <div className={`h-full rounded-full ${PROGRESS_FILL}`} style={{ width: `${pct}%` }} />
      </div>

      {breakdown !== null && (
        <dl className="mt-2.5 border-t border-line-soft pt-2 text-[11.5px] text-ink-3">
          <Row label="전체 대상" value={spec.total} lead />
          <Row label="조사 완료" value={spec.surveyed} bar indent apart="sm" />
          {/* 세로선이 끊기지 않게 줄 사이를 띄우지 않는다 — 여백은 줄 안쪽 padding 이 만든다 */}
          {DONE_STATUSES.map((status) => (
            <Row
              key={status}
              label={SURVEY_STATUS_LABEL[status]}
              value={breakdown[status]}
              dot={SURVEY_STATUS_DOT[status]}
              rail
            />
          ))}
          <Row label={SURVEY_STATUS_LABEL.todo} value={notSurveyed} dot={SURVEY_STATUS_DOT.todo} indent apart="lg" />
        </dl>
      )}
    </div>
  )
}

/**
 * 계층 한 줄. 켜는 왼쪽 들여쓰기가 말하고, 조사 완료 아래 네 갈래만 세로선을 덧대 묶음을 보인다.
 *
 * <p>줄머리 표시는 어느 켜든 자리를 차지한다. 한 줄만 비워 두면 그 줄의 글자가 홀로 오른쪽으로 밀려
 * 같은 켜인데 한 단 더 들어간 것처럼 읽힌다.
 *
 * <p>조사 완료는 갈래가 아니라 네 갈래를 더한 값이라 갈래 색을 가져다 쓸 수 없다.
 * 위 진행률 막대의 채운 쪽을 그대로 줄여 놓아, 저 막대에서 찬 부분이 이 수라는 것이 보이게 한다.
 */
function Row(props: {
  label: string
  value: number
  dot?: string
  bar?: boolean
  lead?: boolean
  rail?: boolean
  indent?: boolean
  /** 윗줄과 띄우는 정도 — 전체 대상 아래는 조금, 조사 완료 묶음을 벗어나는 미조사 앞은 넉넉히 */
  apart?: 'sm' | 'lg'
}) {
  const mark: ReactNode =
    props.bar === true ? (
      <i className={`h-[3px] w-[7px] shrink-0 rounded-full ${PROGRESS_FILL}`} aria-hidden />
    ) : props.dot === undefined ? (
      <span className="size-[7px] shrink-0" aria-hidden />
    ) : (
      <i className={`size-[7px] shrink-0 rounded-full ${props.dot}`} aria-hidden />
    )
  const tier = props.rail === true ? 'ml-[9px] border-l border-line pl-3' : props.indent === true ? 'pl-2.5' : ''
  return (
    <div
      className={`flex items-center gap-1.5 py-[2.5px] ${tier} ${
        props.apart === 'lg' ? 'mt-3' : props.apart === 'sm' ? 'mt-1.5' : ''
      }`}
    >
      {props.lead !== true && mark}
      <dt className={`min-w-0 flex-1 truncate ${props.lead === true ? 'font-medium text-ink-2' : ''}`}>{props.label}</dt>
      <dd className={`tabular-nums ${props.lead === true ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}>
        {props.value}
      </dd>
    </div>
  )
}
