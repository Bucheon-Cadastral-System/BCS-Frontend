import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkCjkFriendlyGfmStrikethrough from 'remark-cjk-friendly-gfm-strikethrough'
import { splitBlocks, stripStrayHtml } from '../lib/parseBlocks'
import type { ChatAction } from '../model/types'
import { ActionBlock } from './ActionBlock'
import { ChartBlock } from './ChartBlock'
import { CopyableTable } from './CopyableTable'

/**
 * 어시스턴트 메시지 렌더 — 본문을 마크다운(표=복사 가능)으로, ```chart는 Chart.js로, ```action은 지도 버튼으로.
 * 한글 인접 강조가 안 닫히는 CommonMark flanking 문제는 remark-cjk-friendly로 보정한다(순서: gfm → cjk-friendly).
 * 마크다운 요소 스타일은 index.css의 .chat-md에 둔다(컴포넌트 오버라이드의 node prop 경고 회피).
 */
export function MessageContent({ text, onAction }: { text: string; onAction?: (action: ChatAction) => void }) {
  return (
    <div className="chat-md space-y-1">
      {splitBlocks(text).map((seg, i) => {
        if (seg.kind === 'chart') return <ChartBlock key={i} json={seg.value} />
        if (seg.kind === 'action') return <ActionBlock key={i} json={seg.value} onAction={onAction} />
        return seg.value.trim() ? (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm, remarkCjkFriendly, remarkCjkFriendlyGfmStrikethrough]}
            components={{ table: CopyableTable }}
          >
            {stripStrayHtml(seg.value)}
          </ReactMarkdown>
        ) : null
      })}
    </div>
  )
}
