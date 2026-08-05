import { useState } from 'react'
import type { SurveyProject, SurveyProjectDraft } from '@/entities/survey-project'
import { MODAL_DANGER_BTN, MODAL_SUBMIT_BTN, Modal } from '@/shared/ui/Modal'
import { FormNotice } from '@/shared/ui/FormNotice'
import { useFormNotice } from '@/shared/lib/useFormNotice'
import { ProjectFields, isPeriodReversed, trimmedOrNull } from './ProjectFields'

/** 프로젝트 수정 — 이름·기간·비고를 고친다. 대상 기준점은 여기서 바꾸지 않는다. */
export function SurveyProjectEditModal(props: {
  project: SurveyProject
  /** 작성자로 적힐 사람 — 화면 표시용이고, 실제 기록은 서버가 인증 주체로 남긴다 */
  author: string
  submitting: boolean
  onSubmit: (draft: SurveyProjectDraft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<SurveyProjectDraft>({
    name: props.project.name,
    startedOn: props.project.startedOn,
    endedOn: props.project.endedOn,
    note: props.project.note,
  })
  const form = useFormNotice()

  function patch(change: Partial<SurveyProjectDraft>) {
    setDraft((cur) => ({ ...cur, ...change }))
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
    props.onSubmit({ ...draft, name: draft.name.trim(), note: trimmedOrNull(draft.note ?? '') })
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
    </Modal>
  )
}
