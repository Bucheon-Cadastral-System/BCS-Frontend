import { useState } from 'react'
import { SURVEY_PROJECT_TYPE_LABEL } from '@/entities/survey-project'
import type { SurveyProjectType } from '@/entities/survey-project'
import { MODAL_CANCEL_BTN, MODAL_INPUT, MODAL_SUBMIT_BTN, Modal, ModalField } from '@/shared/ui/Modal'
import { selectCls } from '@/shared/ui/classes'

const TYPES: SurveyProjectType[] = ['GENERAL', 'EXCAVATION_CONSULTATION']

/** 조사 프로젝트 이름·유형 입력 — 새 조사 만들기와 대상지 CSV 업로드가 같은 폼을 쓴다. */
export function SurveyProjectFormModal(props: {
  title: string
  description?: string
  submitLabel: string
  defaultName?: string
  submitting: boolean
  onSubmit: (values: { name: string; type: SurveyProjectType }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(props.defaultName ?? '')
  const [type, setType] = useState<SurveyProjectType>('GENERAL')

  const canSubmit = name.trim() !== '' && !props.submitting

  function submit() {
    if (!canSubmit) return
    props.onSubmit({ name: name.trim(), type })
  }

  return (
    <Modal
      title={props.title}
      description={props.description}
      busy={props.submitting}
      onClose={props.onCancel}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className={MODAL_CANCEL_BTN} onClick={props.onCancel} disabled={props.submitting}>
            취소
          </button>
          <button type="submit" className={MODAL_SUBMIT_BTN} disabled={!canSubmit}>
            {props.submitting ? '처리 중…' : props.submitLabel}
          </button>
        </>
      }
    >
      <ModalField label="조사 이름" hint="예: 2026.7.1.자 조사">
        <input className={MODAL_INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="2026.7.1.자 조사" />
      </ModalField>

      <ModalField label="유형" hint="조사를 하게 된 계기입니다. 파일 서식과는 별개입니다.">
        <select className={selectCls} value={type} onChange={(e) => setType(e.target.value as SurveyProjectType)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {SURVEY_PROJECT_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </ModalField>
    </Modal>
  )
}
