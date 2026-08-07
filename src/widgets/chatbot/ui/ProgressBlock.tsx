import { PROGRESS_FILL } from '@/shared/ui/classes'
import { percent } from '@/shared/lib/percent'

interface ProgressSpec {
  title?: string
  done: number
  total: number
}

/**
 * ```progress JSON을 파싱·검증한다. 형식이 어긋나면 null(원문 폴백).
 * 백분율은 받지 않고 여기서 계산한다 — 모델이 보낸 수치를 믿으면 화면과 다른 값이 나온다.
 */
function parseSpec(raw: string): ProgressSpec | null {
  try {
    const p = JSON.parse(raw) as Record<string, unknown>
    const done = Number(p.done)
    const total = Number(p.total)
    if (!Number.isFinite(done) || !Number.isFinite(total) || total < 0 || done < 0) return null
    return { title: typeof p.title === 'string' ? p.title : undefined, done, total }
  } catch {
    return null
  }
}

/**
 * 조사 진행률 막대 — 좌측 패널의 프로젝트 상세와 같은 규격이다.
 *
 * <p>같은 사실을 두 화면이 다르게 그리면 사용자가 둘을 견주며 어느 쪽이 맞는지 의심하게 된다.
 * 백분율 반올림도 화면과 같은 규칙(shared/lib/percent)을 쓴다.
 */
export function ProgressBlock({ json }: { json: string }) {
  const spec = parseSpec(json)
  if (spec === null) {
    return <pre className="my-1 overflow-x-auto rounded bg-soft p-2 text-xs text-ink-3">{json.trim()}</pre>
  }

  const pct = percent(spec.done, spec.total)
  return (
    <div className="my-1 rounded-ctl border border-line-soft bg-soft px-3 py-2.5">
      {spec.title !== undefined && spec.title !== '' && (
        <div className="mb-1.5 truncate text-[12px] text-ink-2">{spec.title}</div>
      )}
      <div className="mb-[7px] flex items-baseline text-[11.5px] text-ink-3">
        <span className="flex-1">
          조사 <b className="font-semibold text-teal-text">{spec.done}</b> / 전체 <span>{spec.total}</span>
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
    </div>
  )
}
