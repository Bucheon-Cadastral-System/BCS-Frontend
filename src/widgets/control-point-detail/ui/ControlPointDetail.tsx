import { useEffect, useState } from 'react'
import { TM_ORIGINS } from '@/shared/lib/crs'
import { BTN_SM_PRIMARY, CHIP_BTN, FIELD_AREA, PANEL } from '@/shared/ui/classes'
import type { ControlPoint } from '@/entities/control-point'
import { PointTypeIcon, useLastSurveyorNameQuery } from '@/entities/control-point'
import { SURVEY_STATUS_LABEL, SurveyResultPicker, deriveSurveyStatus } from '@/entities/survey-record'
import type { SurveyResult, SurveyStatus } from '@/entities/survey-record'

interface ControlPointDetailProps {
  point: ControlPoint | null
  activeProjectName: string | null
  /** 이 점을 마지막으로 판정한 조사원 표시명. 기록이 없거나 인증 없이 남긴 기록이면 null */
  surveyorName: string | null
  /** 이 점의 조사 결과. 기록이 없으면(미조사) null */
  surveyResult: SurveyResult | null
  /** 기록에 딸린 사유. 기타가 아니거나 기록이 없으면 null */
  surveyNote: string | null
  /** 결과 기록·정정. note는 기타를 고를 때만 채워 온다 */
  onRecordSurvey: (id: string, result: SurveyResult, note: string | null) => void
  /** 미조사로 되돌리기(기록 삭제) */
  onCancelSurvey: (id: string) => void
  onClose: () => void
  /** 이 점 수정·삭제. 입력과 확인은 화면 전체를 아는 쪽의 창이 받는다 */
  onEdit: (point: ControlPoint) => void
  onDelete: (point: ControlPoint) => void
  /** 관리번호를 복사한 결과. 알림은 화면 전체를 아는 쪽이 띄운다 */
  onCopied: (ok: boolean) => void
}

/** 상태별 배지·칩 색조. 정상은 청록, 망실은 빨강, 조사불가는 호박, 기타는 중립 강조, 미조사는 옅은 회색 */
const STATUS_TONE: Record<SurveyStatus, string> = {
  done: 'border-teal-btn-edge bg-teal-wash-strong text-teal-text',
  lost: 'border-danger-btn-edge bg-danger-wash text-danger',
  unavailable: 'border-amber/40 bg-amber-wash text-amber',
  etc: 'border-line-btn bg-hover text-ink',
  todo: 'border-line-btn bg-soft text-ink-3',
}

/** 값이 없으면 정보 없음으로 세운다. 줄을 감추면 항목이 없는 것과 구분되지 않는다. */
function noneOr(value: string | null | undefined) {
  return value === null || value === undefined || value === '' ? <span className="text-ink-4">정보 없음</span> : value
}

function epsgLabel(epsg: string): string {
  return TM_ORIGINS.find((o) => o.epsg === epsg)?.label ?? epsg
}

