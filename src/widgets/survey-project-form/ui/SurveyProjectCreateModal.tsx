import { useState } from 'react'
import type { SurveyProjectDraft } from '@/entities/survey-project'
import type { ControlPoint } from '@/entities/control-point'
import { today } from '@/shared/lib/date'
import { Modal } from '@/shared/ui/Modal'
import { FormActions } from '@/shared/ui/FormActions'
import { FormNotice } from '@/shared/ui/FormNotice'
import { useFormNotice } from '@/shared/lib/useFormNotice'
import { ProjectFields, isPeriodReversed, trimmedOrNull } from './ProjectFields'
import { TargetPicker } from './TargetPicker'

/**
 * 프로젝트 직접 생성 — 값 입력과 대상 기준점 지정을 한 창에서 마친다.
 * 프로젝트는 점을 지정해 조사 여부를 적는 단위라 대상 없이 만들 수 없다(최소 1점).
 * 파일에 적힌 점들로 만들 때는 파일 등록 창을 쓴다 — 이 창은 파일을 받지 않는다.
 */
export function SurveyProjectCreateModal(props: {
  /** 작성자로 적힐 사람 — 화면 표시용이고, 실제 기록은 서버가 인증 주체로 남긴다 */
  author: string
  /** 대상으로 고를 수 있는 전체 기준점 */
  points: ControlPoint[]
  submitting: boolean
  onSubmit: (draft: SurveyProjectDraft, targetPointIds: string[]) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<SurveyProjectDraft>({
    // 조사는 만드는 날부터 시작하는 것이 보통이라 시작일은 오늘로 연다
    name: '',
    startedOn: today(),
    endedOn: null,
    note: null,
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())
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
      form.fail('프로젝트 기간을 확인해 주세요.')
      return
    }
    if (selected.size === 0) {
      form.fail('대상 기준점을 1점 이상 지정해 주세요.')
      return
    }
    props.onSubmit({ ...draft, name: draft.name.trim(), note: trimmedOrNull(draft.note ?? '') }, [...selected])
  }

  return (
    <Modal
      title="프로젝트 추가"
      formRef={form.formRef}
      busy={props.submitting}
      onClose={props.onCancel}
      onSubmit={submit}
      footer={
        <FormActions
          submitType="submit"
          submitLabel={selected.size > 0 ? `대상 ${selected.size}점으로 등록` : '등록'}
          busyLabel="등록 중"
          busy={props.submitting}
          onCancel={props.onCancel}
          notice={<FormNotice message={form.notice} />}
        />
      }
    >
      <ProjectFields draft={draft} author={props.author} onPatch={patch} />
      <TargetPicker points={props.points} selected={selected} onChange={setSelected} />
    </Modal>
  )
}
