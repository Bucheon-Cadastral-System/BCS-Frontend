import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { ChatPanel } from './ChatPanel'
import { ChatBubbleIcon } from './icons'
import { useSendChatMutation } from '../api/chat'
import type { ChatAction, ChatMessage, ChatMode, Size } from '../model/types'
import { loadChatMessages, loadChatUi, saveChatMessages, saveChatUi } from '../model/storage'

const DOCK_MIN_WIDTH = 320
const FLOAT_MIN: Size = { width: 300, height: 380 }
const FLOAT_MAX = 900

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

/**
 * 챗봇 창 배치 호스트 — children(헤더 아래 콘텐츠)을 감싸고 창을 코너 카드 / 우측 도킹으로 배치한다.
 * 우측 도킹은 flex 형제로 실제 자리를 차지해 지도를 밀어내고, 코너는 지도 위 오버레이로 떠 있는다.
 * 모드 전환 시 대화(messages)는 부모 상태라 유지되나, 패널이 다른 호스트에 다시 마운트돼 입력 초안·스크롤 위치는 초기화된다(알려진 한계).
 */
export function ChatDockLayout({ children, onAction }: { children: ReactNode; onAction?: (action: ChatAction) => void }) {
  const initial = useRef(loadChatUi()).current

  const [open, setOpen] = useState(initial.open)
  const [mode, setMode] = useState<ChatMode>(initial.mode)
  const [floatSize, setFloatSize] = useState<Size>(initial.floatSize)
  const [dockWidth, setDockWidth] = useState(initial.dockWidth)

  const [messages, setMessages] = useState<ChatMessage[]>(loadChatMessages)
  const [resizing, setResizing] = useState(false) // 도킹 폭 드래그 중엔 width transition을 꺼 랙(매 프레임 애니메이션 추격)을 없앤다

  const chatMutation = useSendChatMutation()
  const pending = chatMutation.isPending

  const areaRef = useRef<HTMLDivElement>(null)

  const docked = open && mode === 'right'

  useEffect(() => {
    saveChatUi({ open, mode, floatSize, dockWidth })
  }, [open, mode, floatSize, dockWidth])

  useEffect(() => {
    saveChatMessages(messages)
  }, [messages])

  // 코너 오버레이는 ESC로 닫는다(도킹은 자리 차지라 유지)
  useEffect(() => {
    if (!open || mode !== 'corner') return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, mode])

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

  // 우측 도킹 폭 리사이즈(스플리터를 왼쪽으로 끌수록 넓어짐)
  function startSplitterDrag(e: ReactPointerEvent) {
    e.preventDefault()
    const area = areaRef.current
    if (!area) return
    const rect = area.getBoundingClientRect()
    const startX = e.clientX
    const start = dockWidth
    setResizing(true)
    function move(ev: PointerEvent) {
      const max = rect.width - DOCK_MIN_WIDTH - 8
      // 정수 폭 — 소수 폭은 flex 반올림으로 1px 틈(밝은 배경 노출)을 만든다
      setDockWidth(Math.round(clamp(start - (ev.clientX - startX), DOCK_MIN_WIDTH, Math.max(DOCK_MIN_WIDTH, max))))
    }
    function up() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setResizing(false)
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
    <div ref={areaRef} className="relative flex min-h-0 min-w-0 flex-1 flex-row bg-gray-100 dark:bg-gray-900">
      {/* flex 컨테이너여야 자식(콘텐츠 flex)의 flex-1·stretch가 먹어 지도가 영역을 꽉 채운다 */}
      <main className="relative flex min-h-0 min-w-0 flex-1">{children}</main>

      {/* 우측 도킹 영역 — main과 경계 하나만 공유(별도 스플리터 flex 아이템을 두지 않아 서브픽셀 틈 제거). 폭만 0↔dockWidth로 transition */}
      <div
        className={`relative min-h-0 shrink-0 overflow-hidden bg-white dark:bg-gray-800 ${resizing ? '' : 'transition-[width] duration-200 ease-out'}`}
        style={{ width: docked ? dockWidth : 0 }}
      >
        {docked && <div className="h-full" style={{ width: dockWidth }}>{panel}</div>}
      </div>

      {/* 도킹 리사이즈 힌트 — 경계(seam) 위에 걸쳐 지도쪽·채팅쪽 양쪽에서 보이는 중앙 그립. 루트 자식이라 패널 overflow에 안 잘림 */}
      {docked && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="채팅 패널 폭 조절"
          aria-valuenow={dockWidth}
          aria-valuemin={DOCK_MIN_WIDTH}
          tabIndex={0}
          onPointerDown={startSplitterDrag}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            const area = areaRef.current
            const max = area ? area.getBoundingClientRect().width - DOCK_MIN_WIDTH - 8 : dockWidth
            const step = e.key === 'ArrowLeft' ? 24 : -24 // 왼쪽=넓게(드래그 방향과 일치), 오른쪽=좁게
            setDockWidth((w) => Math.round(clamp(w + step, DOCK_MIN_WIDTH, Math.max(DOCK_MIN_WIDTH, max))))
          }}
          style={{ right: dockWidth }}
          className="group absolute inset-y-0 z-30 flex w-5 translate-x-1/2 cursor-col-resize items-center justify-center"
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-300 dark:bg-gray-600" />
          <span className="relative h-12 w-1.5 rounded-full bg-gray-400 shadow transition-colors group-hover:bg-blue-500 group-focus-visible:bg-blue-500 dark:bg-gray-500 dark:group-hover:bg-blue-400 dark:group-focus-visible:bg-blue-400" />
        </div>
      )}

      {/* 코너 카드 — 우하단 고정, 좌상단으로 리사이즈. 패널은 안쪽 래퍼가 둥글게 클립하고
          리사이즈 핸들은 테두리 바깥(음수 오프셋)에 둬 헤더 버튼을 가리지 않게 한다.
          닫혀도 마운트를 유지하고 open에 따라 우하단(버블 위치) 기준 scale+opacity로 열림/닫힘을 애니한다 */}
      {mode === 'corner' && (
        <div
          className={`absolute bottom-3 right-3 z-40 origin-bottom-right rounded-2xl border border-gray-200 bg-white shadow-2xl transition-[translate,scale,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:border-gray-700 dark:bg-gray-800 ${
            open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-90 opacity-0'
          }`}
          style={{ width: floatSize.width, height: floatSize.height }}
        >
          <div className="size-full overflow-hidden rounded-2xl">{panel}</div>
          <div onPointerDown={(e) => startCornerResize(e, 'y')} className="absolute inset-x-6 -top-1 z-20 h-2 cursor-ns-resize" />
          <div onPointerDown={(e) => startCornerResize(e, 'x')} className="absolute inset-y-6 -left-1 z-20 w-2 cursor-ew-resize" />
          {/* 좌상단 곡선 드래그 힌트 — 대각선 대칭인 짧은 사분원(ERP식), 코너에서 띄움 */}
          <div
            onPointerDown={(e) => startCornerResize(e, 'xy')}
            aria-hidden="true"
            className="group absolute left-0 top-0 z-20 size-10 cursor-nwse-resize"
          >
            <svg viewBox="0 0 40 40" aria-hidden="true" className="size-full text-gray-400 transition-colors group-hover:text-blue-500 dark:text-gray-500 dark:group-hover:text-blue-400">
              <path d="M3.3 12.4 A 12 12 0 0 1 12.4 3.3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}

      {/* 버블 버튼(FAB) — 우하단. 열리면 패널과 교차되게 페이드+스케일로 사라진다(지도 컨트롤은 좌하단) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="BCS 어시스턴트 열기"
        aria-hidden={open}
        tabIndex={open ? -1 : 0}
        className={`absolute bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-[translate,scale,opacity] duration-200 hover:bg-blue-500 ${
          open ? 'pointer-events-none scale-90 opacity-0' : 'scale-100 opacity-100 hover:scale-105'
        }`}
      >
        <ChatBubbleIcon className="size-6" />
      </button>
    </div>
  )
}
