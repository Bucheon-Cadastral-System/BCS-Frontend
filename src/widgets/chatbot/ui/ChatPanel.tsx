import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../model/types'
import { CloseIcon, CollapseIcon, ExpandIcon, NewChatIcon, SendIcon, SparkleIcon } from './icons'

// 대화 시작 전부터 맨 위에 두는 웰컴 안내(어시스턴트 말풍선). 메시지 배열 밖이라 저장·전송되지 않는다.
const WELCOME_MESSAGE = ['안녕하세요! BCS 어시스턴트입니다.', '무엇을 도와드릴까요?'].join('\n')

/** 어시스턴트 말풍선 좌측 아바타. */
function AssistantAvatar() {
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center self-start rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300"
    >
      <SparkleIcon className="size-3.5" />
    </span>
  )
}

interface ChatPanelProps {
  messages: ChatMessage[]
  pending: boolean
  expanded: boolean
  onSend: (text: string) => void
  onNewChat: () => void
  onToggleExpand: () => void
  onClose: () => void
}

const HEADER_BTN = 'flex size-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-500/10 hover:text-gray-600 dark:hover:text-gray-200'

/**
 * 상태 없는 대화 셸 — 글래스 헤더·입력이 스크롤 위에 떠 있고 메시지는 그 아래로 흐른다(참고 디자인).
 * 배치/상태는 ChatDockLayout이 소유한다.
 */
export function ChatPanel(props: ChatPanelProps) {
  const [input, setInput] = useState('')
  const composingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const wasPending = useRef(props.pending)

  // 새 메시지·타이핑 표시가 뜨면 항상 최하단으로
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [props.messages, props.pending])

  // 응답이 끝나면 입력창에 포커스를 되돌린다
  useEffect(() => {
    if (wasPending.current && !props.pending) inputRef.current?.focus()
    wasPending.current = props.pending
  }, [props.pending])

  function send() {
    const text = input.trim()
    if (!text || props.pending) return
    props.onSend(text)
    setInput('')
  }

  return (
    <div className="relative h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* 스크롤 영역 — 글래스 헤더·입력 아래로 메시지가 흐르도록 상·하 여백을 준다 */}
      <div ref={scrollRef} className="chat-scroll absolute inset-0 space-y-3 overflow-y-auto px-3 pb-28 pt-14">
        {/* 웰컴 메시지 — 대화 맨 위에 항상 표시(진행 중에도 최상단에 남는다) */}
        <div className="flex justify-start gap-2">
          <AssistantAvatar />
          <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[13px] leading-relaxed text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-100">
            {WELCOME_MESSAGE}
          </div>
        </div>

        {props.messages.map((m, i) => (
          <div key={i} className={`chat-msg-in flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && <AssistantAvatar />}
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-tr-sm bg-blue-600 text-white'
                  : 'rounded-tl-sm bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-100'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {props.pending && (
          <div className="chat-msg-in flex justify-start gap-2">
            <AssistantAvatar />
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm dark:bg-gray-800">
              <span className="size-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-gray-400" />
            </div>
          </div>
        )}
      </div>

      {/* 글래스 헤더 — 스크롤 위에 떠 있다. 코너 모드에선 좌상단 리사이즈 힌트와 이름을 띄운다 */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-1 bg-white/75 px-3.5 py-3 backdrop-blur-xl dark:bg-gray-900/70">
        <strong className={`min-w-0 flex-1 select-none truncate text-[13px] font-semibold text-gray-900 dark:text-gray-100 ${props.expanded ? '' : 'pl-4'}`}>BCS 어시스턴트</strong>
        <button type="button" onClick={props.onToggleExpand} aria-label={props.expanded ? '코너로 축소' : '우측으로 확장'} aria-pressed={props.expanded} title={props.expanded ? '코너로 축소' : '우측으로 확장'} className={HEADER_BTN}>
          {props.expanded ? <CollapseIcon className="size-4" /> : <ExpandIcon className="size-4" />}
        </button>
        <button type="button" onClick={props.onNewChat} aria-label="새 대화" title="새 대화 (대화 기록 비우기)" className={HEADER_BTN}>
          <NewChatIcon className="size-4" />
        </button>
        <button type="button" onClick={props.onClose} aria-label="닫기" title="닫기" className={HEADER_BTN}>
          <CloseIcon className="size-4" />
        </button>
      </header>

      {/* 글래스 입력 — 스크롤 위에 떠 있다 */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-end gap-2 bg-white/75 px-3 py-2.5 backdrop-blur-xl dark:bg-gray-900/70">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onCompositionStart={() => { composingRef.current = true }}
          onCompositionEnd={() => { composingRef.current = false }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          placeholder="메시지를 입력하세요"
          className="max-h-28 flex-1 resize-none rounded-xl border border-gray-300 bg-white/80 px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-100"
        />
        <button
          type="button"
          onClick={send}
          disabled={!input.trim() || props.pending}
          aria-label="전송"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >
          <SendIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}