/** 값을 클립보드로 복사한다. 복사 결과는 부모가 알린다. */
function CopyButton(props: { value: string; label: string; onCopied: (ok: boolean) => void }) {
  const { value, label, onCopied } = props

  async function copy() {
    try {
      // 클립보드는 보안 컨텍스트(HTTPS·localhost)에서만 열린다
      await navigator.clipboard.writeText(value)
      onCopied(true)
    } catch {
      onCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={label}
      aria-label={label}
      className="flex size-6 shrink-0 items-center justify-center rounded-chip bg-field text-ink-3 transition-colors hover:text-teal-text"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[13px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="13" height="13" rx="2" />
        <path d="M16 8h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-3" />
      </svg>
    </button>
  )
}


/** 고른 기준점의 성과와 조사 상태. 지도 위 우측에 떠 있는 카드다. */
export function ControlPointDetail(props: ControlPointDetailProps) {
  const p = props.point
  // 최종조사원은 점을 고른 뒤에만 필요해서 목록과 따로 읽는다
  const lastSurveyorName = useLastSurveyorNameQuery(p?.id ?? null).data

  // 골랐지만 아직 서버 응답이 돌아오지 않은 값. 머리말 칩과 고르기 칩이 함께 이 값을 따른다
  const [pending, setPending] = useState<SurveyResult | 'NONE' | null>(null)
  const [etcNote, setEtcNote] = useState('')

  useEffect(() => {
    setPending(null)
    setEtcNote('')
  }, [p?.id])

  // 서버가 따라잡으면 놓는다. 먼저 놓으면 그 사이 한 프레임 동안 이전 값이 보인다
  useEffect(() => {
    if (pending === null || pending === 'ETC') return
    if (pending === 'NONE' ? props.surveyResult === null : props.surveyResult === pending) setPending(null)
  }, [props.surveyResult, pending])
  if (!p) return null

  // 아직 저장하지 않았어도 고른 값을 따른다. 머리말 칩만 이전 값으로 남으면 화면이 어긋난다
  const shownResult = pending === 'NONE' ? null : (pending ?? props.surveyResult)
  const pendingEtc = pending === 'ETC'
  const status = deriveSurveyStatus(shownResult ?? undefined)
  const chipTone = STATUS_TONE[status]




  return (
    <aside className={`panel-in w-[320px] overflow-hidden ${PANEL}`}>
      <div className="flex items-center gap-[9px] border-b border-line-soft py-3 pl-3.5 pr-2.5">
        <span className="flex shrink-0 text-teal-text">
          <PointTypeIcon type={p.type} className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[14.5px] font-semibold text-ink">{p.name}</span>
          <span className="block text-[11.5px] text-ink-3">{p.type}</span>
        </span>
        <button
          type="button"
          onClick={() => props.onEdit(p)}
          title="수정"
          aria-label="기준점 수정"
          className="flex size-[26px] shrink-0 items-center justify-center rounded-chip text-ink-3 transition-colors hover:bg-hover hover:text-teal-text"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => props.onDelete(p)}
          title="삭제"
          aria-label="기준점 삭제"
          className="flex size-[26px] shrink-0 items-center justify-center rounded-chip text-ink-3 transition-colors hover:bg-danger-wash hover:text-danger"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16" />
            <path d="M10 11v6M14 11v6" />
            <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
        {/* 삭제와 닫기는 이웃한 데다 강조색이 같다. 사이를 갈라 잘못 누르지 않게 한다 */}
        <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 self-center bg-line-soft" />
        <button
          type="button"
          onClick={props.onClose}
          title="닫기"
          aria-label="닫기"
          className="flex size-[26px] shrink-0 items-center justify-center rounded-chip text-ink-3 transition-colors hover:bg-danger-wash hover:text-danger"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-3.5 pb-[13px] pt-3">
        {/* 이름은 표시용이고 점을 가리키는 값은 관리번호라 좌표보다 먼저 둔다 */}
        <div className="mb-3 flex items-center gap-[9px] rounded-chip border border-line-pill bg-field py-[7px] pl-2.5 pr-2">
          <span className="shrink-0 text-[11px] text-ink-3">관리번호</span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{p.pointNo}</span>
          <CopyButton value={p.pointNo} label="관리번호 복사" onCopied={props.onCopied} />
        </div>

        <dl className="grid grid-cols-[64px_1fr] gap-x-2.5 gap-y-[7px] text-[12.5px] [&_dd]:text-ink-2 [&_dt]:text-ink-3">
          <dt>위도</dt>
          <dd>{p.lat.toFixed(7)}</dd>
          <dt>경도</dt>
          <dd>{p.lng.toFixed(7)}</dd>
          <dt>TM 원점</dt>
          {/* dd 에 건 고정폭이 이 요소의 클래스보다 앞서므로(같은 요소를 두 규칙이 다툼) 안쪽 글자에 걸어 물려받게 한다 */}
          <dd className="whitespace-nowrap text-[12px]">
            <span className="font-sans">{epsgLabel(p.tmEpsg)}</span> <span className="text-ink-3">({p.tmEpsg})</span>
          </dd>
          {/* 성과 표기는 측량 관례를 따른다. X 가 북(northing), Y 가 동(easting)이다 */}
          <dt>TM X</dt>
          <dd>{p.northing.toFixed(3)} m</dd>
          <dt>TM Y</dt>
          <dd>{p.easting.toFixed(3)} m</dd>
          {/* 회차와 무관한 최근 조사 요약. 아래 프로젝트 구역의 조사원과 달리 마지막으로 조사한 사람이다 */}
          {/* 값이 없어도 줄을 세운다. 줄이 사라지면 값이 없는 것인지 항목 자체가 없는 것인지 알 수 없다 */}
          <dt>최종조사</dt>
          <dd>{noneOr(p.lastSurveyResult)}</dd>
          <dt>최종조사일</dt>
          <dd>{noneOr(p.lastSurveyedOn)}</dd>
          <dt>최종조사원</dt>
          <dd>{noneOr(lastSurveyorName)}</dd>
        </dl>
      </div>

      {props.activeProjectName !== null && (
        <div className="border-t border-line-soft bg-soft px-3.5 pb-[13px] pt-[11px]">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">{props.activeProjectName}</span>
            <span className={`shrink-0 rounded-chip px-[9px] py-[3px] text-[11px] font-semibold ${chipTone}`}>
              {SURVEY_STATUS_LABEL[status]}
            </span>
          </div>
          {/* 조사원, 마지막 판정 주체. 상세 패널의 '작성자'와 같은 표기 규격 */}
          {/* 파일로 들어온 기록과 인증 전에 남긴 기록은 조사원이 비어 있다 */}
          <div className="-mt-1.5 mb-2.5 truncate text-[11.5px] text-ink-3">조사원 {noneOr(props.surveyorName)}</div>

          {/* 자리를 하나만 쓴다. 칩을 누르면 목록이 펼쳐지고 고르면 접힌다 */}
          <SurveyResultPicker
            result={props.surveyResult}
            pending={shownResult}
            onSelect={(choice) => {
              if (choice === 'NONE') {
                setPending('NONE')
                props.onCancelSurvey(p.id)
                return
              }
              if (choice === 'ETC') {
                // 사유는 카드 안에서 이어 받는다. 떠 있는 창을 하나 더 띄우지 않는다
                setEtcNote(props.surveyResult === 'ETC' ? (props.surveyNote ?? '') : '')
                setPending('ETC')
                return
              }
              setPending(choice)
              props.onRecordSurvey(p.id, choice, null)
            }}
          />

          {pendingEtc && (
            <div className="mt-1.5 flex flex-col gap-1.5">
              <textarea
                value={etcNote}
                onChange={(e) => setEtcNote(e.target.value)}
                placeholder="판정 사유"
                className={`${FIELD_AREA} h-16`}
                autoFocus
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={etcNote.trim() === ''}
                  onClick={() => {
                    props.onRecordSurvey(p.id, 'ETC', etcNote.trim())
                    setPending(null)
                  }}
                  className={`${BTN_SM_PRIMARY} flex-1`}
                >
                  저장
                </button>
                <button type="button" onClick={() => setPending(null)} className={`${CHIP_BTN} h-9 flex-1 text-[12px]`}>
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 기타는 사유가 있어야 뜻이 통한다. 고른 값 아래에 그대로 보여 준다 */}
          {!pendingEtc && props.surveyResult === 'ETC' && props.surveyNote !== null && props.surveyNote !== '' && (
            <p className="mt-1.5 break-keep text-[11.5px] leading-[1.55] wrap-anywhere text-ink-3">
              사유 {props.surveyNote}
            </p>
          )}
        </div>
      )}
    </aside>
  )
}
