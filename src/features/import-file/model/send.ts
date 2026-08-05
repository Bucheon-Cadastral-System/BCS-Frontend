import { useEffect, useRef, useState } from 'react'
import { ApiError } from '@/shared/api/http'

/** 순차 전송에서 한 건이 갖는 상태 */
export type SendStatus = 'idle' | 'sending' | 'done' | 'failed'

/** 확인·등록 목록의 상태 문구 — 등록을 시작했는지가 아니라 그 건의 상태로 정한다 */
export const SEND_LABEL: Record<SendStatus, string> = {
  idle: '등록 예정',
  sending: '등록 중',
  done: '완료',
  failed: '실패',
}

interface SendState {
  status: SendStatus
  error?: string
}

/**
 * 건들을 차례로 보낸다 — 서버가 한 요청에 하나만 받고, 같은 기준점이 여러 건에 겹칠 수 있어 병렬로 보낼 수 없다.
 * 실패하면 그 건에 멈추고, 다시 실행하면 done이 아닌 건만 다시 보낸다(앞서 보낸 건은 이미 서버에 있다).
 * 상태는 건의 순번(index)으로 든다 — 건 목록 자체는 부르는 쪽이 소유한다.
 */
export function useSequentialSend(fallbackError: string) {
  const [states, setStates] = useState<ReadonlyMap<number, SendState>>(new Map())
  const [started, setStarted] = useState(false)
  const [sendingIndex, setSendingIndex] = useState(-1)
  // 렌더 상태는 비동기 루프 안에서 낡는다 — 겹침 방지는 ref가 맡는다
  const inFlightRef = useRef(false)
  // reset이 진행 중 실행을 무효화한다 — 세대가 바뀐 루프는 상태에 손대지 않는다
  const generationRef = useRef(0)
  // 전송은 위에서부터 차례로 내려가 지금 보내는 줄이 화면 밖으로 나간다 — 목록이 그 줄을 따라간다
  const sendingRowRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    sendingRowRef.current?.scrollIntoView({ block: 'center' })
  }, [sendingIndex])

  const statusOf = (index: number): SendStatus => states.get(index)?.status ?? 'idle'
  const errorOf = (index: number): string | undefined => states.get(index)?.error

  function set(index: number, state: SendState) {
    setStates((cur) => new Map(cur).set(index, state))
  }

  /** 보내지 않고 완료로 표시한다 — 보내도 서버가 할 일이 없는 건(모두 변경 없음)에 쓴다. */
  function markDone(indexes: number[]) {
    if (indexes.length === 0) return
    setStates((cur) => {
      const next = new Map(cur)
      indexes.forEach((i) => next.set(i, { status: 'done' }))
      return next
    })
  }

  /** 확인 단계를 떠날 때 부른다 — 입력으로 돌아가면 보낸 이력도 처음부터고, 돌고 있던 전송 루프는 무효가 된다. */
  function reset() {
    generationRef.current += 1
    inFlightRef.current = false
    setStates(new Map())
    setStarted(false)
    setSendingIndex(-1)
  }

  /**
   * targets를 차례로 보낸다. done인 건은 부르는 쪽이 걸러 넘긴다.
   * 실패한 건에서 멈추고 나머지는 idle로 남아, 다음 실행이 이어 보낸다.
   */
  async function run(targets: number[], sendOne: (index: number, order: number, total: number) => Promise<void>) {
    if (inFlightRef.current) return
    setStarted(true)
    if (targets.length === 0) return
    inFlightRef.current = true
    const generation = generationRef.current
    setStates((cur) => {
      const next = new Map(cur)
      targets.forEach((i) => next.set(i, { status: 'idle' }))
      return next
    })
    try {
      for (const [order, at] of targets.entries()) {
        if (generation !== generationRef.current) return
        setSendingIndex(at)
        set(at, { status: 'sending' })
        try {
          await sendOne(at, order, targets.length)
        } catch (e) {
          if (generation !== generationRef.current) return
          // 여기서 멈춘다 — 사유는 그 건의 줄이 보여 준다
          set(at, { status: 'failed', error: e instanceof ApiError ? e.message : fallbackError })
          return
        }
        if (generation !== generationRef.current) return
        set(at, { status: 'done' })
      }
    } finally {
      // 무효화됐으면 reset이 이미 정리했다 — 새 세대의 상태를 여기서 되돌리면 안 된다
      if (generation === generationRef.current) {
        inFlightRef.current = false
        setSendingIndex(-1)
      }
    }
  }

  return {
    statusOf,
    errorOf,
    started,
    sendingIndex,
    inFlight: sendingIndex >= 0,
    sendingRowRef,
    run,
    markDone,
    reset,
  }
}
