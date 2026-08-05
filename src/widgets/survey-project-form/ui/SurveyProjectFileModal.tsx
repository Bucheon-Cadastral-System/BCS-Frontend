import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { SurveyProjectDraft } from '@/entities/survey-project'
import { ImportPreviewList, NO_FILES, SEND_LABEL, SendMark, blockingReasonOf, hasRowErrors, rowIssueLines, summaryOf, useImportPreviews, useSequentialSend } from '@/features/import-file'
import type { ReadFile, SendStatus } from '@/features/import-file'
import { today } from '@/shared/lib/date'
import { fileBaseName } from '@/shared/lib/file'
import { percent } from '@/shared/lib/percent'
import { PROGRESS_FILL } from '@/shared/ui/classes'
import { MODAL_CANCEL_BTN, MODAL_DANGER_BTN, MODAL_HEADER, MODAL_SUBMIT_BTN, Modal } from '@/shared/ui/Modal'
import { Spinner } from '@/shared/ui/Spinner'
import { FormNotice } from '@/shared/ui/FormNotice'
import { useFormNotice } from '@/shared/lib/useFormNotice'
import type { StatusShape, StatusTone } from '@/shared/ui/statusRow'
import { ProjectFields, trimmedOrNull } from './ProjectFields'

const UNSEEN_NOTICE = '아직 확인하지 않은 항목이 있습니다.'

/**
 * 만들 조사 하나 — 파일 하나가 조사 하나가 되고, 파일의 행이 그 조사의 대상이 된다.
 * 파일 없는 조사는 이 창에서 만들지 않는다(직접 생성 창이 대상 지정과 함께 맡는다).
 */
interface Entry {
  read: ReadFile
  draft: SurveyProjectDraft
  /** 등록하지 않기로 한 건. 목록에서 지우지 않고 표시만 바꿔 되돌릴 수 있게 둔다. */
  discarded: boolean
  /** 이 건을 지나쳤는지 — 다음으로 넘어갈 때만 선다. 건너뛰어 앞으로 가면 지나치지 않은 건은 그대로 남는다. */
  visited: boolean
}

/** 목록·확인 단계가 건을 부르는 이름 — 조사명을 아직 적지 않았으면 파일 이름을 빌려 쓴다 */
function entryLabel(entry: Entry): string {
  return entry.draft.name || entry.read.file.name || '정보 미입력'
}

/** 현황판 한 줄의 상태 */
type StepState = 'todo' | 'passed' | 'sending' | 'discarded' | 'done' | 'failed'

function stepState(entry: Entry, status: SendStatus): StepState {
  if (status === 'failed') return 'failed'
  if (status === 'done') return 'done'
  // 보내는 중은 지나온 건과 갈라야 한다 — 체크로 뭉개면 끝난 것처럼 읽힌다
  if (status === 'sending') return 'sending'
  if (entry.discarded) return 'discarded'
  return entry.visited ? 'passed' : 'todo'
}

/** 줄의 결과 — 왼쪽 막대의 점 모양과 오른쪽 문구를 함께 정한다 */
type StepLook = { tone: StatusTone; shape: StatusShape; label: string }

