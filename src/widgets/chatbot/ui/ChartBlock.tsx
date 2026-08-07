import { useEffect, useMemo, useRef, useState } from 'react'
import Chart, { type ChartConfiguration } from 'chart.js/auto'
import { SURVEY_STATUS_COLOR_VAR, SURVEY_STATUS_LABEL } from '@/entities/survey-record'
import type { SurveyStatus } from '@/entities/survey-record'
import { POPOVER } from '@/shared/ui/classes'
import type { ChartSpec } from '../model/types'

// 라이트·다크 양쪽에서 무난한 팔레트
const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6']
const AXIS = '#9ca3af' // 축·범례 글자(양쪽 테마 중립)
const GRID = 'rgba(128,128,128,0.15)'
const SUPPORTED = ['bar', 'line', 'pie', 'doughnut']

/** 사용자가 직접 고를 수 있는 종류 — pie 는 도넛과 뜻이 겹쳐 내보내지 않는다(옛 답변은 그려 준다). */
const TYPE_OPTIONS: { type: ChartSpec['type']; label: string }[] = [
  { type: 'bar', label: '막대' },
  { type: 'doughnut', label: '도넛' },
  { type: 'line', label: '선' },
]

/**
 * 조사 상태·결과 라벨은 색을 고정한다 — 순서대로 팔레트를 배정하면 같은 답변 안에서도
 * 지도·목록과 다른 색이 나와(망실이 초록으로 그려지는 등) 뜻이 반대로 읽힌다.
 * 값은 화면이 쓰는 테마 토큰에서 읽어, 라이트·다크가 바뀌어도 같은 색 규칙을 따른다.
 *
 * 짝은 조사 상태 규칙에서 그대로 만든다. 여기에 라벨을 손으로 적어 두면 갈래가 늘거나 말이 바뀔 때
 * 이 표만 옛 상태로 남아 새 갈래가 임의의 색으로 그려진다.
 */
const LABEL_COLOR_VAR: Record<string, string> = Object.fromEntries(
  Object.entries(SURVEY_STATUS_LABEL).map(([status, label]) => [
    label,
    SURVEY_STATUS_COLOR_VAR[status as SurveyStatus],
  ]),
)

/** 라벨에 정해 둔 색 — 규칙에 없는 라벨은 기존 팔레트를 순서대로 쓴다. */
function colorOf(label: string, index: number): string {
  const token = LABEL_COLOR_VAR[label.trim()]
  if (token === undefined) return PALETTE[index % PALETTE.length]
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return value === '' ? PALETTE[index % PALETTE.length] : value
}

// LLM이 낸 ```chart JSON을 안전하게 파싱·검증. 형식이 어긋나면 null(폴백 노출)
function parseSpec(raw: string): ChartSpec | null {
  try {
    const p = JSON.parse(raw) as Record<string, unknown>
    if (typeof p.type !== 'string' || !SUPPORTED.includes(p.type)) return null
    if (!Array.isArray(p.labels) || !Array.isArray(p.datasets)) return null
    const datasets = (p.datasets as { label?: unknown; data?: unknown }[])
      .filter((d) => d && Array.isArray(d.data))
      .map((d) => ({
        label: typeof d.label === 'string' ? d.label : '',
        // 숫자로 변환 안 되는 값(NaN·Infinity)은 0으로 — 라벨과 길이를 맞춰 차트가 깨지지 않게
        data: (d.data as unknown[]).map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0)),
      }))
    if (datasets.length === 0) return null
    return {
      type: p.type as ChartSpec['type'],
      title: typeof p.title === 'string' ? p.title : undefined,
      labels: (p.labels as unknown[]).map(String),
      datasets,
    }
  } catch {
    return null
  }
}

/** 글자를 앉힐 수 있는 가장 좁은 조각(라디안) — 전체의 약 7%. 이보다 좁으면 범례에 맡긴다. */
const ARC_LABEL_MIN = 0.45

/** 그림 위쪽에 비워 두는 자리(px) — 값 글자가 잘리지 않게, 그리고 저장·메뉴 버튼이 제목을 덮지 않게. */
const TOP_ROOM = 16

/**
 * 수치를 막대·점·조각 위에 직접 그린다.
 *
 * <p>Chart.js 가 기본으로 주는 수치 표시는 손을 올려야 뜨는 툴팁이라, 그림으로 저장해 문서에 붙이거나
 * 남에게 보내는 순간 값이 사라진다. 저장한 그림만 따로 돌아다니는 자리라 숫자가 그림 안에 남아 있어야 한다.
 *
 * <p>조각 위 글자는 흰색에 어두운 테두리를 덧그린다 — 밑에 깔린 색이 갈래마다 달라
 * 한 가지 글자색으로는 어느 조각에서든 읽히게 만들 수 없다. 좁은 조각은 글자가 옆 조각까지 삐져나와
 * 서로 겹치므로 건너뛴다. 그 값은 범례가 라벨 옆에 달고 있다.
 */
