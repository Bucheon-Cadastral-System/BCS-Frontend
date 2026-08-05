import { useMemo, useState } from 'react'
import type { SurveyProject, SurveyProjectDraft } from '@/entities/survey-project'
import type { ControlPoint } from '@/entities/control-point'
import { MODAL_DANGER_BTN, MODAL_SUBMIT_BTN, Modal } from '@/shared/ui/Modal'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { FormNotice } from '@/shared/ui/FormNotice'
import { useFormNotice } from '@/shared/lib/useFormNotice'
import { formatDate } from '@/shared/lib/date'
import { ProjectFields, isPeriodReversed, trimmedOrNull } from './ProjectFields'
import { TargetPicker } from './TargetPicker'

/**
 * 프로젝트 수정 — 이름·기간·비고와 대상 기준점을 함께 고친다.
 * 대상 목록은 수정 후의 전체를 다시 보내는 재지정이라, 여기서 뺀 점의 조사 기록은 서버가 함께 지운다.
 * 그래서 기록 있는 점이 빠지면 저장 전에 알린다 — 지워지는 것을 알고 누르게.
 */
export function SurveyProjectEditModal(props: {
  project: SurveyProject
  /** 작성자로 적힐 사람 — 화면 표시용이고, 실제 기록은 서버가 인증 주체로 남긴다 */
  author: string
  /** 대상으로 고를 수 있는 전체 기준점 */
  points: ControlPoint[]
  /** 지금 지정돼 있는 대상 — 고르기의 시작값 */
  initialTargetIds: string[]
  /** 조사 기록이 있는 점 — 대상에서 빼면 그 기록도 지워지므로 미리 알린다 */
  recordedPointIds: ReadonlySet<string>
  submitting: boolean
  onSubmit: (draft: SurveyProjectDraft, targetPointIds: string[]) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<SurveyProjectDraft>({
    name: props.project.name,
    startedOn: props.project.startedOn,
    endedOn: props.project.endedOn,
    note: props.project.note,
  })
  const [selected, setSelected] = useState<Set<string>>(() => new Set(props.initialTargetIds))
  // 저장 전 확인 — 무엇이 바뀌는지 요약을 보이고 확정을 받는다. null 이면 아직 묻지 않은 상태
  const [confirming, setConfirming] = useState<{
    draft: SurveyProjectDraft
    targetPointIds: string[]
    changes: EditChanges
  } | null>(null)
  const form = useFormNotice()

  // 기록은 이 프로젝트의 대상에만 남으므로, 기록 집합에서 빠진 것만 세면 된다
  const removedRecordedCount = useMemo(
    () => [...props.recordedPointIds].filter((id) => !selected.has(id)).length,
    [props.recordedPointIds, selected],
  )

  function patch(change: Partial<SurveyProjectDraft>) {
    setDraft((cur) => ({ ...cur, ...change }))
  }

  /** 무엇이 바뀌는지 — 요약 창이 항목별로 색을 달리 입히므로 문장이 아니라 구조로 계산한다 */
  function computeChanges(next: SurveyProjectDraft, targetPointIds: string[]): EditChanges {
    const before = props.project
    const period = (startedOn: string, endedOn: string | null) =>
      `${formatDate(startedOn)} ~ ${endedOn === null ? '' : formatDate(endedOn)}`
    const wasTarget = new Set(props.initialTargetIds)
    const isTarget = new Set(targetPointIds)
    return {
      name: next.name !== before.name ? [before.name, next.name] : null,
      period:
        next.startedOn !== before.startedOn || (next.endedOn ?? null) !== (before.endedOn ?? null)
          ? [period(before.startedOn, before.endedOn), period(next.startedOn, next.endedOn)]
          : null,
      noteChanged: (next.note ?? null) !== (before.note ?? null),
      added: targetPointIds.filter((id) => !wasTarget.has(id)).length,
      removed: props.initialTargetIds.filter((id) => !isTarget.has(id)).length,
      removedRecorded: removedRecordedCount,
    }
  }

  function submit() {
    if (props.submitting) return
    if (!form.validate()) return
    // required 는 공백만 친 값을 유효로 본다 — 다듬은 이름이 비면 여기서 막는다
    if (draft.name.trim() === '') {
      form.fail('프로젝트명을 입력해 주세요.')
      return
    }
    if (isPeriodReversed(draft)) {
      // 사유는 날짜 칸 아래에 이미 적혀 있다 — 여기서는 제출이 막혔음을 알린다
      form.fail('조사 기간을 확인해 주세요.')
      return
    }
    if (selected.size === 0) {
      form.fail('대상 기준점을 1점 이상 지정해 주세요.')
      return
    }
    const next = { ...draft, name: draft.name.trim(), note: trimmedOrNull(draft.note ?? '') }
    const targetPointIds = [...selected]
    const changes = computeChanges(next, targetPointIds)
    const hasChanges =
      changes.name !== null || changes.period !== null || changes.noteChanged || changes.added > 0 || changes.removed > 0
    // 바뀐 것이 없으면 물을 것도 없다 — 그대로 저장(서버에 무해)
    if (!hasChanges) {
      props.onSubmit(next, targetPointIds)
      return
    }
    setConfirming({ draft: next, targetPointIds, changes })
  }

  return (
    <Modal
      title="프로젝트 수정"
      formRef={form.formRef}
      busy={props.submitting}
      onClose={props.onCancel}
      onSubmit={submit}
      footer={
        <>
          {/* 입력을 버리는 취소 — 직접 생성·기준점 폼과 같은 규격 */}
          <button type="button" className={MODAL_DANGER_BTN} onClick={props.onCancel} disabled={props.submitting}>
            취소
          </button>
          <div className="ml-auto flex items-center gap-3">
            <FormNotice message={form.notice} />
            <button type="submit" className={MODAL_SUBMIT_BTN} disabled={props.submitting}>
              {props.submitting ? '저장 중…' : '저장'}
            </button>
          </div>
        </>
      }
    >
      <ProjectFields draft={draft} author={props.author} onPatch={patch} />
      <div>
        <TargetPicker points={props.points} selected={selected} onChange={setSelected} />
        {/* 막지 않는다 — 지워지는 것을 알리고, 되돌리려면 다시 선택하면 된다 */}
        {removedRecordedCount > 0 && (
          <p className="mt-1.5 break-keep text-[11px] leading-[1.5] text-amber">
            조사 기록이 있는 기준점 {removedRecordedCount}점이 대상에서 제외되었습니다. 저장하면 해당 기준점의 조사
            기록도 함께 삭제됩니다.
          </p>
        )}
      </div>
      {/* 저장 확인 — 무엇이 바뀌는지 요약을 보이고 확정을 받는다. 기록 삭제가 걸리면 빨강으로 묻는다 */}
      {confirming !== null && (
        <ConfirmDialog
          message="변경 내용을 저장할까요?"
          detail={<ChangeSummary changes={confirming.changes} />}
          confirmLabel="저장"
          danger={confirming.changes.removedRecorded > 0}
          busy={props.submitting}
          busyLabel="저장 중…"
          onConfirm={() => props.onSubmit(confirming.draft, confirming.targetPointIds)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </Modal>
  )
}

/** 수정으로 무엇이 바뀌는지 — 요약 창이 색을 입히므로 문자열이 아니라 구조로 들고 다닌다 */
interface EditChanges {
  /** [이전, 이후] — 안 바뀌었으면 null */
  name: [string, string] | null
  period: [string, string] | null
  noteChanged: boolean
  added: number
  removed: number
  /** 대상에서 빠지며 함께 지워질 조사 기록 수 */
  removedRecorded: number
}

/** 변경 요약 — 늘어나는 것(추가)은 청록, 지워지는 것(제외·기록 삭제)은 빨강으로 가른다 */
function ChangeSummary({ changes }: { changes: EditChanges }) {
  return (
    <>
      {changes.name !== null && (
        <span className="block">
          이름: {changes.name[0]} → {changes.name[1]}
        </span>
      )}
      {changes.period !== null && (
        <span className="block">
          기간: {changes.period[0]} → {changes.period[1]}
        </span>
      )}
      {changes.noteChanged && <span className="block">비고 변경</span>}
      {(changes.added > 0 || changes.removed > 0) && (
        <span className="block">
          대상 기준점:{' '}
          {changes.added > 0 && (
            <>
              추가 <b className="font-semibold text-teal-text">{changes.added}</b>개
            </>
          )}
          {changes.added > 0 && changes.removed > 0 && ' · '}
          {changes.removed > 0 && (
            <>
              제외 <b className="font-semibold text-danger">{changes.removed}</b>개
            </>
          )}
        </span>
      )}
      {changes.removedRecorded > 0 && (
        <span className="block text-danger">제외되는 기준점의 조사 기록 {changes.removedRecorded}개 삭제</span>
      )}
    </>
  )
}
