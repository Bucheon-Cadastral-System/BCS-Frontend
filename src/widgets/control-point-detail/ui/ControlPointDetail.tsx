import { useEffect, useRef, useState } from 'react'
import type { SheetHandle } from '@/shared/lib/useBottomSheet'
import { TM_ORIGINS } from '@/shared/lib/crs'
import { formatDate, formatKstDate } from '@/shared/lib/date'
import { FIELD_AREA, ICON_BTN, ICON_BTN_DANGER, PANEL, PANEL_HEADER, PANEL_HEADER_RULE } from '@/shared/ui/classes'
import { Skeleton } from '@/shared/ui/Skeleton'
import { FormActions } from '@/shared/ui/FormActions'
import type { ControlPoint, MappableControlPoint, PublicControlPoint } from '@/entities/control-point'
import { PointTypeIcon, useLastSurveyQuery } from '@/entities/control-point'
import { SURVEY_STATUS_LABEL, SURVEY_STATUS_TONE, SurveyResultPicker, deriveSurveyStatus } from '@/entities/survey-record'
import type { SurveyResult } from '@/entities/survey-record'
import { ControlPointImageUpload } from '@/features/upload-control-point-image'

interface ControlPointDetailProps {
  point: ControlPoint | PublicControlPoint | null
  activeProjectName: string | null
  /** 사진은 회차에 매달리므로 어느 회차인지 알아야 한다. 조사 대상이 아니면 null */
  activeProjectId: string | null
  /** 사진 등록에 성공했다. 알림은 화면 전체를 아는 쪽이 띄운다 */
  onImageUploaded: () => void
  /** 사진 쪽에서 창 밖으로 알려야 할 실패 */
  onImageFailed: (message: string) => void
  /** 이 점을 마지막으로 판정한 조사원 표시명. 기록이 없거나 인증 없이 남긴 기록이면 null */
  surveyorName: string | null
  /** 이 회차에서 판정한 시각. 기록이 없으면 null */
  surveyedAt: string | null
  /** 이 점의 조사 결과. 기록이 없으면(미조사) null */
  surveyResult: SurveyResult | null
  /** 기록에 딸린 비고. 기타가 아니거나 기록이 없으면 null */
  surveyNote: string | null
  /** 결과 기록·정정. note는 기타를 고를 때만 채워 온다. 실패하면 거절되는 약속을 돌려준다 */
  onRecordSurvey: (id: string, result: SurveyResult, note: string | null) => Promise<void>
  /** 미조사로 되돌리기(기록 삭제) */
  onCancelSurvey: (id: string) => Promise<void>
  onClose: () => void
  /** 이 점 수정·삭제. 입력과 확인은 화면 전체를 아는 쪽의 창이 받는다 */
  onEdit: (point: ControlPoint) => void
  onDelete: (point: ControlPoint) => void
  /** 관리번호를 복사한 결과. 알림은 화면 전체를 아는 쪽이 띄운다 */
  onCopied: (ok: boolean) => void
  /**
   * 좁은 화면에서 아래에서 올라오는 시트로 설 때의 손잡이.
   *
   * <p>주면 머리말 위에 손잡이가 서고 끌 수 있게 된다. 얼마나 올라와 서고 언제 닫히는지는
   * 화면 전체를 아는 쪽(useBottomSheet)이 정하므로, 여기서는 잡는 자리와 재는 자리만 내어 준다.
   */
  sheet?: SheetHandle
}

/** 값이 없으면 정보 없음으로 세운다. 줄을 감추면 항목이 없는 것과 구분되지 않는다. */
function noneOr(value: string | null | undefined) {
  return value === null || value === undefined || value === '' ? <span className="text-ink-4">정보 없음</span> : value
}

function epsgLabel(epsg: string): string {
  return TM_ORIGINS.find((o) => o.epsg === epsg)?.label ?? epsg
}

/** 복사한 뒤 체크가 남아 있는 시간(ms) — 눈이 한 번 갔다 오기에 넉넉하되, 다음 동작을 기다리게 하지는 않는다 */
const COPIED_MS = 1600