const VALUE_LABELS = {
  id: 'valueLabels',
  afterDatasetsDraw(chart: Chart) {
    const ctx = chart.ctx
    ctx.save()
    ctx.font = `600 11px ${Chart.defaults.font.family}`
    ctx.textAlign = 'center'
    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i)
      if (meta.hidden === true) return
      const isArc = meta.type === 'doughnut' || meta.type === 'pie'
      meta.data.forEach((element, j) => {
        const value = Number((dataset.data as unknown[])[j])
        if (!Number.isFinite(value)) return
        if (!isArc) {
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = AXIS
          ctx.fillText(String(value), element.x, element.y - 4)
          return
        }
        // 값이 0이거나 범례에서 끈 조각은 폭이 0이고, 좁은 조각은 글자가 옆 조각 위에 얹힌다
        const arc = element as unknown as { circumference: number }
        if (!(arc.circumference >= ARC_LABEL_MIN)) return
        // 조각 한가운데(안쪽·바깥 반지름의 사이). 아직 자리를 못 잡은 조각은 좌표가 비어 온다
        const at = element.tooltipPosition(true)
        const x = Number(at.x)
        const y = Number(at.y)
        if (!Number.isFinite(x) || !Number.isFinite(y)) return
        ctx.textBaseline = 'middle'
        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(0,0,0,.45)'
        ctx.strokeText(String(value), x, y)
        ctx.fillStyle = '#fff'
        ctx.fillText(String(value), x, y)
      })
    })
    ctx.restore()
  },
}

/**
 * ```chart JSON을 Chart.js로 렌더한다. 형식이 깨지면 원문을 코드블록으로 폴백.
 * PNG 저장과 종류 바꾸기를 제공한다 — 어떤 그림이 맞는지는 결국 보는 사람이 정한다.
 */
