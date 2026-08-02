import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { MOCK_CURRENT_USER } from '@/entities/user'
import type { SurveyProjectDraft } from '@/entities/survey-project'
import { ImportPreviewList, blockingReasonOf, summaryOf, useImportPreviews } from '@/features/import-survey-csv'
import type { ReadFile } from '@/features/import-survey-csv'
import { today } from '@/shared/lib/date'
import { fileBaseName } from '@/shared/lib/file'
import { MODAL_CANCEL_BTN, MODAL_INPUT, MODAL_SUBMIT_BTN, Modal, ModalField } from '@/shared/ui/Modal'

/** 읽을 파일이 없을 때 넘기는 고정 배열 — 참조가 바뀌면 훅이 처음부터 다시 읽는다 */
const NO_FILES: File[] = []

/**
 * 읽기 화면을 이만큼 늦게 띄운다 — 파일이 작으면 읽기가 순식간이라, 바로 띄우면 한 프레임 스치고 사라져 깜빡인다.
 * 이 시간 안에 끝나면 아예 안 보이고 입력 화면으로 곧장 이어진다.
 */
const READING_SHOW_DELAY_MS = 250
/** 한번 띄웠으면 최소한 이만큼은 남긴다 — 뜨자마자 사라지면 그것대로 깜빡임이다 */
const READING_MIN_VISIBLE_MS = 450

/**
 * 입력값을 저장 형태로 바꾼다 — 미기재는 빈 문자열이 아니라 null 이다.
 * 치는 도중이 아니라 보낼 때만 부른다: 입력할 때마다 다듬으면 방금 친 글자가 화면에서 되돌려져
 * 끝에 띄어쓰기를 넣을 수 없고, 한글 조합이 끊겨 지우기가 낱자가 아닌 글자 단위로 동작한다.
 */
/**
 * 날짜 칸이 받을 수 있는 범위.
 * 상한을 두지 않으면 브라우저가 연도를 여섯 자리(최대 275760년)까지 받을 수 있다고 보고,
 * 네 자리를 친 뒤에도 다음 칸으로 넘기지 않는다. 그래서 `20260803` 을 이어 치면 연도에 `202608` 이 들어간다.
 */
const DATE_MIN = '1900-01-01'
const DATE_MAX = '2999-12-31'

const trimmedOrNull = (v: string) => (v.trim() === '' ? null : v.trim())
/** 날짜 칸은 값이 'YYYY-MM-DD' 아니면 빈 문자열이라 다듬을 것이 없다 */
const emptyToNull = (v: string) => (v === '' ? null : v)

/** 만들 조사 하나 — 파일이 붙어 있으면 그 파일로 대상을 지정하고, 없으면 이름만 있는 조사가 된다. */
interface Entry {
  read: ReadFile | null
  draft: SurveyProjectDraft
}

