import { useEffect, useRef, useState } from 'react'
import type { ChatAction, ChatMessage } from '../model/types'
import { CloseIcon, CollapseIcon, ExpandIcon, NewChatIcon, SendIcon, SparkleIcon } from './icons'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { MessageContent } from './MessageContent'
import { QuickActions } from './QuickActions'
import { FIELD_AREA, ICON_BTN, ICON_BTN_DANGER, PANEL_HEADER, PANEL_HEADER_RULE } from '@/shared/ui/classes'

// 대화 시작 전부터 맨 위에 두는 웰컴 안내(어시스턴트 말풍선). 메시지 배열 밖이라 저장·전송되지 않는다.
const WELCOME_MESSAGE = ['안녕하세요! BCS 어시스턴트입니다.', '무엇을 도와드릴까요?'].join('\n')

/** 어시스턴트 말풍선 좌측 아바타. */
function AssistantAvatar() {
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center self-start rounded-full bg-teal-wash-strong text-teal-text"
    >
      <SparkleIcon className="size-3.5" />
    </span>
  )
}

interface ChatPanelProps {
  messages: ChatMessage[]
  pending: boolean
  /** 서버 기록을 비우는 중 — 그 사이 보낸 말은 지워질 대화에 붙으므로 전송 자체를 막는다 */
  clearing?: boolean
  expanded: boolean
  onSend: (text: string) => void
  onNewChat: () => void
  onToggleExpand: () => void
  onClose: () => void
  onAction?: (action: ChatAction) => void
}


/**
 * 상태 없는 대화 셸 — 글래스 헤더·입력이 스크롤 위에 떠 있고 메시지는 그 아래로 흐른다(참고 디자인).
 * 배치/상태는 ChatDockLayout이 소유한다.
 */
export function ChatPanel(props: ChatPanelProps) {
  // 답을 기다리는 것과 비우는 것은 이유가 다르지만 화면이 할 일은 같다 — 입력을 받지 않는다
  const busy = props.pending || props.clearing === true
  const [input, setInput] = useState('')
  const composingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // 대화를 비우면 되돌릴 수 없다 — 한 번 묻는다
  const [confirmNew, setConfirmNew] = useState(false)
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
    // 막을 때 입력을 비우지 않는다 — 비우면 보내지지도 않은 말이 사라져 되찾을 수 없다
    if (!text || busy) return
    props.onSend(text)
    setInput('')
  }

  return (
    <div className="relative h-full overflow-hidden bg-panel">
      {/* 스크롤 영역 — 글래스 헤더·입력 아래로 메시지가 흐르도록 상·하 여백을 준다 */}
      <div ref={scrollRef} className="chat-scroll absolute inset-0 space-y-3 overflow-y-auto px-3.5 pb-28 pt-[70px]">
        {/* 웰컴 메시지 — 대화 맨 위에 항상 표시(진행 중에도 최상단에 남는다) */}
        <div className="flex justify-start gap-2">
          <AssistantAvatar />
          <div className="max-w-[85%] whitespace-pre-wrap rounded-pop rounded-tl-[2px] border border-line-soft bg-soft px-3 py-2 text-[13px] leading-relaxed text-ink-2">
            {WELCOME_MESSAGE}
          </div>
        </div>

        {/* 대화 시작 전에만 자주 쓰는 질의 빠른실행 버튼 노출 */}
        {props.messages.length === 0 && <QuickActions onQuery={props.onSend} disabled={busy} />}

        {props.messages.map((m, i) => (
          <div key={i} className="chat-msg-in space-y-2">
            <div className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && <AssistantAvatar />}
              <div
                className={`max-w-[85%] rounded-pop px-3 py-2 text-[13px] leading-relaxed ${
                  m.role === 'user'
                    ? 'whitespace-pre-wrap rounded-tr-[2px] bg-teal-fill text-on-teal'
                    : 'rounded-tl-[2px] border border-line-soft bg-soft text-ink-2'
                }`}
              >
                {m.role === 'assistant' ? <MessageContent text={m.text} onAction={props.onAction} /> : m.text}
              </div>
            </div>
            {/* 어시스턴트 답변 아래마다 빠른 질의 버튼 노출 */}
            {m.role === 'assistant' && <QuickActions onQuery={props.onSend} disabled={busy} />}
          </div>
        ))}

        {props.pending && (
          <div className="chat-msg-in flex justify-start gap-2">
            <AssistantAvatar />
            <div className="flex items-center gap-1 rounded-pop rounded-tl-[2px] border border-line-soft bg-soft px-3 py-2.5">
              <span className="size-1.5 animate-bounce rounded-full bg-ink-4 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-ink-4 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-ink-4" />
            </div>
          </div>
        )}
      </div>

      {/* 글래스 헤더 — 스크롤 위에 떠 있다. 코너 모드에선 좌상단 리사이즈 힌트와 이름을 띄운다 */}
      {/* 아래 경계는 청록 — 좌측 판이 목록 위에 두는 것과 같은 뜻의 구분선이다 */}
      <header className={`absolute inset-x-0 top-0 z-20 bg-pill ${PANEL_HEADER} ${PANEL_HEADER_RULE}`}>
        <strong className={`min-w-0 flex-1 select-none truncate text-[13.5px] font-semibold text-ink ${props.expanded ? '' : 'pl-4'}`}>BCS 어시스턴트</strong>
        <button type="button" onClick={props.onToggleExpand} aria-label={props.expanded ? '코너로 축소' : '우측으로 확장'} aria-pressed={props.expanded} title={props.expanded ? '코너로 축소' : '우측으로 확장'} className={ICON_BTN}>
          {props.expanded ? <CollapseIcon className="size-full" /> : <ExpandIcon className="size-full" />}
        </button>
        <button
          type="button"
          // 비어 있으면 지울 것이 없으므로 묻지 않는다
          onClick={() => (props.messages.length === 0 ? props.onNewChat() : setConfirmNew(true))}
          disabled={props.clearing === true}
          aria-label="새 대화"
          title="새 대화 (대화 기록 비우기)"
          className={ICON_BTN}
        >
          <NewChatIcon className="size-full" />
        </button>
        <button type="button" onClick={props.onClose} aria-label="닫기" title="닫기" className={ICON_BTN_DANGER}>
          <CloseIcon className="size-full" />
        </button>
      </header>

      {/* 글래스 입력 — 스크롤 위에 떠 있다 */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-end gap-2 border-t border-line-soft bg-pill px-3 py-2.5">
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
          className={`${FIELD_AREA} h-10 flex-1`}
        />
        <button
          type="button"
          onClick={send}
          disabled={!input.trim() || busy}
          aria-label="전송"
          className="flex size-10 shrink-0 items-center justify-center rounded-ctl border-[1.5px] border-teal-btn-edge bg-teal-wash text-teal-text transition-colors hover:border-teal-text hover:bg-teal-wash-strong disabled:opacity-40"
        >
          <SendIcon className="size-4" />
        </button>
      </div>

      {confirmNew && (
        <ConfirmDialog
          message="새 대화를 시작할까요?"
          detail="지금까지의 대화 내용이 모두 사라집니다."
          confirmLabel="새 대화"
          cancelLabel="취소"
          danger
          onConfirm={() => {
            setConfirmNew(false)
            props.onNewChat()
          }}
          onCancel={() => setConfirmNew(false)}
        />
      )}
    </div>
  )
}