export function ChartBlock({ json }: { json: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // json이 안 바뀌면 같은 spec 참조를 유지 — 부모 리렌더마다 useEffect가 재발동돼 차트가 destroy→재생성되며 깜빡이는 것을 막는다
  const spec = useMemo(() => parseSpec(json), [json])
  // 사용자가 고른 종류. 이 차트 하나에만 남는다 — 다음 질문의 답은 다시 모델이 고른 종류로 그려진다
  const [picked, setPicked] = useState<ChartSpec['type'] | null>(null)
  /**
   * 원형은 계열 하나를 라벨로 나눠 그리는 그림이라 계열이 여럿이면 첫 계열만 남고
   * 나머지가 화면에서도 저장한 그림에서도 사라진다. 그런 자료에서는 고를 수 없게 하고,
   * 모델이 원형을 내더라도 막대로 돌린다 — 값이 없어지는 것보다 그림이 달라지는 편이 낫다.
   */
  const multi = (spec?.datasets.length ?? 0) > 1
  const options = multi ? TYPE_OPTIONS.filter((option) => option.type !== 'doughnut') : TYPE_OPTIONS
  const asked = picked ?? spec?.type ?? 'bar'
  const type = multi && (asked === 'doughnut' || asked === 'pie') ? 'bar' : asked
  const [menuOpen, setMenuOpen] = useState(false)
  const [broken, setBroken] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  // 저장할 때 캔버스 픽셀과 화면 px 의 배율을 알아야 한다(레티나에서 둘이 다르다)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node) !== true) setMenuOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !spec) return
    const isPie = type === 'pie' || type === 'doughnut'
    // 한 계열을 라벨로 나눠 보여주는 차트(원형·단일 막대)는 막대마다 그 라벨의 색을 쓴다.
    // 계열이 여럿이면 색이 라벨이 아니라 계열을 가리키므로 계열 단위로 배정한다.
    const perLabel = isPie || (type !== 'line' && spec.datasets.length === 1)
    const datasets = perLabel
      ? [{
          label: spec.datasets[0]?.label ?? '',
          data: spec.datasets[0]?.data ?? [],
          backgroundColor: spec.labels.map((label, j) => colorOf(label, j)),
          borderWidth: 0,
        }]
      : spec.datasets.map((d, i) => ({
          label: d.label,
          data: d.data,
          backgroundColor: colorOf(d.label, i),
          borderColor: colorOf(d.label, i),
          borderWidth: type === 'line' ? 2 : 0,
        }))

    // 원형은 축이 없어 어느 조각이 얼마인지 범례로만 알 수 있다 — 좁은 조각은 글자를 못 얹으므로
    // 범례에 수를 함께 적어 그림 하나만으로 다섯 갈래가 모두 읽히게 한다
    const series = spec.datasets[0]?.data ?? []
    const labels = isPie ? spec.labels.map((label, j) => `${label} ${series[j] ?? 0}`) : spec.labels

    // 캔버스에 그리는 글자라 CSS 를 못 받는다 — 제목·범례에 한글이 오므로 화면 글꼴을 직접 넘긴다
    Chart.defaults.font.family =
      getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'system-ui, sans-serif'

    // Chart.js 타입은 차트 type별로 dataset 형태가 엄격해, 런타임에 type이 갈리는 config는 캐스팅해 넘긴다
    const config = {
      type,
      data: { labels, datasets },
      plugins: [VALUE_LABELS],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        color: AXIS,
        layout: { padding: { top: TOP_ROOM } },
        plugins: {
          legend: { display: isPie || spec.datasets.length > 1, labels: { boxWidth: 12, font: { size: 12 }, color: AXIS } },
          title: { display: !!spec.title, text: spec.title, font: { size: 13 }, color: AXIS },
        },
        scales: isPie
          ? {}
          : {
              x: { ticks: { font: { size: 11 }, color: AXIS }, grid: { color: GRID } },
              y: { beginAtZero: true, ticks: { font: { size: 11 }, color: AXIS }, grid: { color: GRID } },
            },
      },
    } as unknown as ChartConfiguration

    // 그리다 터지면 이 자리만 원문으로 물러난다. 감싸지 않으면 그리기 중의 예외가 리액트를 타고 올라가
    // 화면 전체의 오류 경계가 받는다 — 차트 하나 때문에 대화 판과 지도가 함께 사라진다
    let chart: Chart
    try {
      chart = new Chart(canvas, config)
    } catch {
      setBroken(true)
      return
    }
    setBroken(false)
    chartRef.current = chart
    return () => {
      chartRef.current = null
      chart.destroy()
    }
  }, [spec, type])

  // 형식이 어긋났거나 그리다 터졌으면 원문을 보인다 — 무엇이 왔는지는 남겨 둔다
  if (!spec || broken) {
    return <pre className="my-1 overflow-x-auto rounded bg-soft p-2 text-xs text-ink-3">{json.trim()}</pre>
  }

  // 차트 캔버스를 흰 배경 PNG로 저장(상하 여백 추가)
  const download = () => {
    const src = canvasRef.current
    if (!src) return
    // 위쪽은 그림 안에 이미 버튼 자리만큼 비어 있다. 그만큼 덜 덧대야 위아래 여백이 같아 보인다.
    // 캔버스는 화면보다 촘촘하게 그려지므로 그 배율로 환산한다
    const density = chartRef.current === null ? 1 : src.height / chartRef.current.height
    const padBottom = Math.round(src.height * 0.12)
    const padTop = Math.max(0, padBottom - Math.round(TOP_ROOM * density))
    const out = document.createElement('canvas')
    out.width = src.width
    out.height = src.height + padTop + padBottom
    const ctx = out.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(src, 0, padTop)
    const a = document.createElement('a')
    a.download = `${spec.title ?? 'chart'}.png`
    a.href = out.toDataURL('image/png')
    a.click()
  }

  // 스크린리더용 데이터 대체 텍스트 — canvas는 비텍스트라 제목·라벨·값을 읽을 수 있게 요약한다(WCAG 1.1.1)
  const summary =
    (spec.title ? `${spec.title}. ` : '') +
    spec.datasets
      .map((d) => `${d.label ? `${d.label}: ` : ''}${spec.labels.map((l, i) => `${l} ${d.data[i]}`).join(', ')}`)
      .join(' / ')

  // 늘 보인다 — 그림 위쪽은 어차피 버튼 자리로 비워 두므로, 숨겨 봐야 빈자리만 남고
  // 손을 올려 봐야 뭐가 있는지 알 수 있는 기능이 된다
  const toolBtn = 'absolute top-1.5 rounded-chip bg-pill p-1 text-ink-4 transition-colors hover:text-ink-2'

  return (
    <div className="relative my-1 rounded-ctl border border-line-soft bg-soft p-2" style={{ height: 200 }}>
      <canvas ref={canvasRef} role="img" aria-label={summary} />
      <button
        type="button"
        onClick={download}
        aria-label="차트 이미지 저장"
        title="차트 이미지 저장"
        className={`${toolBtn} right-9`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      <div ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="차트 종류 바꾸기"
          title="차트 종류 바꾸기"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={`${toolBtn} right-1.5 ${menuOpen ? 'text-ink-2' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        </button>
        {menuOpen && (
          <div role="menu" className={`${POPOVER} absolute right-1.5 top-9 z-10 min-w-[104px] overflow-hidden py-1`}>
            {options.map((option) => (
              <button
                key={option.type}
                type="button"
                role="menuitemradio"
                aria-checked={type === option.type}
                onClick={() => {
                  setPicked(option.type)
                  setMenuOpen(false)
                }}
                className={`flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[12px] transition-colors hover:bg-hover ${
                  type === option.type ? 'font-semibold text-teal-text' : 'text-ink-2'
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`size-3 ${type === option.type ? '' : 'invisible'}`} aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