/**
 * 값을 클립보드로 복사한다.
 *
 * <p>됐다는 말을 누른 자리에서도 한다 — 아이콘이 체크로 바뀌고 잠시 뒤 되돌아온다. 화면 아래 알림은
 * 부르는 쪽이 그대로 띄운다. 손이 머문 자리와 화면 아래, 둘 중 어디를 보고 있어도 결과가 눈에 든다.
 *
 * <p>체크는 한 획으로 그어진다. 나타났다 사라지는 것과 달리, 그어지는 동안 눈이 그 획을 따라가게 되어
 * 무엇이 방금 일어났는지가 움직임 자체로 읽힌다.
 */
function CopyButton(props: { value: string; label: string; onCopied: (ok: boolean) => void }) {
  const { value, label, onCopied } = props
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)
  // 되돌리기 전에 화면을 떠나면(다른 점을 고르거나 시트를 닫으면) 남은 시계를 거둔다
  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current)
  }, [])

  async function copy() {
    try {
      // 클립보드는 보안 컨텍스트(HTTPS·localhost)에서만 열린다
      await navigator.clipboard.writeText(value)
    } catch {
      onCopied(false)
      return
    }
    onCopied(true)
    setCopied(true)
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = null
      setCopied(false)
    }, COPIED_MS)
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={label}
      aria-label={copied ? `${label} 완료` : label}
      className={`flex size-6 shrink-0 items-center justify-center rounded-chip bg-field transition-colors ${
        copied ? 'text-teal-text' : 'text-ink-3 hover:text-teal-text'
      }`}
    >
      {copied ? (
        <svg
          viewBox="0 0 24 24"
          className="size-[13px]"
          fill="none"
          stroke="currentColor"
          // 그어지는 획이라 굵게 세운다 — 두 겹이던 복사 아이콘 자리에 한 획만 남으므로 가늘면 비어 보인다
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* 꺾인 두 마디를 합쳐 21 남짓이다 — 대시는 경로보다 짧으면 안 되므로 올려 잡는다 */}
          <path className="stroke-draw [--stroke-len:22]" d="m5 12.5 4.5 4.5L19 7" />
        </svg>
      ) : (
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
      )}
    </button>
  )
}


/** 관리번호 칩 — 점을 가리키는 값이라 회원·공개 두 갈래가 같은 모양으로 맨 위에 세운다 */
function PointNoChip(props: { pointNo: string; onCopied: (ok: boolean) => void }) {
  return (
    <div className="mb-3 flex items-center gap-[9px] rounded-chip border border-line-pill bg-field py-[7px] pl-2.5 pr-2">
      <span className="shrink-0 text-[11px] text-ink-3">관리번호</span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{props.pointNo}</span>
      <CopyButton value={props.pointNo} label="관리번호 복사" onCopied={props.onCopied} />
    </div>
  )
}

/** 위경도 두 줄 — 자릿수는 한 곳에서 정한다. 담는 dl 의 격자를 그대로 쓰므로 감싸지 않는다 */
function LatLngRows({ point }: { point: MappableControlPoint }) {
  return (
    <>
      <dt>위도</dt>
      <dd>{point.lat.toFixed(7)}</dd>
      <dt>경도</dt>
      <dd>{point.lng.toFixed(7)}</dd>
    </>
  )
}

/**
 * 회원 모델인지 — 판 번호로 가른다.
 *
 * <p>공개 모델은 성과(TM 좌표)까지 담으므로 좌표로는 갈리지 않는다. 판 번호는 고쳐 쓰는 쪽에만 있는 값이고,
 * 공개 응답이 그것을 담게 되는 일은 곧 공개 화면에서 고칠 수 있다는 뜻이라 그때는 이 갈래 자체가 바뀐다.
 */
function isMemberPoint(point: ControlPoint | PublicControlPoint | null): point is ControlPoint {
  return point !== null && 'version' in point
}

