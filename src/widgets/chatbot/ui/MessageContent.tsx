import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkCjkFriendlyGfmStrikethrough from 'remark-cjk-friendly-gfm-strikethrough'
import { splitBlocks, stripStrayHtml } from '../lib/parseBlocks'
import type { ChatAction } from '../model/types'
import { ActionBlock, ActionLink } from './ActionBlock'
import { ChartBlock } from './ChartBlock'
import { SurveyStatusBlock } from './SurveyStatusBlock'
import { CopyableTable } from './CopyableTable'

/**
 * 어시스턴트 메시지 렌더 — 본문을 마크다운(표=복사 가능)으로, ```chart는 Chart.js로,
 * ```survey는 진행률 막대와 계층을 함께 세운 현황 카드로, ```action은 지도 버튼으로.
 * 한글 인접 강조가 안 닫히는 CommonMark flanking 문제는 remark-cjk-friendly로 보정한다(순서: gfm → cjk-friendly).
 * 마크다운 요소 스타일은 index.css의 .chat-md에 둔다(컴포넌트 오버라이드의 node prop 경고 회피).
 */
export function MessageContent({ text, onAction }: { text: string; onAction?: (action: ChatAction) => void }) {
  return (
    <div className="chat-md space-y-1">
      {splitBlocks(text).map((seg, i) => {
        if (seg.kind === 'chart') return <ChartBlock key={i} json={seg.value} />
        if (seg.kind === 'survey') return <SurveyStatusBlock key={i} json={seg.value} />
        if (seg.kind === 'action') return <ActionBlock key={i} json={seg.value} onAction={onAction} />
        return seg.value.trim() ? (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm, remarkCjkFriendly, remarkCjkFriendlyGfmStrikethrough]}
            // 기본 변환은 모르는 주소 규약을 지운다 — 표 칸의 바로가기(bcs:)만 남기고 나머지는 그대로 맡긴다
            urlTransform={(url) => (url.startsWith('bcs:') ? url : defaultUrlTransform(url))}
            components={{
              table: CopyableTable,
              // 표 칸의 바로가기 — 「bcs:」 주소만 버튼이 되고 나머지 링크는 글자로 남는다
              a: ({ href, children }) => <ActionLink href={href} onAction={onAction}>{children}</ActionLink>,
            }}
          >
            {stripStrayHtml(seg.value)}
          </ReactMarkdown>
        ) : null
      })}
    </div>
  )
}
