import { SURVEY_STATUS_COLOR_VAR, SURVEY_STATUS_LABEL } from '@/entities/survey-record'
import type { SurveyStatus } from '@/entities/survey-record'
import { percent } from '@/shared/lib/percent'

/** 조사 완료를 이루는 네 갈래 — 미조사는 이 아래가 아니라 조사 완료의 형제라 따로 둔다. */
export const DONE_STATUSES: Exclude<SurveyStatus, 'todo'>[] = ['done', 'lost', 'unavailable', 'etc']

export interface SurveyStatusSpec {
  title?: string
  total: number
  surveyed: number
  /** 네 갈래가 다 오고 합이 조사 완료와 맞을 때만 채운다. 하나라도 어긋나면 진행률만 그린다. */
  breakdown: Record<Exclude<SurveyStatus, 'todo'>, number> | null
}

/**
 * 내보낸 그림은 흰 종이 위에 놓인다 — 문서에 붙이거나 인쇄해도 읽혀야 하므로
 * 글자·선 색은 화면 테마를 따라가지 않고 여기서 고정한다. 갈래 색만 화면에서 읽어
 * 같은 답변에서 함께 저장한 차트 그림과 색이 어긋나지 않게 한다.
 */
const PAPER = '#ffffff'
const INK = '#1f2937'
const INK_SOFT = '#6b7280'
const LINE = '#e5e7eb'
const RING = '#9ca3af'

const WIDTH = 360
const PAD = 16
const ROW = 20
/** 제목 한 줄이 차지하는 높이 */
const TITLE_LINE = 18
/**
 * 제목에 내주는 최대 줄 수. 이름 길이에는 상한이 없어 못을 박지 않으면 종이가 끝없이 길어지고,
 * 그만큼 큰 그림을 만들다 실패하면 저장 버튼이 아무 일도 하지 않은 것처럼 보인다.
 */
const TITLE_MAX_LINES = 3
/** 제목 아래(진행률·구분선·일곱 줄·여백)에 필요한 높이보다 넉넉히 잡은 값 */
const BODY_ROOM = 320
/** 레티나에서 글자가 뭉개지지 않게 두 배로 그린다 */
const SCALE = 2

/** 줄머리 표시가 서는 자리와 글자가 시작하는 자리(카드 왼쪽에서부터). 화면 카드의 들여쓰기와 같다. */
const RAIL_X = PAD + 9
const TIER2_MARK = PAD + 10
const TIER2_LABEL = PAD + 23
const TIER3_MARK = PAD + 22
const TIER3_LABEL = PAD + 35

function readVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value === '' ? fallback : value
}

/**
 * 글자 하나씩 재어 폭에 맞춰 자른다.
 * 조사 이름에는 밑줄·괄호가 섞여 들어와 낱말 단위로 자르면 한 줄이 카드를 넘어간다.
 */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    if (line !== '' && ctx.measureText(line + ch).width > max) {
      lines.push(line)
      line = ch
    } else {
      line += ch
    }
  }
  if (line !== '') lines.push(line)
  return lines
}

/** 줄 수를 상한까지만 남기고, 잘렸다는 것을 마지막 줄 끝으로 알린다. */
function clamp(lines: string[]): string[] {
  if (lines.length <= TITLE_MAX_LINES) return lines
  const kept = lines.slice(0, TITLE_MAX_LINES)
  kept[TITLE_MAX_LINES - 1] = `${kept[TITLE_MAX_LINES - 1].slice(0, -1)}…`
  return kept
}

/**
 * 조사 현황 카드를 흰 바탕 그림으로 그린다.
 *
 * <p>화면 카드는 HTML 이라 그대로는 그림이 되지 않는다. 남에게 보내거나 문서에 붙이는 자리라
 * 같은 내용을 캔버스에 다시 그린다 — 차트 저장과 같은 방식이고, 받는 쪽에 이 앱이 없어도 열린다.
 *
 * <p>높이는 줄 단위로 셈하지 않고 넉넉한 canvas 에 그린 뒤 쓴 만큼만 잘라 낸다.
 * 셈을 따로 두면 줄 하나를 더할 때마다 그리는 코드와 셈하는 코드가 갈라진다.
 * 다만 제목은 길이 제한이 없어 줄 수만 미리 재고 그만큼 종이를 길게 잡는다.
 * 넉넉한 높이를 상수로 박아 두면 긴 이름이 오는 순간 진행률과 내역이 종이 밖에서 잘린다.
 */