/** 고른 기준점의 성과와 조사 상태. 지도 위 우측에 떠 있는 카드다. */
export function ControlPointDetail(props: ControlPointDetailProps) {
  // 회원 화면의 기존 계약은 그대로 두고, 게스트일 때만 공개 모델을 같은 껍데기에 넣는다.
  // 두 모델은 겹치지 않는 필드로 갈라 읽으므로 단정하지 않는다 — 단정하면 없는 필드를 읽어도 형이 통과한다.
  const point = props.point
  const p = isMemberPoint(point) ? point : null
  const publicPoint = isMemberPoint(point) ? null : point
  // 최종조사 요약은 점을 고른 뒤에만 필요해서 목록과 따로 읽는다
  const lastSurveyQuery = useLastSurveyQuery(p?.id ?? null)
  const lastSurvey = lastSurveyQuery.data
  // 아직 받지 못한 값을 '정보 없음'으로 세우면 없는 것으로 읽힌다. 자리만 잡아 두고 도착하면 채운다
  const surveyPending = lastSurveyQuery.isPending && p !== null

  // 골랐지만 아직 서버 응답이 돌아오지 않은 값. 머리말 칩과 고르기 칩이 함께 이 값을 따른다
  const [pending, setPending] = useState<SurveyResult | 'NONE' | null>(null)
  const [etcNote, setEtcNote] = useState('')
  // 보내 놓고 아직 답을 못 받은 상태. 이 동안 다른 결과를 고르면 두 요청이 겹쳐 마지막 선택과 다른 값이 남는다
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setPending(null)
    setEtcNote('')
  }, [p?.id])

  /** 고른 값을 먼저 보이고 보낸다. 실패하면 고른 값을 놓아 카드가 저장된 값을 다시 보이게 한다. */
  async function applySurvey(next: SurveyResult | 'NONE', send: () => void | Promise<void>) {
    setPending(next)
    setSaving(true)
    try {
      await send()
    } catch {
      setPending(null)
    } finally {
      setSaving(false)
    }
  }

  // 서버가 따라잡으면 놓는다. 먼저 놓으면 그 사이 한 프레임 동안 이전 값이 보인다
  useEffect(() => {
    if (pending === null || pending === 'ETC') return
    if (pending === 'NONE' ? props.surveyResult === null : props.surveyResult === pending) setPending(null)
  }, [props.surveyResult, pending])
  if (point === null) return null

  // 아직 저장하지 않았어도 고른 값을 따른다. 머리말 칩만 이전 값으로 남으면 화면이 어긋난다
  const shownResult = pending === 'NONE' ? null : (pending ?? props.surveyResult)
  const pendingEtc = pending === 'ETC'
  const status = deriveSurveyStatus(shownResult ?? undefined)
  const chipTone = SURVEY_STATUS_TONE[status]




  return (
    // 좁은 화면에서는 폭을 화면이 정하고 아래 변이 화면에 붙으므로 그쪽 모서리를 깎지 않는다.
    // 나타나는 모습도 좁은 화면에서는 시트가 올라오는 것으로 대신한다(panel-in 은 위에서 내려오는 모양이라 거꾸로다)
    <aside
      ref={props.sheet?.rootRef}
      className={`panel-in w-[320px] overflow-hidden max-lg:flex max-lg:h-full max-lg:w-auto max-lg:flex-col max-lg:rounded-b-none max-lg:bg-sheet max-lg:[animation:none] ${PANEL}`}
    >
      {/* 손잡이 — 잡는 자리는 줄 전체다. 그어 둔 막대만 잡게 하면 4px 짜리 과녁을 손가락으로 맞혀야 한다 */}
      {props.sheet && (
        <div {...props.sheet.handleProps} className="flex shrink-0 justify-center py-[9px] lg:hidden" aria-hidden>
          <span className="h-1 w-[38px] rounded-chip bg-line-btn" />
        </div>
      )}
      {/* 이름과 종류를 한 줄에 나란히 — 좌측 패널 머리말(제목 + 총 N개)과 같은 규격이다 */}
      <div className={`${PANEL_HEADER} ${PANEL_HEADER_RULE}`}>
        <span className="flex shrink-0 text-teal-text">
          <PointTypeIcon type={point.type} className="size-[18px]" />
        </span>
        <h2 className="flex min-w-0 flex-1 items-baseline gap-[7px]">
          <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink">{point.name}</span>
          <span className="shrink-0 text-[11px] text-ink-3">{point.type}</span>
        </h2>
        {p !== null && (
          <>
            <button type="button" onClick={() => props.onEdit(p)} title="수정" aria-label="기준점 수정" className={ICON_BTN}>
              <svg viewBox="0 0 24 24" className="size-full" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
            <button type="button" onClick={() => props.onDelete(p)} title="삭제" aria-label="기준점 삭제" className={ICON_BTN_DANGER}>
              <svg viewBox="0 0 24 24" className="size-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16" />
                <path d="M10 11v6M14 11v6" />
                <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </>
        )}
        <button type="button" onClick={props.onClose} title="닫기" aria-label="닫기" className={ICON_BTN_DANGER}>
          <svg viewBox="0 0 24 24" className="size-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 좁은 화면에서 넘치는 자리는 여기 하나뿐이다 — 성과와 조사 상태가 한 흐름으로 이어져야
          시트를 끌어 올린 만큼 아래쪽 조사 상태까지 따라 올라온다. 둘을 따로 흐르게 하면 늘어난
          높이를 위쪽이 다 먹고 조사 상태는 시트 바닥에 눌린 채로 남는다.
          손잡이와 머리말은 이 바깥이라 내용을 굴려도 자리를 지킨다 */}
      <div ref={props.sheet?.scrollRef} className="max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto max-lg:overscroll-contain">
      {publicPoint !== null ? (
        <div className="px-3.5 pb-[15px] pt-3">
          <dl className="grid grid-cols-[64px_1fr] gap-x-2.5 gap-y-[9px] text-[12.5px] [&_dd]:text-ink-2 [&_dt]:text-ink-3">
            <LatLngRows point={publicPoint} />
            <dt>TM 원점</dt>
            <dd className="whitespace-nowrap text-[12px]">
              <span className="font-sans">{epsgLabel(publicPoint.tmEpsg)}</span> <span className="text-ink-3">({publicPoint.tmEpsg})</span>
            </dd>
            {/* 성과 표기는 측량 관례를 따른다. X 가 북(northing), Y 가 동(easting)이다 */}
            <dt>TM X</dt>
            <dd>{publicPoint.northing.toFixed(3)} m</dd>
            <dt>TM Y</dt>
            <dd>{publicPoint.easting.toFixed(3)} m</dd>
          </dl>
        </div>
      ) : p !== null ? (
      <>
      <div className="px-3.5 pb-[13px] pt-3">
        {/* 이름은 표시용이고 점을 가리키는 값은 관리번호라 좌표보다 먼저 둔다 */}
        <PointNoChip pointNo={p.pointNo} onCopied={props.onCopied} />

        <dl className="grid grid-cols-[64px_1fr] gap-x-2.5 gap-y-[7px] text-[12.5px] [&_dd]:text-ink-2 [&_dt]:text-ink-3">
          <LatLngRows point={p} />
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
          {/* 표지를 언제 묻었는지 — 조사 이력과 달리 점 자체의 내력이라 성과 아래에 둔다 */}
          <dt>설치일자</dt>
          <dd>{noneOr(p.installedDate === null ? null : formatDate(p.installedDate))}</dd>
          {/* 회차와 무관한 최근 조사 요약. 아래 프로젝트 구역의 조사원과 달리 마지막으로 조사한 사람이다 */}
          {/* 값이 없어도 줄을 세운다. 줄이 사라지면 값이 없는 것인지 항목 자체가 없는 것인지 알 수 없다 */}
          <dt>최종조사</dt>
          <dd>{surveyPending ? <Skeleton className="h-3 w-14" /> : noneOr(lastSurvey?.result)}</dd>
          {/* 기타는 무엇이었는지 비고가 있어야 뜻이 통한다. 다른 갈래는 결과가 곧 뜻이라 줄을 세우지 않는다 */}
          {lastSurvey?.result === SURVEY_STATUS_LABEL.etc && (
            <>
              <dt>비고</dt>
              <dd className="break-keep leading-[1.55] wrap-anywhere">{noneOr(lastSurvey.note)}</dd>
            </>
          )}
          <dt>최종조사일</dt>
          <dd>
            {surveyPending ? (
              <Skeleton className="h-3 w-20" />
            ) : (
              noneOr(lastSurvey?.surveyedOn === null || lastSurvey?.surveyedOn === undefined ? null : formatDate(lastSurvey.surveyedOn))
            )}
          </dd>
          <dt>최종조사원</dt>
          <dd>{surveyPending ? <Skeleton className="h-3 w-16" /> : noneOr(lastSurvey?.surveyorName)}</dd>
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
          {/* 자리를 하나만 쓴다. 칩을 누르면 목록이 펼쳐지고 고르면 접힌다 */}
          <SurveyResultPicker
            result={props.surveyResult}
            pending={shownResult}
            disabled={saving}
            onSelect={(choice) => {
              if (choice === 'NONE') {
                void applySurvey('NONE', () => props.onCancelSurvey(p.id))
                return
              }
              if (choice === 'ETC') {
                // 비고는 카드 안에서 이어 받는다. 떠 있는 창을 하나 더 띄우지 않는다
                setEtcNote(props.surveyResult === 'ETC' ? (props.surveyNote ?? '') : '')
                setPending('ETC')
                return
              }
              void applySurvey(choice, () => props.onRecordSurvey(p.id, choice, null))
            }}
          />

          {pendingEtc && (
            <div className="mt-1.5 flex flex-col gap-1.5">
              <textarea
                value={etcNote}
                onChange={(e) => setEtcNote(e.target.value)}
                placeholder="현장 상태·참고 사항"
                className={`${FIELD_AREA} h-16`}
                autoFocus
              />
              <FormActions
                fill
                submitLabel="저장"
                busy={saving}
                onCancel={() => setPending(null)}
                onSubmit={() => {
                  // 비고는 적으면 좋지만 없다고 판정을 막지 않는다. 빈 칸은 적지 않은 것으로 보낸다
                  const note = etcNote.trim()
                  void applySurvey('ETC', async () => {
                    await props.onRecordSurvey(p.id, 'ETC', note === '' ? null : note)
                    setPending(null)
                  })
                }}
              />
            </div>
          )}

          {/* 고른 값에 딸린 정보 — 비고는 기타일 때만 붙고, 조사일과 조사원은 자리를 지킨다.
              비고를 적지 않은 기타도 있고, 파일로 들어온 기록과 인증 전에 남긴 기록은 조사원이 비어 있다.
              차례는 위쪽 최종조사 구역과 같다. 같은 성격의 값이 층만 달리해 두 번 서므로 순서가 어긋나면 눈이 헤맨다 */}
          {!pendingEtc && (
            <dl className="mt-2.5 grid grid-cols-[38px_1fr] gap-x-2.5 gap-y-1 text-[11.5px] [&_dd]:text-ink-2 [&_dt]:text-ink-3">
              {props.surveyResult === 'ETC' && (
                <>
                  <dt>비고</dt>
                  <dd className="break-keep leading-[1.55] wrap-anywhere">{noneOr(props.surveyNote)}</dd>
                </>
              )}
              <dt>조사일</dt>
              <dd>{noneOr(props.surveyedAt === null ? null : formatKstDate(props.surveyedAt))}</dd>
              <dt>조사원</dt>
              <dd className="truncate">{noneOr(props.surveyorName)}</dd>
            </dl>
          )}

          {/* 현장 사진 — 판정과 그에 딸린 정보 아래. 구역 자체가 대상일 때만 서므로 회차 id 는 여기서 다시 묻지 않는다 */}
          {props.activeProjectId !== null && (
            <ControlPointImageUpload
              projectId={props.activeProjectId}
              pointId={p.id}
              result={props.surveyResult}
              onSuccess={props.onImageUploaded}
              onError={props.onImageFailed}
            />
          )}
        </div>
      )}
      </>
      ) : null}
      </div>
    </aside>
  )
}
