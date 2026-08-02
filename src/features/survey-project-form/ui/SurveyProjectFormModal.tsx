import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { MOCK_CURRENT_USER } from '@/entities/user'
import type { SurveyProjectDraft } from '@/entities/survey-project'
import { ImportPreviewList, blockingReasonOf, summaryOf, useImportPreviews } from '@/features/import-survey-csv'
import { ApiError } from '@/shared/api/http'
import type { ReadFile } from '@/features/import-survey-csv'
import { today } from '@/shared/lib/date'
import { fileBaseName } from '@/shared/lib/file'
import { MODAL_CANCEL_BTN, MODAL_DANGER_BTN, MODAL_INPUT, MODAL_SUBMIT_BTN, Modal, ModalField } from '@/shared/ui/Modal'
import { STATUS_ROW, STATUS_ROW_TONE } from '@/shared/ui/statusRow'
import { StatusIcon } from '@/shared/ui/StatusIcon'
import type { StatusShape, StatusTone } from '@/shared/ui/statusRow'

/** 읽을 파일이 없을 때 넘기는 고정 배열 — 참조가 바뀌면 훅이 처음부터 다시 읽는다 */
const NO_FILES: File[] = []

/**
 * 날짜 칸이 받을 수 있는 범위.
 * 상한을 두지 않으면 브라우저가 연도를 여섯 자리(최대 275760년)까지 받을 수 있다고 보고,
 * 네 자리를 친 뒤에도 다음 칸으로 넘기지 않는다. 그래서 `20260803` 을 이어 치면 연도에 `202608` 이 들어간다.
 */
const DATE_MIN = '1900-01-01'
const DATE_MAX = '2999-12-31'

const UNSEEN_NOTICE = '아직 확인하지 않은 항목이 있습니다.'

const trimmedOrNull = (v: string) => (v.trim() === '' ? null : v.trim())
/** 날짜 칸은 값이 'YYYY-MM-DD' 아니면 빈 문자열이라 다듬을 것이 없다 */
const emptyToNull = (v: string) => (v === '' ? null : v)

/** 만들 조사 하나 — 파일이 붙어 있으면 그 파일로 대상을 지정하고, 없으면 이름만 있는 조사가 된다. */
interface Entry {
  read: ReadFile | null
  draft: SurveyProjectDraft
  /** 등록하지 않기로 한 건. 목록에서 지우지 않고 표시만 바꿔 되돌릴 수 있게 둔다. */
  discarded: boolean
  /** 이 건을 지나쳤는지 — 다음으로 넘어갈 때만 선다. 건너뛰어 앞으로 가면 지나치지 않은 건은 그대로 남는다. */
  visited: boolean
  /** 등록 단계에서의 상태. done 은 이미 서버에 있으므로 다시 보내지 않는다. */
  status: 'idle' | 'sending' | 'done' | 'failed'
  /** 실패 사유 — 어느 건이 왜 안 됐는지 목록에서 바로 보이게 들고 있는다 */
  error?: string
}

function newEntry(defaults?: Partial<SurveyProjectDraft>): Entry {
  return {
    read: null,
    discarded: false,
    visited: false,
    status: 'idle',
    draft: {
      name: defaults?.name ?? '',
      // 조사는 만드는 날부터 시작하는 것이 보통이라 시작일은 오늘로 연다
      startedOn: defaults?.startedOn ?? today(),
      endedOn: defaults?.endedOn ?? null,
      note: defaults?.note ?? null,
    },
  }
}

const SEND_LABEL: Record<Entry['status'], string> = {
  idle: '대기',
  sending: '등록 중',
  done: '완료',
  failed: '실패',
}

