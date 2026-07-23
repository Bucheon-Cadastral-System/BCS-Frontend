import { useEffect, useMemo, useRef } from 'react'
import Chart, { type ChartConfiguration } from 'chart.js/auto'
import type { ChartSpec } from '../model/types'

// 라이트·다크 양쪽에서 무난한 팔레트
const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6']
const AXIS = '#9ca3af' // 축·범례 글자(양쪽 테마 중립)
const GRID = 'rgba(128,128,128,0.15)'
const SUPPORTED = ['bar', 'line', 'pie', 'doughnut']

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
    const datasets = isPie
      ? [{ data: spec.datasets[0]?.data ?? [], backgroundColor: spec.labels.map((_, j) => PALETTE[j % PALETTE.length]), borderWidth: 0 }]
      : spec.datasets.map((d, i) => ({
          label: d.label,
          data: d.data,
          backgroundColor: PALETTE[i % PALETTE.length],
          borderColor: PALETTE[i % PALETTE.length],
          borderWidth: spec.type === 'line' ? 2 : 0,
        }))

    // Chart.js 타입은 차트 type별로 dataset 형태가 엄격해, 런타임에 type이 갈리는 config는 캐스팅해 넘긴다
    const config = {
      type: spec.type,
      data: { labels: spec.labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        color: AXIS,
        plugins: {
          legend: { display: isPie || spec.datasets.length > 1, labels: { boxWidth: 12, font: { size: 11 }, color: AXIS } },
          title: { display: !!spec.title, text: spec.title, font: { size: 12 }, color: AXIS },
        },
        scales: isPie
          ? {}
          : {
              x: { ticks: { font: { size: 10 }, color: AXIS }, grid: { color: GRID } },
              y: { beginAtZero: true, ticks: { font: { size: 10 }, color: AXIS }, grid: { color: GRID } },
            },
      },
    } as unknown as ChartConfiguration

    const chart = new Chart(canvas, config)
    return () => chart.destroy()
  }, [spec])

  if (!spec) {
    return <pre className="my-1 overflow-x-auto rounded bg-black/10 p-2 text-xs dark:bg-white/10">{json.trim()}</pre>
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

  return (
    <div className="group relative my-1 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800" style={{ height: 200 }}>
      <canvas ref={canvasRef} />
      <button
        type="button"
        onClick={download}
        aria-label="차트 이미지 저장"
        title="차트 이미지 저장"
        className="absolute right-1.5 top-1.5 rounded-md bg-white/80 p-1 text-gray-400 opacity-0 shadow-sm transition-opacity hover:text-gray-700 group-hover:opacity-100 dark:bg-gray-900/70 dark:hover:text-gray-200"
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
