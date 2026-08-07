import { useEffect, useMemo, useRef } from 'react'
import Chart, { type ChartConfiguration } from 'chart.js/auto'
import { SURVEY_STATUS_COLOR_VAR, SURVEY_STATUS_LABEL } from '@/entities/survey-record'
import type { SurveyStatus } from '@/entities/survey-record'
import type { ChartSpec } from '../model/types'

// 라이트·다크 양쪽에서 무난한 팔레트
const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6']
const AXIS = '#9ca3af' // 축·범례 글자(양쪽 테마 중립)
const GRID = 'rgba(128,128,128,0.15)'
const SUPPORTED = ['bar', 'line', 'pie', 'doughnut']

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

/** ```chart JSON을 Chart.js로 렌더한다. 형식이 깨지면 원문을 코드블록으로 폴백. PNG 저장 버튼 제공. */
export function ChartBlock({ json }: { json: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // json이 안 바뀌면 같은 spec 참조를 유지 — 부모 리렌더마다 useEffect가 재발동돼 차트가 destroy→재생성되며 깜빡이는 것을 막는다
  const spec = useMemo(() => parseSpec(json), [json])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !spec) return
    const isPie = spec.type === 'pie' || spec.type === 'doughnut'
    // 한 계열을 라벨로 나눠 보여주는 차트(원형·단일 막대)는 막대마다 그 라벨의 색을 쓴다.
    // 계열이 여럿이면 색이 라벨이 아니라 계열을 가리키므로 계열 단위로 배정한다.
    const perLabel = isPie || (spec.type === 'bar' && spec.datasets.length === 1)
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
          borderWidth: spec.type === 'line' ? 2 : 0,
        }))

    // 캔버스에 그리는 글자라 CSS 를 못 받는다 — 제목·범례에 한글이 오므로 화면 글꼴을 직접 넘긴다
    Chart.defaults.font.family =
      getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'system-ui, sans-serif'

    // Chart.js 타입은 차트 type별로 dataset 형태가 엄격해, 런타임에 type이 갈리는 config는 캐스팅해 넘긴다
    const config = {
      type: spec.type,
      data: { labels: spec.labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        color: AXIS,
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

    const chart = new Chart(canvas, config)
    return () => chart.destroy()
  }, [spec])

  if (!spec) {
    return <pre className="my-1 overflow-x-auto rounded bg-soft p-2 text-xs text-ink-3">{json.trim()}</pre>
  }

  // 차트 캔버스를 흰 배경 PNG로 저장(상하 여백 추가)
  const download = () => {
    const src = canvasRef.current
    if (!src) return
    const padY = Math.round(src.height * 0.12)
    const out = document.createElement('canvas')
    out.width = src.width
    out.height = src.height + padY * 2
    const ctx = out.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(src, 0, padY)
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

  return (
    <div className="group relative my-1 rounded-ctl border border-line-soft bg-soft p-2" style={{ height: 200 }}>
      <canvas ref={canvasRef} role="img" aria-label={summary} />
      <button
        type="button"
        onClick={download}
        aria-label="차트 이미지 저장"
        title="차트 이미지 저장"
        className="absolute right-1.5 top-1.5 rounded-chip bg-pill p-1 text-ink-4 transition-opacity hover:text-ink-2 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  )
}