function newEntry(defaults?: Partial<SurveyProjectDraft>): Entry {
  return {
    read: null,
    draft: {
      name: defaults?.name ?? '',
      // 조사는 만드는 날부터 시작하는 것이 보통이라 시작일은 오늘로 연다
      startedOn: defaults?.startedOn ?? today(),
      endedOn: defaults?.endedOn ?? null,
      note: defaults?.note ?? null,
    },
  }
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
  /** 한 건 등록. 성공으로 끝나야 다음 건으로 넘어간다 — 실패하면 그 자리에 남아 다시 시도할 수 있다. */
  onSubmit: (draft: SurveyProjectDraft, file: File | null) => Promise<void>
  onCancel: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 이 자리에서 읽는 중인 파일들
  const [reading, setReading] = useState<File[] | null>(props.initialFiles ?? null)
  // 만들 조사 목록 — 파일을 안 올렸으면 이름만 있는 한 건이다
  const [entries, setEntries] = useState<Entry[]>([newEntry(props.defaults)])
  const [index, setIndex] = useState(0)

  const current = entries[index]
  const total = entries.length
  const file = current.read?.file ?? null
  const fileSummary = current.read ? summaryOf(current.read) : undefined
  const fileError = current.read ? blockingReasonOf(current.read) : undefined

  const periodReversed = current.draft.endedOn !== null && current.draft.endedOn < current.draft.startedOn
  const canSubmit =
    current.draft.name.trim() !== '' &&
    current.draft.startedOn !== '' &&
    !periodReversed &&
    !fileError &&
    !reading &&
    !props.submitting

  function patch(change: Partial<SurveyProjectDraft>) {
    setEntries((cur) => cur.map((e, i) => (i === index ? { ...e, draft: { ...e.draft, ...change } } : e)))
  }

  async function submit() {
    if (!canSubmit) return
    try {
      await props.onSubmit(
        { ...current.draft, name: current.draft.name.trim(), note: trimmedOrNull(current.draft.note ?? '') },
        file,
      )
    } catch {
      // 실패는 페이지가 알린다. 이 건은 지우지 않고 그 자리에 남겨 고쳐 다시 보낼 수 있게 한다.
      return
    }
    // 등록을 마친 건은 목록에서 빼고 남은 건으로 넘어간다. 마지막이었으면 창을 닫는다.
    if (total === 1) {
      props.onCancel()
      return
    }
    setEntries((cur) => cur.filter((_, i) => i !== index))
    setIndex((i) => Math.min(i, total - 2))
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
      })),
    )
    setIndex(0)
  }

  // 다 읽었고 실패가 없으면 곧바로 입력으로 넘어간다.
  // read 는 렌더마다 새 배열이라 의존성에 넣으면 매번 다시 실행된다 — 완료 신호만 보고, 값은 부를 때 읽는다.
  const proceedWithRead = useEffectEvent(() => proceed(read))
  useEffect(() => {
    if (!reading || !finished || failedCount > 0) return
    proceedWithRead()
  }, [reading, finished, failedCount])

  // 읽기 화면은 '늦게 띄우고, 띄웠으면 잠깐 남긴다' — 짧은 읽기에서 화면이 깜빡이지 않게
  const [readingVisible, setReadingVisible] = useState(false)
  const shownAtRef = useRef(0)
  useEffect(() => {
    if (reading) {
      const timer = setTimeout(() => {
        shownAtRef.current = Date.now()
        setReadingVisible(true)
      }, READING_SHOW_DELAY_MS)
      return () => clearTimeout(timer)
    }
    if (!readingVisible) return
    const remain = READING_MIN_VISIBLE_MS - (Date.now() - shownAtRef.current)
    if (remain <= 0) {
      setReadingVisible(false)
      return
    }
    const timer = setTimeout(() => setReadingVisible(false), remain)
    return () => clearTimeout(timer)
  }, [reading, readingVisible])

  // 읽다가 실패한 파일이 있으면 사용자가 고를 때까지 멈춰 있으므로 지연과 무관하게 보여 준다
  const showReading = readingVisible || (reading !== null && finished && failedCount > 0)


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
  const readingBody = (
    <>
      <ImportPreviewList entries={previews} />
      {finished && failedCount > 0 && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-red-600 dark:text-red-400">{failedCount}개를 읽지 못했습니다</span>
          <div className="flex gap-2">
            <button type="button" className={MODAL_CANCEL_BTN} onClick={openPicker}>
              다른 파일 선택
            </button>
            {read.length > 0 && (
              <button type="button" className={MODAL_SUBMIT_BTN} onClick={() => proceed(read)}>
                {read.length}건 입력하기
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )

  const formBody = (
    <>
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
      title={showReading ? '기준점 목록 읽는 중' : total > 1 ? `${props.title} (${index + 1} / ${total})` : props.title}
      busy={props.submitting || reading !== null}
      onClose={props.onCancel}
      onSubmit={submit}
      onDropFile={handleFiles}
      footer={
        <>
          <button type="button" className={MODAL_CANCEL_BTN} onClick={props.onCancel} disabled={props.submitting}>
            취소
          </button>
          {!showReading && total > 1 && (
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                className={MODAL_CANCEL_BTN}
                onClick={() => setIndex((i) => i - 1)}
                disabled={index === 0 || props.submitting}
              >
                이전
              </button>
              <button
                type="button"
                className={MODAL_CANCEL_BTN}
                onClick={() => setIndex((i) => i + 1)}
                disabled={index === total - 1 || props.submitting}
              >
                다음
              </button>
            </div>
          )}
          {!showReading && (
            <button type="submit" className={MODAL_SUBMIT_BTN} disabled={!canSubmit}>
              {props.submitting ? '처리 중…' : props.submitLabel}
            </button>
          )}
        </>
      }
    >
      {showReading ? readingBody : formBody}
      {/* 파일 입력은 단계와 무관하게 한 곳에만 둔다 — 단계마다 따로 두면 ref 가 가리키던 입력이 사라져
          '눌러서 고르기'가 아무 일도 하지 않는다. */}
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
    </Modal>
  )
}
