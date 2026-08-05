import type { SurveyProjectDraft } from '@/entities/survey-project'
import { MODAL_INPUT, MODAL_READONLY, MODAL_TEXTAREA, ModalField } from '@/shared/ui/Modal'

/**
 * 날짜 칸이 받을 수 있는 범위.
 * 상한을 두지 않으면 브라우저가 연도를 여섯 자리(최대 275760년)까지 받을 수 있다고 보고,
 * 네 자리를 친 뒤에도 다음 칸으로 넘기지 않는다. 그래서 `20260803` 을 이어 치면 연도에 `202608` 이 들어간다.
 */
export const DATE_MIN = '1900-01-01'
export const DATE_MAX = '2999-12-31'

export const trimmedOrNull = (v: string) => (v.trim() === '' ? null : v.trim())
/** 날짜 칸은 값이 'YYYY-MM-DD' 아니면 빈 문자열이라 다듬을 것이 없다 */
const emptyToNull = (v: string) => (v === '' ? null : v)

/** 종료일이 시작일보다 빠른지 — 칸 아래 문구와 제출 차단이 같은 판정을 쓴다 */
export function isPeriodReversed(draft: SurveyProjectDraft): boolean {
  return draft.endedOn !== null && draft.endedOn < draft.startedOn
}

/**
 * 프로젝트 값 입력 칸 — 직접 생성·수정·파일 등록이 같은 칸을 쓴다.
 * 작성자는 고르지 않는다. 화면 표시용이고 실제 기록은 서버가 인증 주체로 남긴다.
 */
export function ProjectFields(props: {
  draft: SurveyProjectDraft
  author: string
  onPatch: (change: Partial<SurveyProjectDraft>) => void
}) {
  const { draft } = props
  return (
    <>
      <ModalField label="프로젝트명" required>
        <input
          className={MODAL_INPUT}
          value={draft.name}
          onChange={(e) => props.onPatch({ name: e.target.value })}
          placeholder="예: 2026년 정기조사"
          required
        />
      </ModalField>

      {/* 시작일만 필수라 별표가 정확히 그 칸에 붙도록 두 항목으로 나눈다 */}
      <div>
        <div className="grid grid-cols-2 gap-2">
          <ModalField label="시작일" required>
            <input
              type="date"
              className={MODAL_INPUT}
              value={draft.startedOn}
              min={DATE_MIN}
              max={draft.endedOn ?? DATE_MAX}
              onChange={(e) => props.onPatch({ startedOn: e.target.value })}
              required
            />
          </ModalField>
          <ModalField label="종료일">
            <input
              type="date"
              className={MODAL_INPUT}
              value={draft.endedOn ?? ''}
              min={draft.startedOn || DATE_MIN}
              max={DATE_MAX}
              onChange={(e) => props.onPatch({ endedOn: emptyToNull(e.target.value) })}
            />
          </ModalField>
        </div>
        {isPeriodReversed(draft) && (
          <p className="mt-1 text-[11px] text-danger">종료일이 시작일보다 빠릅니다.</p>
        )}
      </div>

      {/* 읽기 전용 칸이라 필수 별표를 붙이지 않는다 — 별표는 사용자가 채워야 할 칸의 표시다 */}
      <ModalField label="작성자">
        <input className={MODAL_READONLY} value={props.author} readOnly tabIndex={-1} />
      </ModalField>

      <ModalField label="비고">
        <textarea
          className={`${MODAL_TEXTAREA} h-20`}
          value={draft.note ?? ''}
          onChange={(e) => props.onPatch({ note: e.target.value })}
          placeholder="조사 범위·참고 사항"
        />
      </ModalField>
    </>
  )
}