export function drawSurveyStatusCard(spec: SurveyStatusSpec): HTMLCanvasElement | null {
  const font = readVar('--font-sans', 'system-ui, sans-serif')
  const accent = readVar('--color-teal-fill', '#0e6b5c')
  const fillFrom = readVar('--color-teal-edge', '#0e6b5c')
  const fillTo = readVar('--color-teal-bright', '#14806d')

  const gauge = document.createElement('canvas').getContext('2d')
  if (gauge === null) return null
  gauge.font = `600 13px ${font}`
  const titleLines = clamp(spec.title === undefined ? [] : wrap(gauge, spec.title, WIDTH - PAD * 2))
  const room = BODY_ROOM + titleLines.length * TITLE_LINE

  const draft = document.createElement('canvas')
  draft.width = WIDTH * SCALE
  draft.height = room * SCALE
  const ctx = draft.getContext('2d')
  if (ctx === null) return null
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, WIDTH, room)

  let y = PAD

  if (titleLines.length > 0) {
    ctx.font = `600 13px ${font}`
    ctx.fillStyle = INK
    for (const line of titleLines) {
      y += 14
      ctx.fillText(line, PAD, y)
      y += 4
    }
    y += 6
  }

  const pct = percent(spec.surveyed, spec.total)
  y += 12
  ctx.font = `500 12px ${font}`
  ctx.fillStyle = INK_SOFT
  ctx.fillText(`조사 ${spec.surveyed} / 전체 ${spec.total}`, PAD, y)
  ctx.font = `700 12px ${font}`
  ctx.fillStyle = accent
  ctx.textAlign = 'right'
  ctx.fillText(`${pct}%`, WIDTH - PAD, y)
  ctx.textAlign = 'left'
  y += 8

  const barWidth = WIDTH - PAD * 2
  ctx.fillStyle = LINE
  ctx.beginPath()
  ctx.roundRect(PAD, y, barWidth, 6, 3)
  ctx.fill()
  if (pct > 0) {
    const gradient = ctx.createLinearGradient(PAD, 0, PAD + barWidth, 0)
    gradient.addColorStop(0, fillFrom)
    gradient.addColorStop(1, fillTo)
    ctx.fillStyle = gradient
    ctx.beginPath()
    // 1%도 6px 은 그린다 — 더 좁으면 둥근 끝이 서로 겹쳐 막대가 아니라 점으로 보인다
    ctx.roundRect(PAD, y, Math.max(6, (barWidth * pct) / 100), 6, 3)
    ctx.fill()
  }
  y += 6

  const breakdown = spec.breakdown
  if (breakdown !== null) {
    y += 12
    ctx.strokeStyle = LINE
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, y + 0.5)
    ctx.lineTo(WIDTH - PAD, y + 0.5)
    ctx.stroke()
    y += 8

    /** 한 줄을 그리고 줄머리 표시를 앉힐 세로 한가운데를 돌려준다 */
    const line = (labelX: number, label: string, value: number, lead: boolean): number => {
      y += ROW
      const baseline = y - 6
      ctx.font = `${lead ? 600 : 500} 12px ${font}`
      ctx.fillStyle = lead ? INK : INK_SOFT
      ctx.fillText(label, labelX, baseline)
      ctx.font = `${lead ? 700 : 600} 12px ${font}`
      ctx.fillStyle = INK
      ctx.textAlign = 'right'
      ctx.fillText(String(value), WIDTH - PAD, baseline)
      ctx.textAlign = 'left'
      return baseline - 4
    }

    line(PAD, '전체 대상', spec.total, true)

    y += 6
    const doneMid = line(TIER2_LABEL, '조사 완료', spec.surveyed, false)
    const gradient = ctx.createLinearGradient(TIER2_MARK, 0, TIER2_MARK + 7, 0)
    gradient.addColorStop(0, fillFrom)
    gradient.addColorStop(1, fillTo)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(TIER2_MARK, doneMid - 1.5, 7, 3, 1.5)
    ctx.fill()

    const railTop = y
    for (const status of DONE_STATUSES) {
      const mid = line(TIER3_LABEL, SURVEY_STATUS_LABEL[status], breakdown[status], false)
      ctx.fillStyle = readVar(SURVEY_STATUS_COLOR_VAR[status], INK_SOFT)
      ctx.beginPath()
      ctx.arc(TIER3_MARK + 3.5, mid, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = LINE
    ctx.beginPath()
    ctx.moveTo(RAIL_X + 0.5, railTop)
    ctx.lineTo(RAIL_X + 0.5, y)
    ctx.stroke()

    y += 6
    const todoMid = line(TIER2_LABEL, SURVEY_STATUS_LABEL.todo, spec.total - spec.surveyed, false)
    ctx.strokeStyle = RING
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(TIER2_MARK + 3.5, todoMid, 3, 0, Math.PI * 2)
    ctx.stroke()
  }

  y += PAD

  const out = document.createElement('canvas')
  out.width = WIDTH * SCALE
  out.height = Math.round(y * SCALE)
  out.getContext('2d')?.drawImage(draft, 0, 0)
  return out
}
