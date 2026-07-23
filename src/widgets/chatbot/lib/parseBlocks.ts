/** 어시스턴트 본문 한 조각 — 마크다운 / 차트 / 액션(각 raw 문자열, 파싱은 렌더 컴포넌트가 맡는다). */
export interface MessageSegment {
  kind: 'md' | 'chart' | 'action'
  value: string
}

// ```chart / ```action 코드펜스만 뽑고, 나머지는 마크다운으로 둔다
const FENCE = /```(chart|action)[^\n]*\n([\s\S]*?)```/g

/** 본문을 마크다운·차트·액션 세그먼트로 순서대로 쪼갠다. */
export function splitBlocks(text: string): MessageSegment[] {
  const segments: MessageSegment[] = []
  let last = 0
  for (const m of text.matchAll(FENCE)) {
    const start = m.index ?? 0
    if (start > last) segments.push({ kind: 'md', value: text.slice(last, start) })
    segments.push({ kind: m[1] as 'chart' | 'action', value: m[2] ?? '' })
    last = start + m[0].length
  }
  if (last < text.length) segments.push({ kind: 'md', value: text.slice(last) })
  return segments.length > 0 ? segments : [{ kind: 'md', value: text }]
}

/**
 * 모델이 규칙을 어기고 내는 raw HTML을 중화한다. react-markdown은 raw HTML을 렌더하지 않아(XSS 안전)
 * <br> 등이 글자로 노출되므로 여기서 제거하되, 코드(펜스·인라인)는 보존한다(HTML 예시 원문 훼손 방지).
 * 코드 밖에서만: <br>·블록 태그(p/div)는 공백으로(문장 붙음 방지), 인라인 포매팅 태그는 제거(텍스트 보존).
 */
export function stripStrayHtml(md: string): string {
  return md
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<\/?(?:p|div)\b[^>]*>/gi, ' ')
            .replace(/<\/?(?:span|font|small|sub|sup|u|b|i|em|strong|center)\b[^>]*>/gi, ''),
    )
    .join('')
}
