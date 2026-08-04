import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { ChatPanel } from './ChatPanel'
import { ChatBubbleIcon, CloseIcon } from './icons'
import { useSendChatMutation } from '../api/chat'
import type { ChatAction, ChatMessage, ChatMode, Size } from '../model/types'
import { loadChatMessages, loadChatUi, saveChatMessages, saveChatUi } from '../model/storage'
import { useDismiss } from '@/shared/lib/useDismiss'
import { PANEL } from '@/shared/ui/classes'

/** 우측 판 기본 폭 — 헤더 우측 묶음을 아직 재지 못했을 때만 쓴다 */
const DOCK_WIDTH = 420
const FLOAT_MIN: Size = { width: 300, height: 380 }
const FLOAT_MAX = 900

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

/**
 * 챗봇 창 배치 호스트 — children(지도 영역)을 감싸고 창을 코너 카드 / 우측 판으로 배치한다.
 * 둘 다 지도 위에 떠 있는 오버레이라 지도 크기는 창을 열어도 그대로다.
 * 모드 전환 시 대화(messages)는 부모 상태라 유지되나, 패널이 다른 호스트에 다시 마운트돼 입력 초안·스크롤 위치는 초기화된다(알려진 한계).
 */
export function ChatDockLayout({
  children,
  width,
  onDockWidthChange,
  onAction,
}: {
  children: ReactNode
  /** 우측 판 폭 — 헤더 우측 묶음(검색+사용자)과 같은 너비로 세운다 */
  width?: number
  /** 우측 판이 차지한 폭 — 지도 위 다른 요소가 이만큼 비켜 서도록 알린다(닫혀 있으면 0) */
  onDockWidthChange?: (px: number) => void
  onAction?: (action: ChatAction) => void
}) {
  const initial = useRef(loadChatUi()).current

  const [open, setOpen] = useState(initial.open)
  const [mode, setMode] = useState<ChatMode>(initial.mode)
  const [floatSize, setFloatSize] = useState<Size>(initial.floatSize)

  const [messages, setMessages] = useState<ChatMessage[]>(loadChatMessages)

  const chatMutation = useSendChatMutation()
  const pending = chatMutation.isPending

  const areaRef = useRef<HTMLDivElement>(null)

  const docked = open && mode === 'right'
  const dockWidth = width || DOCK_WIDTH

  useEffect(() => {
    saveChatUi({ open, mode, floatSize, dockWidth: DOCK_WIDTH })
  }, [open, mode, floatSize])

  useEffect(() => {
    onDockWidthChange?.(docked ? dockWidth : 0)
  }, [docked, dockWidth, onDockWidthChange])

  useEffect(() => {
    saveChatMessages(messages)
  }, [messages])

  // 코너 오버레이는 ESC로 닫는다(도킹은 자리 차지라 유지)
  useDismiss({ enabled: open && mode === 'corner', onDismiss: () => setOpen(false) })

  // 진행 중 요청의 응답이 '새 대화'로 초기화된 뒤 섞이지 않게 세션을 센다
  const sessionRef = useRef(0)

  function send(text: string) {
    if (pending) return // 입력창·빠른 질의 등 모든 전송 경로를 응답 대기 중엔 막는다
    const session = sessionRef.current
    setMessages((prev) => [...prev, { role: 'user', text }])
    chatMutation.mutate(text, {
      onSuccess: (answer) => {
        if (sessionRef.current !== session) return // 새 대화로 초기화됐으면 이전 응답을 버린다
        setMessages((prev) => [...prev, { role: 'assistant', text: answer }])
      },
      onError: () => {
        if (sessionRef.current !== session) return
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: '답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
        ])
      },
    })
  }

  function newChat() {
    sessionRef.current += 1
    setMessages([])
  }

  // 코너 카드 좌상단 리사이즈(우하단 고정)
  function startCornerResize(e: ReactPointerEvent, axis: 'x' | 'y' | 'xy') {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const start = { ...floatSize }
    function move(ev: PointerEvent) {
      let width = start.width
      let height = start.height
      if (axis === 'x' || axis === 'xy') width = clamp(start.width - (ev.clientX - startX), FLOAT_MIN.width, FLOAT_MAX)
      if (axis === 'y' || axis === 'xy') height = clamp(start.height - (ev.clientY - startY), FLOAT_MIN.height, FLOAT_MAX)
      setFloatSize({ width, height })
    }
    function up() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const panel = (
    <ChatPanel
      messages={messages}
      pending={pending}
      expanded={mode === 'right'}
      onSend={send}
      onNewChat={newChat}
      onToggleExpand={() => setMode((m) => (m === 'right' ? 'corner' : 'right'))}
      onClose={() => setOpen(false)}
      onAction={onAction}
    />
  )

  return (
    // 루트에 테마 배경을 깔아, 서브픽셀 틈이 생겨도 밝은 body 배경 대신 이 색이 비쳐 흰 선이 안 보이게 한다
    // overflow-hidden: 스플리터(경계 위로 절반 걸침)·코너 카드처럼 가장자리에 걸치는 요소가 페이지 가로 스크롤을 만들지 않게 한다
    <div ref={areaRef} className="relative flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
      {/* flex 컨테이너여야 자식(콘텐츠 flex)의 flex-1·stretch가 먹어 지도가 영역을 꽉 채운다 */}
      <main className="relative flex min-h-0 min-w-0 flex-1">{children}</main>

      {/* 우측 판 — 좌측 판과 같은 규격으로 헤더 밑에서 떠오른다(지도를 밀지 않는다) */}
      {mode === 'right' && (
        <aside
          aria-hidden={!open}
          inert={!open}
          style={{ width: dockWidth }}
          className={`absolute bottom-bar-clear right-4 top-[76px] z-40 overflow-hidden transition-[opacity,transform] duration-200 ease-out ${PANEL} ${
            open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
          }`}
        >
          {panel}
        </aside>
      )}

      {/* 코너 카드 — 버블 위에 세워 아래 커맨드 바를 가리지 않는다. 좌상단으로 리사이즈하고,
          리사이즈 핸들은 테두리 바깥(음수 오프셋)에 둬 헤더 버튼을 가리지 않게 한다.
          닫혀도 마운트를 유지하고 open에 따라 우하단(버블 위치) 기준 scale+opacity로 열림/닫힘을 애니한다 */}
      {mode === 'corner' && (
        <div
          aria-hidden={!open}
          inert={!open}
          className={`absolute bottom-[88px] right-6 z-40 origin-bottom-right overflow-hidden transition-[translate,scale,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${PANEL} ${
            open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-90 opacity-0'
          }`}
          style={{ width: floatSize.width, height: floatSize.height }}
        >
          <div className="size-full overflow-hidden rounded-pill">{panel}</div>
          <div onPointerDown={(e) => startCornerResize(e, 'y')} className="absolute inset-x-6 -top-1 z-20 h-2 cursor-ns-resize" />
          <div onPointerDown={(e) => startCornerResize(e, 'x')} className="absolute inset-y-6 -left-1 z-20 w-2 cursor-ew-resize" />
          {/* 좌상단 곡선 드래그 힌트 — 대각선 대칭인 짧은 사분원(ERP식), 코너에서 띄움 */}
          <div
            onPointerDown={(e) => startCornerResize(e, 'xy')}
            aria-hidden="true"
            className="group absolute left-0 top-0 z-20 size-10 cursor-nwse-resize"
          >
            {/* 카드 모서리(반지름 6)를 3px 안쪽에서 따라 그린다.
                안쪽으로 들어온 만큼 곡률도 줄어드는 것이라 반지름은 6이 아니라 6−3=3 이어야 모서리와 나란하다.
                굽은 자리가 짧아진 만큼 양옆으로 곧은 팔을 뻗어 잡는 자리를 알아볼 수 있게 둔다 */}
            <svg viewBox="0 0 40 40" aria-hidden="true" className="size-full text-ink-4 transition-colors group-hover:text-teal-text">
              <path d="M3 9 L3 6 A 3 3 0 0 1 6 3 L9 3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}

      {/* 버블 버튼(FAB) — 우하단. 코너 카드는 이 버튼 위에 서므로 열려 있는 동안에도 남아 닫기 버튼이 된다.
          우측 판은 이 자리를 덮으므로 그때만 비켜 준다(판 머리의 닫기 버튼이 대신한다) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'BCS 어시스턴트 닫기' : 'BCS 어시스턴트 열기'}
        aria-expanded={open}
        aria-hidden={docked}
        tabIndex={docked ? -1 : 0}
        className={`absolute bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full border-[1.5px] bg-pill shadow-pill transition-[color,border-color,background-color,transform,opacity] duration-200 ${
          open
            ? 'border-danger-edge text-danger hover:bg-danger-wash'
            : 'border-teal-btn-edge text-teal-text hover:border-teal-text hover:bg-teal-wash'
        } ${docked ? 'pointer-events-none scale-90 opacity-0' : 'scale-100 opacity-100 hover:scale-105'}`}
      >
        {/* 두 아이콘을 겹쳐 두고 돌려가며 바꾼다 — 무엇이 무엇으로 바뀌는지 보이게 */}
        <span className="relative flex size-6 items-center justify-center">
          <ChatBubbleIcon
            className={`absolute size-6 transition-[opacity,rotate,scale] duration-200 ease-out ${
              open ? 'rotate-45 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100'
            }`}
          />
          <CloseIcon
            className={`absolute size-6 transition-[opacity,rotate,scale] duration-200 ease-out ${
              open ? 'rotate-0 scale-100 opacity-100' : '-rotate-45 scale-75 opacity-0'
            }`}
          />
        </span>
      </button>
    </div>
  )
}