const STEP_LOOK: Record<Exclude<StepState, 'todo' | 'sending'>, StepLook> = {
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

/** 점의 색 — 결과의 성격을 그대로 따른다(끝난 건 청록, 폐기·실패는 붉은색, 나머지는 회색) */
const DOT_TONE: Record<StatusTone, string> = {
  none: 'border-idle text-ink-4',
  success: 'border-teal text-teal',
  caution: 'border-amber text-amber',
  danger: 'border-danger text-danger',
}

/** 다음 줄로 잇는 선 — 그 건의 결과를 그대로 물려받는다(끝난 건은 청록, 폐기·실패는 붉은색) */
const LINE_TONE: Record<StatusTone, string> = {
  none: 'bg-line-field',
  success: 'bg-teal',
  caution: 'bg-amber',
  danger: 'bg-danger',
}

/** 진행 막대의 점 — 지나온 건은 체크, 폐기는 X, 실패는 느낌표를 담고, 아직 결과가 없으면 비운다 */
function StepDot({ tone, shape, current }: { tone: StatusTone; shape: StatusShape | null; current: boolean }) {
  return (
    <span
      aria-hidden
      // 지금 보고 있는 줄에는 빛을 둘러 준다 — 이미 입력한 건으로 돌아왔을 때도 어디에 서 있는지 보이게
      className={`relative z-10 flex size-[14px] items-center justify-center rounded-full border-2 ${DOT_TONE[tone]} ${
        current ? 'step-current' : ''
      }`}
    >
      {shape !== null && (
        <svg viewBox="0 0 24 24" className="size-[9px]" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          {shape === 'cross' ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : shape === 'warn' ? (
            <path d="M12 5.5v8.5M12 18.5h.01" />
          ) : (
            <path d="m5 13 4 4L19 7" />
          )}
        </svg>
      )}
    </span>
  )
}

/**
 * 창 옆 현황판의 목록 — 점을 세로로 잇는 진행 막대다.
 * 왼쪽 막대가 어디까지 왔는지(이어진 청록 선)를 말하고, 오른쪽에 순번·이름·결과를 놓는다.
 * 지금 보고 있는 줄은 점의 테와 굵은 이름으로 나타내고, 누르면 그 건으로 옮겨 간다.
 */
function StepList(props: {
  entries: Entry[]
  /** 건별 전송 상태 — 목록은 건을 들고 전송 이력은 훅이 들므로 조회 함수로 잇는다 */
  statusOf: (index: number) => SendStatus
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
    <ul className="py-1.5">
      {props.entries.map((entry, i) => {
        const state = stepState(entry, props.statusOf(i))
        const look =
          state === 'todo' || state === 'sending'
            ? null
            : state === 'passed' && props.registering
              ? PASSED_WHILE_REGISTERING
              : STEP_LOOK[state]
        const isCurrent = i === props.current
        return (
          <li key={i}>
            <button
              ref={isCurrent ? currentRef : null}
              type="button"
              onClick={() => props.onJump(i)}
              disabled={props.disabled}
              aria-current={isCurrent}
              className="flex w-full items-center gap-[11px] px-5 py-2 text-left transition-colors enabled:hover:bg-hover"
            >
              <span className="relative flex size-[14px] shrink-0 items-center justify-center">
                {/* 다음 줄의 점까지 잇는 선. 줄 높이(34)에서 점(14)을 뺀 길이라 두 점 사이를 정확히 채운다.
                    색은 그 건의 결과를 따르므로, 어디까지 왔고 어디서 손을 뗐는지가 선만 훑어도 읽힌다. */}
                {i < props.entries.length - 1 && (
                  <span aria-hidden className={`absolute left-1/2 top-full h-5 w-0.5 -translate-x-1/2 ${LINE_TONE[look?.tone ?? 'none']}`} />
                )}
                {/* 지금 보고 있는 단계에서만 뒤에서 번지는 맥박 */}
                {isCurrent && <span aria-hidden className="step-pulse absolute inset-0 rounded-full bg-teal" />}
                {state === 'sending' ? (
                  // 보내는 중인 점은 등록 목록의 스피너와 같은 모양을 점 크기로 쓴다
                  <Spinner className="relative z-10 size-[14px]" />
                ) : (
                  <StepDot
                    // 아직 결과가 없어도 지금 보고 있는 줄은 청록으로 세운다
                    tone={look?.tone ?? (isCurrent ? 'success' : 'none')}
                    shape={look?.shape ?? null}
                    current={isCurrent}
                  />
                )}
              </span>
              <span className="flex min-w-0 flex-1 items-baseline gap-[7px]">
                <span className={`shrink-0 text-[11px] ${isCurrent ? 'text-teal-text' : 'text-ink-3'}`}>
                  {i + 1}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-[12px] ${
                    entry.discarded
                      ? 'text-ink-4 line-through'
                      : isCurrent
                        ? 'font-semibold text-ink'
                        : state === 'todo'
                          ? 'text-ink-3'
                          : 'text-ink-2'
                  }`}
                >
                  {entryLabel(entry)}
                </span>
                {/* 상태는 왼쪽 점이 말한다 — 글자로 한 번 더 적지 않고, 읽어 주는 이름으로만 남긴다 */}
                {state === 'sending' ? (
                  <span className="sr-only">{SEND_LABEL.sending}</span>
                ) : (
                  look !== null && <span className="sr-only">{look.label}</span>
                )}
              </span>
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
  return blockingReasonOf(entry.read) === undefined
}

/**
 * 파일로 프로젝트 추가 — 파일 하나가 조사 하나가 되고, 파일의 행이 그 조사의 대상이 된다.
 * 파일을 여러 개 올리면 만들 조사가 여러 건이 되어, 이전·다음으로 오가며 하나씩 입력한다.
 * 파일 없이 만드는 직접 생성은 별도 창이 맡는다 — 이 창은 파일에서 시작한다.
 */
export function SurveyProjectFileModal(props: {
  /** 작성자로 적힐 사람 — 화면 표시용이고, 실제 기록은 서버가 인증 주체로 남긴다 */
  author: string
  /** 창을 열면서 함께 건네받은 파일 — 곧바로 이 자리에서 읽는다. 없으면 파일 고르기부터 시작한다. */
  initialFiles?: File[] | null
  submitting: boolean
  /**
   * 한 건 등록. 여러 건을 등록할 때는 몇 번째인지 함께 알려, 받는 쪽이 알림을 건마다 띄우지 않게 한다.
   * 실패로 끝나면 그 건에 머문다.
   */
  onSubmit: (draft: SurveyProjectDraft, file: File, batch?: { index: number; total: number }) => Promise<void>
  /** 창이 막은 동작을 알린다 — 알림은 화면 전체를 아는 쪽이 띄운다 */
  onNotice: (message: string) => void
  onCancel: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 이 자리에서 읽는 중인 파일들
  const [reading, setReading] = useState<File[] | null>(
    props.initialFiles !== undefined && props.initialFiles !== null && props.initialFiles.length > 0
      ? props.initialFiles
      : null,
  )
  // 만들 조사 목록 — 파일을 읽어 넘기기 전에는 비어 있다(파일 고르기 화면)
  const [entries, setEntries] = useState<Entry[]>([])
  const [index, setIndex] = useState(0)
  // 마지막 건 다음에 오는 확인 단계 — 무엇을 등록하는지 훑어보고, 그 자리에서 등록 진행까지 본다
  const [confirming, setConfirming] = useState(false)
  const send = useSequentialSend('등록하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  const form = useFormNotice()

  const current: Entry | null = entries.length > 0 ? entries[index] : null
  const total = entries.length
  const isLast = index === total - 1
  const fileSummary = current !== null ? summaryOf(current.read) : undefined
  const fileError = current !== null ? blockingReasonOf(current.read) : undefined

  // 등록할 건 = 폐기하지 않았고 아직 보내지 않은 건
  const pendingIndexes = entries.flatMap((e, i) => (e.discarded || send.statusOf(i) === 'done' ? [] : [i]))
  const invalidIndex = pendingIndexes.find((i) => !entryValid(entries[i])) ?? null
  const busy = reading !== null || props.submitting
  const canRegister = pendingIndexes.length > 0 && invalidIndex === null && !busy
  const discardedCount = entries.filter((e) => e.discarded).length
  const failedIndex = entries.findIndex((_, i) => send.statusOf(i) === 'failed')
  const allDone = send.started && pendingIndexes.length === 0
  const doneCount = entries.filter((_, i) => send.statusOf(i) === 'done').length
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
    send.reset()
    setIndex(i)
  }

  /** 폐기하면 그 건은 볼 일이 없으므로 곧바로 다음으로 넘긴다. 되살리기는 그 자리에 남는다. */
  function toggleDiscard() {
    if (current === null) return
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

  /** 입력을 마친 건들을 차례로 등록한다 — 순차인 이유·실패 시 멈춤·재시도 규칙은 useSequentialSend가 갖는다. */
  function registerAll() {
    if (!canRegister) return
    void send.run(pendingIndexes, async (at, order, total) => {
      const entry = entries[at]
      await props.onSubmit(
        { ...entry.draft, name: entry.draft.name.trim(), note: trimmedOrNull(entry.draft.note ?? '') },
        entry.read.file,
        { index: order, total },
      )
    })
    // 끝나도 창을 닫지 않는다 — 무엇이 등록됐는지 확인하고 사용자가 닫는다
  }

  /** 창의 기본 동작(Enter 포함) — 파일 고르기에서는 선택 창을 열고, 확인 단계에서만 등록한다 */
  function handlePrimary() {
    if (showPicker) {
      openPicker()
      return
    }
    if (confirming) {
      if (!send.started) registerAll()
      return
    }
    if (busy || current === null) return
    // 폐기한 건은 등록하지 않으므로 값을 따지지 않는다
    if (!current.discarded) {
      if (!form.validate()) return
      if (fileError !== undefined) {
        // 사유는 파일 칸 아래에 이미 적혀 있다 — 여기서 되풀이하면 같은 말이 두 번 나온다
        form.fail('파일 오류를 확인해 주세요.')
        return
      }
    }
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

  // 보고 있는 건이 바뀌면 앞 건에서 세운 문구를 거둔다 — 값이 코드로 바뀌어 입력 이벤트가 나지 않는다
  const clearNotice = useEffectEvent(() => form.clear())
  useEffect(() => {
    clearNotice()
  }, [index])

  // 읽는 동안의 진행 상태 — 창을 새로 띄우지 않고 이 창 안에서 그대로 보여 준다
  const { entries: previews, finished } = useImportPreviews(reading ?? NO_FILES, 'survey-csv')
  const read = previews.flatMap((e) => (e.status.kind === 'done' ? [{ file: e.file, preview: e.status.preview }] : []))
  // 고칠 행이 남은 파일은 그대로 쓸 수 없다 — 다음 단계로 넘겨 봐야 등록에서 막히므로 여기서 가른다
  const usable = read.filter((r) => !hasRowErrors(r.preview))
  const blockedCount = read.length - usable.length
  const failedCount = previews.length - read.length

  /** 읽은 파일을 만들 조사 목록으로 바꾼다. 조사명은 파일 이름에서 시작해 건마다 고쳐 적는다. */
  function proceed(files: ReadFile[]) {
    setReading(null)
    if (files.length === 0) return
    setEntries(
      files.map((item) => ({
        read: item,
        draft: { name: fileBaseName(item.file.name), startedOn: today(), endedOn: null, note: null },
        discarded: false,
        visited: false,
      })),
    )
    setIndex(0)
    setConfirming(false)
    send.reset()
  }

  // 읽는 동안에는 늘 이 화면이다. 다 읽어도 저절로 넘어가지 않는다 —
  // 무엇을 읽었는지 확인하고 넘길지 다시 고를지는 사용자가 정한다.
  const readingDone = reading !== null && finished
  const showReading = reading !== null
  // 파일을 아직 고르지 않았다 — 이 창은 파일에서 시작하므로 고르기 화면이 첫 화면이다
  const showPicker = !showReading && entries.length === 0

  /** 창 위 어디에 떨어뜨리든, 눌러서 고르든 이 자리에서 읽는다 */
  function handleFiles(picked: File[]) {
    if (picked.length === 0) return
    setReading(picked)
  }

  const openPicker = () => fileInputRef.current?.click()

  // 읽는 중에는 만들 조사가 몇 건이 될지 아직 모른다 — 입력 칸을 띄워 봐야 어느 조사의 값인지 말할 수 없으므로
  // 읽기를 별도 단계로 두고 진행 상태만 보여 준다. 창은 그대로 두고 안쪽만 바꾼다.
  const readingBody = <ImportPreviewList entries={previews} />

  // 화면 전체 드롭 안내와 같은 모양 — 여기에 끌어다 놓아도 되고 눌러서 골라도 된다는 뜻
  const pickerBody = (
    <button
      type="button"
      onClick={openPicker}
      className="flex w-full flex-col items-center justify-center gap-1.5 rounded-ctl border-2 border-dashed border-line-field py-10 text-ink-4 transition-colors hover:border-teal-edge hover:text-teal-text"
    >
      <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      <span className="text-[13px] font-medium">파일을 끌어다 놓거나 눌러서 선택</span>
      <span className="text-[11px]">CSV · XLS · XLSX</span>
    </button>
  )

  // 입력 단계에서는 몇 번째를 보고 있는지가 곧 진행이고, 등록 단계에서는 손을 뗀 건수(등록·폐기)가 진행이다
  const boardPercent = confirming ? percent(doneCount + discardedCount, total) : percent(index + 1, total)

  // 현황판은 창 옆에 따로 세운다 — 건이 많을 때 본문에 두면 입력 칸이 화면 밖으로 밀려난다
  const board =
    total > 1 && !showReading ? (
      <>
        {/* 머리말·본문의 글자 크기와 여백은 창과 똑같이 쓴다 — 나란히 선 판이라 규격이 어긋나면 바로 보인다 */}
        <div className={MODAL_HEADER}>
          <h2 className="flex items-baseline gap-1.5 text-[15px] font-semibold text-ink">
            {confirming ? (
              // 등록이 진행되어도 숫자가 흔들리지 않도록 폐기하지 않은 건수로 센다
              `${total - discardedCount}건 등록, ${discardedCount}건 폐기`
            ) : (
              <>
                <span>
                  {total}건 중 <span className="text-teal-text">{index + 1}</span>번째
                </span>
                {discardedCount > 0 && (
                  <span className="text-[11.5px] text-ink-3">
                    폐기 {discardedCount}건
                  </span>
                )}
              </>
            )}
          </h2>
          {/* 막대는 그 단계가 얼마나 남았는지를 말한다 —
              입력 단계에서는 지금 보고 있는 자리, 확인·등록 단계에서는 마무리한 건수(등록·폐기)다. */}
          <div className="mt-[11px] flex items-center gap-2">
            <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-track">
              <span
                className={`block h-full rounded-full transition-[width] duration-200 ${PROGRESS_FILL}`}
                style={{ width: `${boardPercent}%` }}
              />
            </span>
            <span className="text-[11px] font-medium text-teal-text">{boardPercent}%</span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <StepList
            entries={entries}
            statusOf={send.statusOf}
            current={confirming ? (send.sendingIndex >= 0 ? send.sendingIndex : null) : index}
            registering={send.started}
            disabled={busy || send.started}
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
      <p className="text-[12.5px] text-ink-3">
        {allDone
          ? `${doneCount}건을 등록했습니다.`
          : send.started
            ? `${doneCount}건 등록, ${pendingIndexes.length}건 남음`
            : `${pendingIndexes.length}건을 등록합니다.`}
        {discardedCount > 0 &&
          (send.started ? ` 폐기한 ${discardedCount}건은 등록하지 않았습니다.` : ` 폐기한 ${discardedCount}건은 등록하지 않습니다.`)}
      </p>
      {!send.started && entries.every((e) => e.discarded) && (
        <p className="rounded-chip bg-soft px-2.5 py-1.5 text-[12px] text-ink-3">
          모두 폐기해 등록할 프로젝트가 없습니다.
        </p>
      )}
      {!send.started && invalidIndex !== null && (
        <p className="text-[12px] text-danger">
          {invalidIndex + 1}번째에 비어 있는 항목이 있습니다.{' '}
          <button type="button" className="underline underline-offset-2" onClick={() => jumpToEntry(invalidIndex)}>
            그 건으로 이동
          </button>
        </p>
      )}
      <ul className="space-y-2">
        {entries.map((entry, i) => {
          const status = send.statusOf(i)
          const error = send.errorOf(i)
          return (
            <li
              key={i}
              ref={i === send.sendingIndex ? send.sendingRowRef : null}
              className={`rounded-chip text-[12.5px] ${i === send.sendingIndex ? 'bg-teal-wash px-2 py-1.5' : ''}`}
            >
              <div className="flex items-center gap-2">
                <SendMark status={status} discarded={entry.discarded} />
                <span
                  className={`min-w-0 flex-1 truncate ${
                    entry.discarded ? 'text-ink-4 line-through' : 'text-ink-2'
                  }`}
                >
                  {entryLabel(entry)}
                </span>
                <span className="shrink-0 text-[11px] text-ink-3">
                  {entry.discarded ? '폐기' : SEND_LABEL[status]}
                </span>
              </div>
              {error !== undefined && (
                <p className="mt-0.5 break-keep pl-6 text-[11px] leading-[1.5] wrap-anywhere text-danger">{error}</p>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )

  const formBody = current !== null && (
    <>
      {current.discarded && (
        <p className="rounded-chip bg-danger-wash px-2.5 py-1.5 text-[12px] text-danger">
          폐기한 건이므로 등록되지 않습니다.
        </p>
      )}

      <ProjectFields draft={current.draft} author={props.author} onPatch={patch} />

      {/* 파일은 이 건의 대상 그 자체라 여기서 뺄 수 없다 — 이 파일로 만들지 않으려면 건을 폐기한다 */}
      <div>
        <span className="mb-1.5 block text-[11px] font-medium tracking-[.08em] text-ink-3">대상지 파일</span>
        <span className="flex items-center gap-2 rounded-ctl border border-line-field bg-field px-2.5 py-2">
          <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">
            {current.read.file.name}
            {fileSummary && (
              <span className="ml-1.5 text-[11px] text-ink-3">{fileSummary}</span>
            )}
          </span>
        </span>
        {fileError && (
          <div className="mt-1.5 rounded-ctl border border-danger-btn-edge bg-danger-wash px-2.5 py-2">
            <p className="text-[11.5px] leading-5 text-danger">{fileError}</p>
            {/* 고쳐야 할 행은 한 줄에 하나씩 — 이어 붙이면 어디서 끊어 읽어야 할지 알 수 없다 */}
            <ul className="mt-1.5 space-y-[3px] text-[11px] leading-[1.5] text-danger">
              {rowIssueLines(current.read.preview.errors).map((line) => (
                <li key={line} className="flex gap-1.5">
                  <span aria-hidden>·</span>
                  <span className="min-w-0 flex-1">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )

  return (
    <Modal
      // 제목은 지금 어느 화면인지만 말한다 — 진행 상태는 본문이 알린다
      title={confirming ? '프로젝트 등록' : showReading ? '프로젝트 대상지 파일 읽기' : '파일로 프로젝트 추가'}
      aside={board}
      formRef={form.formRef}
      busy={send.inFlight || reading !== null}
      onClose={props.onCancel}
      onSubmit={handlePrimary}
      onDropFile={confirming ? undefined : handleFiles}
      footer={
        confirming ? (
          <>
            {/* 등록을 시작하기 전에는 되돌릴 수 있어 취소, 시작한 뒤에는 앞서 보낸 건이 서버에 남아 되돌릴 수 없다 */}
            <button type="button" className={MODAL_CANCEL_BTN} onClick={props.onCancel} disabled={send.inFlight}>
              {send.started ? '닫기' : '취소'}
            </button>
            {!send.started && (
              <button
                type="button"
                className={`${MODAL_CANCEL_BTN} ml-auto`}
                onClick={() => setConfirming(false)}
              >
                이전
              </button>
            )}
            {!send.started && (
              <button type="submit" className={MODAL_SUBMIT_BTN} disabled={!canRegister}>
                {total > 1 ? `${pendingIndexes.length}건 추가` : '추가'}
              </button>
            )}
            {send.started && failedIndex >= 0 && (
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
            <span className="flex-1 self-center pl-1 text-[12px] text-ink-3">
              {readingDone
                ? [
                    `${usable.length}건 성공`,
                    blockedCount > 0 ? `${blockedCount}건 등록 불가` : '',
                    failedCount > 0 ? `${failedCount}건 실패` : '',
                  ]
                    .filter(Boolean)
                    .join(', ')
                : ''}
            </span>
            {/* 읽는 동안에도 자리는 지킨다 — 다 읽은 순간 버튼이 새로 생기면 누르려던 자리가 밀린다 */}
            <button type="button" className={MODAL_CANCEL_BTN} onClick={openPicker} disabled={!readingDone}>
              다른 파일 선택
            </button>
            <button
              type="button"
              className={MODAL_SUBMIT_BTN}
              onClick={() => proceed(usable)}
              disabled={!readingDone || usable.length === 0}
            >
              {readingDone ? (
                `${usable.length}건 입력하기`
              ) : (
                <span className="flex items-center gap-1.5">
                  <Spinner className="size-3.5" current />
                  읽는 중
                </span>
              )}
            </button>
          </>
        ) : showPicker ? (
          <>
            <button type="button" className={MODAL_DANGER_BTN} onClick={props.onCancel}>
              취소
            </button>
            <button type="submit" className={`${MODAL_SUBMIT_BTN} ml-auto`}>
              파일 선택
            </button>
          </>
        ) : (
        <>
          <button type="button" className={MODAL_DANGER_BTN} onClick={props.onCancel} disabled={props.submitting}>
            취소
          </button>
          {total > 1 && (
            <button type="button" className={MODAL_DANGER_BTN} onClick={toggleDiscard} disabled={busy}>
              {current?.discarded ? '되살리기' : '폐기'}
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <FormNotice message={form.notice} />
            {index > 0 && (
              <button type="button" className={MODAL_CANCEL_BTN} onClick={() => setIndex((i) => i - 1)} disabled={busy}>
                이전
              </button>
            )}
            <button type="submit" className={MODAL_SUBMIT_BTN} disabled={busy}>
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
        accept=".csv,.xls,.xlsx,text/csv"
        multiple
        hidden
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? [])
          e.target.value = '' // 같은 파일을 다시 골라도 change 가 나게 비운다
          handleFiles(picked)
        }}
      />
      {confirming ? confirmBody : showReading ? readingBody : showPicker ? pickerBody : formBody}
    </Modal>
  )
}