/** 확인·등록 목록의 건별 상태 표시 — 폐기는 회색 X, 실패는 붉은 느낌표로 가른다 */
function SendMark(props: { status: Entry['status']; discarded: boolean; started: boolean }) {
  const { status, discarded, started } = props
  if (discarded) {
    return (
      <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" role="img" aria-label="폐기">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    )
  }
  if (!started) {
    return <span className="size-4 shrink-0 rounded-full border-2 border-gray-300 dark:border-gray-500" aria-hidden />
  }
  if (status === 'sending') {
    return <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" role="img" aria-label="등록 중" />
  }
  if (status === 'idle') {
    return <span className="size-4 shrink-0" aria-hidden />
  }
  const done = status === 'done'
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-4 shrink-0 ${done ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={done ? '완료' : '실패'}
    >
      {done ? (
        <path d="m5 13 4 4L19 7" />
      ) : (
        <>
          <path d="M12 4 2.5 20h19L12 4z" />
          <path d="M12 10v3.5M12 17h.01" />
        </>
      )}
    </svg>
  )
}

/** 현황판 한 줄의 상태 */
type StepState = 'todo' | 'passed' | 'discarded' | 'done' | 'failed'

function stepState(entry: Entry): StepState {
  if (entry.status === 'failed') return 'failed'
  if (entry.status === 'done') return 'done'
  if (entry.discarded) return 'discarded'
  return entry.visited ? 'passed' : 'todo'
}

/** 줄의 바탕과 표시 — 파일 읽기 목록과 같은 사양을 그대로 쓴다 */
type StepLook = { tone: StatusTone; shape: StatusShape; label: string }

const STEP_LOOK: Record<Exclude<StepState, 'todo'>, StepLook> = {
  passed: { tone: 'success', shape: 'check', label: '입력함' },
  done: { tone: 'success', shape: 'check', label: '등록 완료' },
  discarded: { tone: 'danger', shape: 'cross', label: '폐기' },
  failed: { tone: 'danger', shape: 'warn', label: '등록 실패' },
}

/**
 * 등록을 시작한 뒤의 '입력함' — 초록은 등록을 마친 줄에만 쓴다.
 * 입력 단계에서는 초록이 '이 건은 봤다'는 뜻이지만, 등록 단계에서는 '서버에 올라갔다'는 뜻이라 섞이면 안 된다.
 */
const PASSED_WHILE_REGISTERING: StepLook = { tone: 'none', shape: 'muted-check', label: '등록 대기' }

/**
 * 창 옆 현황판의 목록. 파일 읽기 목록과 같은 짜임이다 —
 * 판 너비를 다 쓰는 줄에 순번·이름·상태를 놓고, 결과가 난 줄은 바탕을 옅게 물들인다.
 * 지금 보고 있는 줄은 왼쪽 띠와 바탕으로 나타내고, 누르면 그 건으로 옮겨 간다.
 */
function StepList(props: {
  entries: Entry[]
  /** 지금 보고 있는 건. 확인 단계면 없다 */
  current: number | null
  /** 등록을 시작했는지 — 시작 뒤에는 초록을 등록을 마친 줄에만 쓴다 */
  registering: boolean
  disabled: boolean
  onJump: (i: number) => void
}) {
  // 건이 많으면 판이 스크롤되므로, 지금 보고 있는 줄이 화면 밖에 있으면 끌어온다
  const currentRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' })
  }, [props.current])

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
      {props.entries.map((entry, i) => {
        const state = stepState(entry)
        const look =
          state === 'todo' ? null : state === 'passed' && props.registering ? PASSED_WHILE_REGISTERING : STEP_LOOK[state]
        const isCurrent = i === props.current
        return (
          <li key={i}>
            <button
              ref={isCurrent ? currentRef : null}
              type="button"
              onClick={() => props.onJump(i)}
              disabled={props.disabled}
              aria-current={isCurrent}
              // 바탕색은 곧바로 바뀌어야 한다 — 서서히 물들이면 다음으로 넘어간 뒤에도 한 박자 늦게 따라오는 것처럼 보인다
              className={`${STATUS_ROW} border-l-2 text-[12px] ${
                isCurrent
                  ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-500/15'
                  : `border-l-transparent ${look === null ? '' : STATUS_ROW_TONE[look.tone]}`
              }`}
            >
              <span className="w-5 shrink-0 tabular-nums text-gray-400 dark:text-gray-500">{i + 1}</span>
              <span
                className={`min-w-0 flex-1 truncate ${
                  entry.discarded
                    ? 'text-gray-400 line-through dark:text-gray-500'
                    : 'text-gray-800 dark:text-gray-100'
                }`}
              >
                {entry.draft.name || entry.read?.file.name || '이름 없음'}
              </span>
              {look !== null && <StatusIcon shape={look.shape} label={look.label} />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** 등록할 수 있는 값인지 — 폐기한 건은 보내지 않으므로 검사하지 않는다. */
function entryValid(entry: Entry): boolean {
  const { name, startedOn, endedOn } = entry.draft
  if (name.trim() === '' || startedOn === '') return false
  if (endedOn !== null && endedOn < startedOn) return false
  return entry.read === null || blockingReasonOf(entry.read) === undefined
}

/**
 * 조사 프로젝트 입력 — 기준점 목록 불러오기도 결국 조사를 만드는 일이라 한 창에서 처리한다.
 * 파일을 여러 개 올리면 만들 조사가 여러 건이 되고, 이전·다음으로 오가며 하나씩 입력한다.
 * 조사 유형은 받지 않는다. 조사마다 그때그때 이름을 붙이는 값이라
 * 되풀이되는 분류로 쓸 수 없고, 조사명이 그 역할을 대신한다.
 */
export function SurveyProjectFormModal(props: {
  title: string
  submitLabel: string
  defaults?: Partial<SurveyProjectDraft>
  /** 창을 열면서 함께 건네받은 파일 — 곧바로 이 자리에서 읽는다 */
  initialFiles?: File[] | null
  /** 입력하던 값을 알린다 — 창 밖(화면 전체)에 파일을 떨어뜨렸을 때도 이어 쓸 수 있게 */
  onDraftChange?: (draft: SurveyProjectDraft) => void
  submitting: boolean
  /**
   * 한 건 등록. 여러 건을 등록할 때는 몇 번째인지 함께 알려, 받는 쪽이 알림을 건마다 띄우지 않게 한다.
   * 실패로 끝나면 그 건에 머문다.
   */
  onSubmit: (draft: SurveyProjectDraft, file: File | null, batch?: { index: number; total: number }) => Promise<void>
  /** 창이 막은 동작을 알린다 — 알림은 화면 전체를 아는 쪽이 띄운다 */
  onNotice: (message: string) => void
  onCancel: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 이 자리에서 읽는 중인 파일들
  const [reading, setReading] = useState<File[] | null>(props.initialFiles ?? null)
  // 만들 조사 목록 — 파일을 안 올렸으면 이름만 있는 한 건이다
  const [entries, setEntries] = useState<Entry[]>([newEntry(props.defaults)])
  const [index, setIndex] = useState(0)
  // 마지막 건 다음에 오는 확인 단계 — 무엇을 등록하는지 훑어보고, 그 자리에서 등록 진행까지 본다
  const [confirming, setConfirming] = useState(false)
  const [started, setStarted] = useState(false)

  const current = entries[index]
  const total = entries.length
  const isLast = index === total - 1
  const file = current.read?.file ?? null
  const fileSummary = current.read ? summaryOf(current.read) : undefined
  const fileError = current.read ? blockingReasonOf(current.read) : undefined

  const periodReversed = current.draft.endedOn !== null && current.draft.endedOn < current.draft.startedOn
  // 등록할 건 = 폐기하지 않았고 아직 보내지 않은 건
  const pendingIndexes = entries.flatMap((e, i) => (e.discarded || e.status === 'done' ? [] : [i]))
  const invalidIndex = pendingIndexes.find((i) => !entryValid(entries[i])) ?? null
  const busy = reading !== null || props.submitting
  const canAdvance = (current.discarded || entryValid(current)) && !busy
  const canRegister = pendingIndexes.length > 0 && invalidIndex === null && !busy
  const discardedCount = entries.filter((e) => e.discarded).length
  const sendingIndex = entries.findIndex((e) => e.status === 'sending')
  const inFlight = sendingIndex >= 0
  const failedIndex = entries.findIndex((e) => e.status === 'failed')
  // 등록은 위에서부터 차례로 올라가므로 지금 보내는 줄이 화면 밖으로 나간다 — 목록이 그 줄을 따라간다
  const sendingRowRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    sendingRowRef.current?.scrollIntoView({ block: 'center' })
  }, [sendingIndex])
  const allDone = started && pendingIndexes.length === 0
  const doneCount = entries.filter((e) => e.status === 'done').length
  /** 아직 보지 않은 건이 남았는지 — 지금 건은 넘어가는 길에 확인한 것으로 친다 */
  function hasUnseen(): boolean {
    return entries.some((e, i) => i !== index && !e.visited && !e.discarded)
  }

  /** 지금 건을 지나친 것으로 표시한다 — 다음으로 넘어가는 길에서만 부른다 */
  function markVisited(at: number) {
    setEntries((cur) => cur.map((e, i) => (i === at ? { ...e, visited: true } : e)))
  }

  function patch(change: Partial<SurveyProjectDraft>) {
    setEntries((cur) => cur.map((e, i) => (i === index ? { ...e, draft: { ...e.draft, ...change } } : e)))
  }

  /** 막대의 점을 눌러 그 건으로 — 확인 단계에서 눌렀으면 입력으로 돌아간다 */
  function jumpToEntry(i: number) {
    setConfirming(false)
    setStarted(false)
    setIndex(i)
  }

  /** 폐기하면 그 건은 볼 일이 없으므로 곧바로 다음으로 넘긴다. 되살리기는 그 자리에 남는다. */
  function toggleDiscard() {
    const revive = current.discarded
    setEntries((cur) => cur.map((e, i) => (i === index ? { ...e, discarded: !e.discarded, visited: true } : e)))
    if (revive) return
    if (!isLast) {
      setIndex((i) => i + 1)
      return
    }
    if (hasUnseen()) {
      props.onNotice(UNSEEN_NOTICE)
      return
    }
    setConfirming(true)
  }

  /**
   * 입력을 마친 건을 한 번에 등록한다.
   * 서버는 한 요청에 조사 하나만 받으므로 차례로 보낸다 — 조사는 달라도 기준점 마스터는 함께 쓰므로,
   * 같은 관리번호가 두 파일에 있으면 동시에 보낼 때 둘 다 새 점으로 판단한다.
   * 도중에 실패하면 그 건에 멈춘다. 앞서 보낸 건은 이미 서버에 있어 되돌릴 수 없으므로 다시 보내지 않는다.
   */
  async function registerAll() {
    if (!canRegister) return
    const targets = pendingIndexes
    setStarted(true)
    setEntries((cur) => cur.map((e, i) => (targets.includes(i) ? { ...e, status: 'idle', error: undefined } : e)))
    for (const [order, at] of targets.entries()) {
      const entry = entries[at]
      setEntries((cur) => cur.map((e, i) => (i === at ? { ...e, status: 'sending' } : e)))
      try {
        await props.onSubmit(
          { ...entry.draft, name: entry.draft.name.trim(), note: trimmedOrNull(entry.draft.note ?? '') },
          entry.read?.file ?? null,
          { index: order, total: targets.length },
        )
      } catch (e) {
        // 여기서 멈춘다. 앞서 보낸 건은 이미 서버에 있어 되돌릴 수 없으므로 다시 보내지 않는다.
        const reason = e instanceof ApiError ? e.message : '등록하지 못했습니다.'
        setEntries((cur) => cur.map((entry2, i) => (i === at ? { ...entry2, status: 'failed', error: reason } : entry2)))
        return
      }
      setEntries((cur) => cur.map((e, i) => (i === at ? { ...e, status: 'done' } : e)))
    }
    // 끝나도 창을 닫지 않는다 — 무엇이 등록됐는지 확인하고 사용자가 닫는다
  }

  /** 창의 기본 동작(Enter 포함) — 확인 단계에서만 등록하고, 그 전에는 다음으로 넘어간다 */
  function handlePrimary() {
    if (confirming) {
      if (!started) void registerAll()
      return
    }
    if (!canAdvance) return
    markVisited(index)
    if (!isLast) {
      setIndex((i) => i + 1)
      return
    }
    // 건너뛰어 앞으로 온 경우 아직 보지 않은 건이 남는다 — 모두 확인한 뒤에야 등록으로 넘어간다
    if (hasUnseen()) {
      props.onNotice(UNSEEN_NOTICE)
      return
    }
    setConfirming(true)
  }

  // 값이 바뀔 때마다 바깥에 알린다 — 받는 쪽이 ref 에 담으므로 이 알림이 다시 그림을 부르지 않는다
  const notifyDraft = useEffectEvent((draft: SurveyProjectDraft) => props.onDraftChange?.(draft))
  useEffect(() => {
    notifyDraft(current.draft)
  }, [current.draft])

  // 읽는 동안의 진행 상태 — 창을 새로 띄우지 않고 이 창 안에서 그대로 보여 준다
  const { entries: previews, finished } = useImportPreviews(reading ?? NO_FILES)
  const read = previews.flatMap((e) => (e.status.kind === 'done' ? [{ file: e.file, preview: e.status.preview }] : []))
  const failedCount = previews.length - read.length

  /** 읽은 파일을 만들 조사 목록으로 바꾼다. 조사명이 비어 있으면 파일 이름을 빌려 쓴다. */
  function proceed(files: ReadFile[]) {
    setReading(null)
    if (files.length === 0) return
    const base = current.draft
    setEntries(
      files.map((item, i) => ({
        read: item,
        // 첫 건에는 적어 두던 이름을 살리고, 나머지는 파일 이름을 쓴다
        draft: { ...base, name: i === 0 && base.name.trim() !== '' ? base.name : fileBaseName(item.file.name) },
        discarded: false,
        visited: false,
        status: 'idle' as const,
      })),
    )
    setIndex(0)
  }

  // 읽는 동안에는 늘 이 화면이다. 다 읽어도 저절로 넘어가지 않는다 —
  // 무엇을 읽었는지 확인하고 넘길지 다시 고를지는 사용자가 정한다.
  const readingDone = reading !== null && finished
  const showReading = reading !== null


  /** 창 위 어디에 떨어뜨리든, 눌러서 고르든 이 자리에서 읽는다 */
  function handleFiles(picked: File[]) {
    if (picked.length === 0) return
    setReading(picked)
  }

  const openPicker = () => fileInputRef.current?.click()

  /** 파일을 뺀다 — 그 건은 이름만 있는 조사가 된다(대상 없이 만들어 나중에 채울 수 있다). */
  function detachFile() {
    setEntries((cur) => cur.map((e, i) => (i === index ? { ...e, read: null } : e)))
  }

  // 읽는 중에는 만들 조사가 몇 건이 될지 아직 모른다 — 입력 칸을 띄워 봐야 어느 조사의 값인지 말할 수 없으므로
  // 읽기를 별도 단계로 두고 진행 상태만 보여 준다. 창은 그대로 두고 안쪽만 바꾼다.
  const readingBody = <ImportPreviewList entries={previews} />

  // 현황판은 창 옆에 따로 세운다 — 건이 많을 때 본문에 두면 입력 칸이 화면 밖으로 밀려난다
  const board =
    total > 1 && !showReading ? (
      <>
        {/* 머리말·본문의 글자 크기와 여백은 창과 똑같이 쓴다 — 나란히 선 판이라 규격이 어긋나면 바로 보인다 */}
        <div className="border-b-2 border-gray-200 px-5 pb-3.5 pt-5 dark:border-gray-700">
          <h2 className="flex items-baseline gap-1.5 text-[15px] font-semibold text-gray-900 dark:text-gray-100">
            {confirming ? (
              // 등록이 진행되어도 숫자가 흔들리지 않도록 폐기하지 않은 건수로 센다
              `${total - discardedCount}건 등록, ${discardedCount}건 폐기`
            ) : (
              <>
                <span>
                  {total}건 중 <span className="text-blue-600 dark:text-blue-400">{index + 1}</span>번째
                </span>
                {discardedCount > 0 && (
                  <span className="text-[12px] font-normal text-gray-500 dark:text-gray-400">
                    폐기 {discardedCount}건
                  </span>
                )}
              </>
            )}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <StepList
            entries={entries}
            current={confirming ? (sendingIndex >= 0 ? sendingIndex : null) : index}
            registering={started}
            disabled={busy || started}
            onJump={jumpToEntry}
          />
        </div>
      </>
    ) : null

  /**
   * 마지막 확인 — 무엇이 등록되고 무엇이 빠지는지 훑어본 뒤 여기서 등록을 시작한다.
   * 등록은 건마다 서버 응답을 기다리므로 같은 목록에 진행 상태를 채워 창이 멈춘 것처럼 보이지 않게 한다.
   */
  const confirmBody = (
    <>
      <p className="text-[13px] text-gray-600 dark:text-gray-300">
        {allDone
          ? `${doneCount}건을 등록했습니다.`
          : started
            ? `${doneCount}건 등록, ${pendingIndexes.length}건 남음`
            : `${pendingIndexes.length}건을 등록합니다.`}
        {discardedCount > 0 &&
          (started ? ` 폐기한 ${discardedCount}건은 등록하지 않았습니다.` : ` 폐기한 ${discardedCount}건은 등록하지 않습니다.`)}
      </p>
      {!started && entries.every((e) => e.discarded) && (
        <p className="rounded-md bg-gray-100 px-2.5 py-1.5 text-[12px] text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
          모두 폐기해 등록할 프로젝트가 없습니다.
        </p>
      )}
      {!started && invalidIndex !== null && (
        <p className="text-[12px] text-red-600 dark:text-red-400">
          {invalidIndex + 1}번째에 채우지 않은 값이 있습니다.{' '}
          <button type="button" className="underline underline-offset-2" onClick={() => jumpToEntry(invalidIndex)}>
            그 건으로 이동
          </button>
        </p>
      )}
      <ul className="space-y-2">
        {entries.map((entry, i) => (
          <li
            key={i}
            ref={i === sendingIndex ? sendingRowRef : null}
            className={`rounded-md text-[13px] ${i === sendingIndex ? 'bg-blue-50 px-2 py-1.5 dark:bg-blue-500/15' : ''}`}
          >
            <div className="flex items-center gap-2">
              <SendMark status={entry.status} discarded={entry.discarded} started={started} />
              <span
                className={`min-w-0 flex-1 truncate ${
                  entry.discarded ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'
                }`}
              >
                {entry.draft.name}
              </span>
              <span className="shrink-0 text-[11px] text-gray-500 dark:text-gray-400">
                {entry.discarded ? '폐기' : started ? SEND_LABEL[entry.status] : '등록 예정'}
              </span>
            </div>
            {entry.error !== undefined && (
              <p className="mt-0.5 pl-6 text-[11px] text-red-600 dark:text-red-400">{entry.error}</p>
            )}
          </li>
        ))}
      </ul>
    </>
  )

  const formBody = (
    <>
      {current.discarded && (
        <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">
          폐기한 건이므로 등록되지 않습니다.
        </p>
      )}

      <ModalField label="조사명" required>
        <input
          className={MODAL_INPUT}
          value={current.draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="2026.7.1.자 조사"
          required
        />
      </ModalField>

      {/* 시작일만 필수라 별표가 정확히 그 칸에 붙도록 두 항목으로 나눈다 */}
      <div>
        <div className="grid grid-cols-2 gap-2">
          <ModalField label="조사 시작일" required>
            <input
              type="date"
              className={MODAL_INPUT}
              value={current.draft.startedOn}
              min={DATE_MIN}
              max={current.draft.endedOn ?? DATE_MAX}
              onChange={(e) => patch({ startedOn: e.target.value })}
              required
            />
          </ModalField>
          <ModalField label="조사 종료일">
            <input
              type="date"
              className={MODAL_INPUT}
              value={current.draft.endedOn ?? ''}
              min={current.draft.startedOn || DATE_MIN}
              max={DATE_MAX}
              onChange={(e) => patch({ endedOn: emptyToNull(e.target.value) })}
            />
          </ModalField>
        </div>
        {periodReversed && (
          <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">종료일이 시작일보다 빠릅니다.</p>
        )}
      </div>

      {/* 작성자는 로그인한 사람으로 정해지므로 고르지 않는다. 실제 기록은 서버가 인증 주체로 남긴다. */}
      <ModalField label="작성자" required>
        <input
          className={`${MODAL_INPUT} cursor-default bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400`}
          value={`${MOCK_CURRENT_USER.name} · ${MOCK_CURRENT_USER.team} ${MOCK_CURRENT_USER.position}`}
          readOnly
          tabIndex={-1}
        />
      </ModalField>

      <ModalField label="비고">
        <textarea
          className={`${MODAL_INPUT} h-20 resize-none`}
          value={current.draft.note ?? ''}
          onChange={(e) => patch({ note: e.target.value })}
          placeholder="조사 범위·참고 사항"
        />
      </ModalField>

      {/* 이 칸만 label 을 쓰지 않는다 — 라벨을 누르면 안쪽 버튼이 함께 눌려 파일 선택이 두 번 열린다 */}
      <div>
        <span className="mb-1 block text-[12px] font-medium text-gray-700 dark:text-gray-300">기준점 목록 파일</span>
        {file ? (
          <span className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-2.5 py-1.5 dark:border-gray-600 dark:bg-gray-900/40">
            <span className="min-w-0 flex-1 truncate text-[13px] text-gray-800 dark:text-gray-200">
              {file.name}
              {fileSummary && (
                <span className="ml-1.5 text-[11px] text-gray-500 dark:text-gray-400">{fileSummary}</span>
              )}
            </span>
            {/* 빼면 대상 없이 이름만 있는 조사가 된다 — 대상은 나중에 다시 올려 채울 수 있다 */}
            <button
              type="button"
              onClick={detachFile}
              aria-label="파일 빼기"
              className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16" />
                <path d="M10 11v6M14 11v6" />
                <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </span>
        ) : (
          // 화면 전체 드롭 안내와 같은 모양 — 여기에 끌어다 놓아도 되고 눌러서 골라도 된다는 뜻
          <button
            type="button"
            onClick={openPicker}
            className="flex w-full flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-gray-300 py-5 text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-400 dark:hover:text-blue-300"
          >
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            <span className="text-[13px] font-medium">파일을 끌어다 놓거나 눌러서 선택</span>
            <span className="text-[11px]">CSV · XLSX</span>
          </button>
        )}
        {fileError && <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{fileError}</p>}
      </div>
    </>
  )

  return (
    <Modal
      // 제목은 지금 어느 화면인지만 말한다 — 진행 상태는 본문이 알린다
      title={confirming ? '프로젝트 등록' : showReading ? '기준점 목록 파일 업로드' : props.title}
      aside={board}
      busy={inFlight || reading !== null}
      onClose={props.onCancel}
      onSubmit={handlePrimary}
      onDropFile={confirming ? undefined : handleFiles}
      footer={
        confirming ? (
          <>
            <button type="button" className={MODAL_CANCEL_BTN} onClick={props.onCancel} disabled={inFlight}>
              닫기
            </button>
            {!started && (
              <button
                type="button"
                className={`${MODAL_CANCEL_BTN} ml-auto`}
                onClick={() => setConfirming(false)}
              >
                이전
              </button>
            )}
            {!started && (
              <button type="submit" className={MODAL_SUBMIT_BTN} disabled={!canRegister}>
                {total > 1 ? `${pendingIndexes.length}건 ${props.submitLabel}` : props.submitLabel}
              </button>
            )}
            {started && failedIndex >= 0 && (
              <button type="button" className={MODAL_SUBMIT_BTN} onClick={() => jumpToEntry(failedIndex)}>
                고치러 가기
              </button>
            )}
          </>
        ) : showReading ? (
          <>
            <button type="button" className={MODAL_DANGER_BTN} onClick={props.onCancel}>
              취소
            </button>
            {/* 남는 자리를 안내가 차지해 취소는 왼쪽, 나머지 선택지는 오른쪽에 붙는다 */}
            <span className="flex-1 self-center pl-1 text-[12px] text-gray-500 dark:text-gray-400">
              {readingDone ? `${read.length}건 성공${failedCount > 0 ? `, ${failedCount}건 실패` : ''}` : ''}
            </span>
            {/* 읽는 동안에도 자리는 지킨다 — 다 읽은 순간 버튼이 새로 생기면 누르려던 자리가 밀린다 */}
            <button type="button" className={MODAL_CANCEL_BTN} onClick={openPicker} disabled={!readingDone}>
              다른 파일 선택
            </button>
            <button
              type="button"
              className={MODAL_SUBMIT_BTN}
              onClick={() => proceed(read)}
              disabled={!readingDone || read.length === 0}
            >
              {readingDone ? (
                `${read.length}건 입력하기`
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                  읽는 중
                </span>
              )}
            </button>
          </>
        ) : (
        <>
          <button type="button" className={MODAL_DANGER_BTN} onClick={props.onCancel} disabled={props.submitting}>
            취소
          </button>
          {total > 1 && (
            <button type="button" className={MODAL_DANGER_BTN} onClick={toggleDiscard} disabled={busy}>
              {current.discarded ? '되살리기' : '폐기'}
            </button>
          )}
          <div className="ml-auto flex gap-2">
            {index > 0 && (
              <button type="button" className={MODAL_CANCEL_BTN} onClick={() => setIndex((i) => i - 1)} disabled={busy}>
                이전
              </button>
            )}
            <button type="submit" className={MODAL_SUBMIT_BTN} disabled={!canAdvance}>
              다음
            </button>
          </div>
        </>
        )
      }
    >
      {/* 파일 입력은 단계와 무관하게 한 곳에만 둔다 — 단계마다 따로 두면 ref 가 가리키던 입력이 사라져
          '눌러서 고르기'가 아무 일도 하지 않는다.
          감춰져 있어도 마지막 자식이면 본문의 항목 간격이 아래쪽에 한 번 더 붙으므로 맨 앞에 둔다. */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,text/csv"
        multiple
        hidden
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? [])
          e.target.value = '' // 같은 파일을 다시 골라도 change 가 나게 비운다
          handleFiles(picked)
        }}
      />
      {confirming ? confirmBody : showReading ? readingBody : formBody}
    </Modal>
  )
}
