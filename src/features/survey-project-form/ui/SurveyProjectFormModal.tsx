import { useEffect, useRef, useState } from 'react'
import { MOCK_CURRENT_USER } from '@/entities/user'
import type { SurveyProjectDraft } from '@/entities/survey-project'
import { today } from '@/shared/lib/date'
import { fileBaseName } from '@/shared/lib/file'
import { MODAL_CANCEL_BTN, MODAL_INPUT, MODAL_SUBMIT_BTN, Modal, ModalField } from '@/shared/ui/Modal'

const trimmedOrNull = (v: string) => (v.trim() === '' ? null : v.trim())

/**
 * 조사 프로젝트 입력 — 대상지 파일 불러오기도 결국 조사를 만드는 일이라 한 폼에서 처리한다.
 * 파일을 붙이면 그 파일로 대상을 지정하고, 붙이지 않으면 빈 조사가 만들어진다.
 * 조사 유형(굴착협의·일제조사 등)은 받지 않는다. 조사마다 그때그때 이름을 붙이는 값이라
 * 되풀이되는 분류로 쓸 수 없고, 조사명이 그 역할을 대신한다.
 */
export function SurveyProjectFormModal(props: {
  title: string
  description?: string
  submitLabel: string
  defaults?: Partial<SurveyProjectDraft>
  /** 화면에 떨어뜨린 파일 — 바뀔 때마다 이 폼에 붙는다(창이 열려 있는 동안 다시 떨어뜨려도 갈아 끼워진다) */
  attachedFile?: File | null
  /** 파일을 여러 개 올렸을 때 몇 번째를 입력하는 중인지 */
  step?: { current: number; total: number }
  /** 미리 읽어 둔 파일이면 그 요약 — 대상이 몇 건인지 보고 확인할 수 있다 */
  fileSummary?: string
  /** 파일 때문에 등록할 수 없는 이유 — 있으면 등록을 막고 사유를 보여 준다 */
  fileError?: string
  /**
   * 읽어 둔 파일 중 이것만 건너뛴다.
   * 건너뛸 수 있다는 것은 그 파일이 이 단계의 주제라는 뜻이라, 이때는 파일을 바꾸거나 뺄 수 없다.
   */
  onSkip?: () => void
  /** 파일을 고르면 읽어 보는 단계로 넘긴다 — 입력하던 값도 함께 넘겨 첫 조사에 이어 쓴다 */
  onPickFiles?: (files: File[], draft: SurveyProjectDraft) => void
  submitting: boolean
  onSubmit: (draft: SurveyProjectDraft, file: File | null) => void
  onCancel: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(props.attachedFile ?? null)
  const [name, setName] = useState(
    props.defaults?.name ?? (props.attachedFile ? fileBaseName(props.attachedFile.name) : ''),
  )
  // 조사는 만드는 날부터 시작하는 것이 보통이라 시작일은 오늘로 연다
  const [startedOn, setStartedOn] = useState(props.defaults?.startedOn ?? today())
  const [endedOn, setEndedOn] = useState(props.defaults?.endedOn ?? '')
  const [note, setNote] = useState(props.defaults?.note ?? '')

  const periodReversed = endedOn !== '' && endedOn < startedOn
  const fileLocked = props.onSkip !== undefined
  const canSubmit =
    name.trim() !== '' && startedOn !== '' && !periodReversed && !props.fileError && !props.submitting

  function currentDraft(): SurveyProjectDraft {
    return {
      name: name.trim(),
      startedOn,
      endedOn: trimmedOrNull(endedOn),
      note: trimmedOrNull(note),
    }
  }

  function submit() {
    if (!canSubmit) return
    props.onSubmit(
      {
        name: name.trim(),
        startedOn,
        endedOn: trimmedOrNull(endedOn),
        note: trimmedOrNull(note),
      },
      file,
    )
  }

  // 조사명을 아직 안 적었으면 파일 이름을 빌려 쓴다(적어 둔 이름은 건드리지 않는다)
  function attach(picked: File) {
    setFile(picked)
    setName((cur) => (cur.trim() === '' ? fileBaseName(picked.name) : cur))
  }

  // 창이 열려 있는 동안 화면에 떨어뜨린 파일도 받는다. 창을 다시 만들면 입력하던 값이 날아가므로 파일만 갈아 끼운다.
  const attachRef = useRef(attach)
  useEffect(() => {
    attachRef.current = attach
  })
  const attachedFile = props.attachedFile ?? null
  useEffect(() => {
    if (attachedFile) attachRef.current(attachedFile)
  }, [attachedFile])

  return (
    <Modal
      title={props.step ? `${props.title} (${props.step.current} / ${props.step.total})` : props.title}
      description={props.description}
      busy={props.submitting}
      onClose={props.onCancel}
      onSubmit={submit}
      footer={
        <>
          <button
            type="button"
            // 여러 파일을 넘기는 중이면 이 버튼은 한 건이 아니라 남은 전부를 접는다 — 건너뛰기와 떼어 놓는다
            className={`${MODAL_CANCEL_BTN} ${fileLocked ? 'mr-auto' : ''}`}
            onClick={props.onCancel}
            disabled={props.submitting}
          >
            {fileLocked ? '전체 중단' : '취소'}
          </button>
          {props.onSkip && (
            <button type="button" className={MODAL_CANCEL_BTN} onClick={props.onSkip} disabled={props.submitting}>
              건너뛰기
            </button>
          )}
          <button type="submit" className={MODAL_SUBMIT_BTN} disabled={!canSubmit}>
            {props.submitting ? '처리 중…' : props.submitLabel}
          </button>
        </>
      }
    >
      <ModalField label="조사명" required>
        <input
          className={MODAL_INPUT}
          value={name}
          onChange={(e) => setName(e.target.value)}
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
              value={startedOn}
              max={endedOn || undefined}
              onChange={(e) => setStartedOn(e.target.value)}
              required
            />
          </ModalField>
          <ModalField label="조사 종료일">
            <input
              type="date"
              className={MODAL_INPUT}
              value={endedOn}
              min={startedOn || undefined}
              onChange={(e) => setEndedOn(e.target.value)}
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
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="굴착 협의 요청에 따른 대상지 조사"
        />
      </ModalField>

      <ModalField label="대상지 파일">
        {file ? (
          <span className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-2.5 py-1.5 dark:border-gray-600 dark:bg-gray-900/40">
            <span className="min-w-0 flex-1 truncate text-[13px] text-gray-800 dark:text-gray-200">
              {file.name}
              {props.fileSummary && (
                <span className="ml-1.5 text-[11px] text-gray-500 dark:text-gray-400">{props.fileSummary}</span>
              )}
            </span>
            {/* 읽어 둔 파일은 요약이 그 파일의 것이므로 갈아 끼우지 않는다 — 빼려면 건너뛰기로 */}
            {!fileLocked && (
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label="대상지 파일 빼기"
                className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h16" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                  <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            )}
          </span>
        ) : (
          <button type="button" className={MODAL_CANCEL_BTN} onClick={() => fileInputRef.current?.click()}>
            파일 선택
          </button>
        )}
        {props.fileError && (
          <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{props.fileError}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,text/csv"
          multiple
          hidden
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? [])
            e.target.value = '' // 같은 파일을 다시 골라도 change 가 나게 비운다
            if (picked.length === 0) return
            // 고른 파일은 곧장 붙이지 않고 읽어 보는 단계를 거친다 — 드롭과 같은 흐름
            if (props.onPickFiles) props.onPickFiles(picked, currentDraft())
            else attach(picked[0])
          }}
        />
      </ModalField>
    </Modal>
  )
}
