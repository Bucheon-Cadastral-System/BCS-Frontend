import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ImportPreviewList, NO_FILES, POINT_ACTION_LABEL, SEND_LABEL, SendMark, hasRowErrors, nothingToRegister, useImportPreviews, useSequentialSend } from '@/features/import-file'
import type { PointPreview, ReadFile } from '@/features/import-file'
import { MODAL_CANCEL_BTN, MODAL_DANGER_BTN, MODAL_SUBMIT_BTN, Modal } from '@/shared/ui/Modal'
import { Spinner } from '@/shared/ui/Spinner'

/** 갱신되는 점은 줄 아래에 바뀔 항목을 적는다 — 무엇이 덮이는지 보지 않고 확정할 수 없다. */
function PointPreviewRow({ point }: { point: PointPreview }) {
  return (
    <div className="px-[18px] py-2.5">
      <div className="flex items-center gap-2 text-[12px]">
        <span className={`shrink-0 rounded-chip px-1.5 py-0.5 text-[11px] font-medium ${ACTION_TONE[point.action]}`}>
          {POINT_ACTION_LABEL[point.action]}
        </span>
        <span className="min-w-0 flex-1 truncate text-ink-2">{point.name}</span>
        <span className="shrink-0 text-[11px] text-ink-3">{point.pointNo}</span>
      </div>
      <p className="mt-1 text-[11px] text-ink-3">
        {point.crs} · X {point.northing} · Y {point.easting}
      </p>
      {point.warning != null && (
        <p className="mt-1 break-keep text-[11px] leading-[1.5] wrap-anywhere text-amber">{point.warning}</p>
      )}
      {point.changes.length > 0 && (
        <ul className="mt-1.5 space-y-1 text-[11px] leading-[1.5]">
          {point.changes.map((change) => (
            <li key={change.field} className="flex gap-2">
              <span className="w-[52px] shrink-0 text-ink-3">{change.field}</span>
              <span className="min-w-0 flex-1 text-ink-2">
                <span className="text-ink-4 line-through">{change.before || '없음'}</span>
                <span aria-hidden className="mx-1 text-ink-4">→</span>
                <span className="text-amber">{change.after || '없음'}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ACTION_TONE: Record<PointPreview['action'], string> = {
  NEW: 'bg-teal-wash text-teal-label',
  UPDATE: 'bg-amber-wash text-amber',
  UNCHANGED: 'bg-soft text-ink-3',
}

/**
 * 등록될 점 목록 — 파일 하나가 수천 행까지 가므로 보이는 줄만 그린다.
 * 줄 높이는 갱신 항목 수에 따라 달라져 measureElement 로 실제 높이를 잰다(기준점 탭과 같은 수법).
 */
function PointPreviewList({ points }: { points: PointPreview[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // 변경 없음은 확인할 것이 없어 접어 둔다 — 손댈 점만 펼쳐 놓는다
  const [collapsed, setCollapsed] = useState<Set<PointPreview['action']>>(() => new Set(['UNCHANGED']))

  // 분류 머리말과 그 아래 줄을 한 배열로 세운다 — 접힌 분류는 머리말만 남는다
  const items = useMemo(() => {
    const rows: (
      | { kind: 'heading'; action: PointPreview['action']; count: number; key: string }
      | { kind: 'point'; point: PointPreview; key: string }
    )[] = []
    for (const action of ACTION_ORDER) {
      const group = points.filter((p) => p.action === action)
      if (group.length === 0) continue
      rows.push({ kind: 'heading', action, count: group.length, key: `heading-${action}` })
      if (!collapsed.has(action))
        rows.push(...group.map((point, at) => ({ kind: 'point' as const, point, key: `${action}-${at}` })))
    }
    return rows
  }, [points, collapsed])

  const virtual = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => POINT_ROW_HEIGHT,
    overscan: 8,
    // 잰 높이는 키로 남는다 — 접기로 순번이 밀려도 높이가 다른 줄에 붙지 않도록 순번 대신 줄의 키를 쓴다
    getItemKey: (index) => items[index].key,
  })

  function toggle(action: PointPreview['action']) {
    setCollapsed((cur) => {
      const next = new Set(cur)
      if (next.has(action)) next.delete(action)
      else next.add(action)
      return next
    })
  }

  if (points.length === 0) return null

  return (
    // 좌우·아래만 되물린다 — 위는 앞선 목록과의 간격이라 그대로 둔다(MODAL_BLEED 는 본문의 유일한 자식일 때 쓰는 값)
    <div className="-mx-[18px] -mb-4 flex min-h-0 w-[calc(100%+36px)] flex-1 flex-col border-t border-line-soft">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* 목록 시맨틱은 쓰지 않는다 — 가상화 래퍼(div)가 ul 과 li 사이에 끼어 목록 구조가 성립하지 않는다 */}
        <div className="relative" style={{ height: virtual.getTotalSize() }}>
          {virtual.getVirtualItems().map((item) => {
            const row = items[item.index]
            return (
              <div
                key={item.key}
                ref={virtual.measureElement}
                data-index={item.index}
                className="absolute inset-x-0 top-0"
                style={{ transform: `translateY(${item.start}px)` }}
              >
                {row.kind === 'heading' ? (
                  <button
                    type="button"
                    onClick={() => toggle(row.action)}
                    aria-expanded={!collapsed.has(row.action)}
                    className="flex w-full items-center gap-2 border-y border-line-soft bg-soft px-[18px] py-2.5 text-left transition-colors hover:bg-hover"
                  >
                    <span className={`shrink-0 transition-transform ${collapsed.has(row.action) ? '' : 'rotate-90'}`}>
                      <IconCaret />
                    </span>
                    <span className="flex-1 text-[13px] font-semibold text-ink-2">{POINT_ACTION_LABEL[row.action]}</span>
                    <span className="shrink-0 text-[12px] text-ink-3">{row.count}점</span>
                  </button>
                ) : (
                  <div className="border-b border-line-row">
                    <PointPreviewRow point={row.point} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function IconCaret() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 text-ink-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

/** 목록에 세우는 순서 — 손댈 점(신규·갱신)이 먼저다 */
const ACTION_ORDER: PointPreview['action'][] = ['NEW', 'UPDATE', 'UNCHANGED']

/** 갱신 항목이 없는 줄의 높이(px) — 실제 높이는 measureElement 가 잰다 */
const POINT_ROW_HEIGHT = 52

/**
 * 기준점 파일 등록 — 파일 고르기에서 시작해 읽기 → 확인·등록으로 나아간다.
 * 파일에는 점이 여러 개라 입력 칸을 띄워 봐야 어느 점의 값인지 말할 수 없으므로,
 * 읽기를 별도 단계로 두고 확인 화면이 점별 신규/갱신 판정을 보여 준다. 한 점 입력은 기준점 추가 창이 맡는다.
 */
export function ControlPointFileModal(props: {
  /**
   * 파일 한 건 등록. 여러 건을 등록할 때는 몇 번째인지 함께 알려, 받는 쪽이 알림을 건마다 띄우지 않게 한다.
   * 실패로 끝나면 그 건에 머문다.
   */
  onImport: (file: File, batch: { index: number; total: number }) => Promise<void>
  onCancel: () => void
}) {
  const [reading, setReading] = useState<File[] | null>(null)
  // 확인 단계에 오른 파일들 — 비어 있으면 아직 이 단계에 오지 않았다. 건별 전송 상태는 훅이 순번으로 든다
  const [entries, setEntries] = useState<ReadFile[]>([])
  const send = useSequentialSend('등록하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 읽는 동안의 진행 상태 — 창을 새로 띄우지 않고 이 창 안에서 그대로 보여 준다
  const { entries: previews, finished } = useImportPreviews(reading ?? NO_FILES, 'control-points')
  const read = previews.flatMap((e) => (e.status.kind === 'done' ? [{ file: e.file, preview: e.status.preview }] : []))
  // 고칠 행이 남은 파일은 그대로 쓸 수 없다 — 보내 봐야 서버가 파일째로 거부하므로 여기서 가른다
  const usable = read.filter((r) => !hasRowErrors(r.preview))
  const blockedCount = read.length - usable.length
  const failedCount = previews.length - read.length

  // 읽는 동안에는 늘 이 화면이다. 다 읽어도 저절로 넘어가지 않는다 —
  // 무엇을 읽었는지 확인하고 넘길지 다시 고를지는 사용자가 정한다.
  const readingDone = reading !== null && finished
  const showReading = reading !== null
  const confirming = entries.length > 0

  const pendingIndexes = entries.flatMap((_, i) => (send.statusOf(i) === 'done' ? [] : [i]))
  const doneCount = entries.length - pendingIndexes.length
  const allDone = send.started && pendingIndexes.length === 0

  /** 창 위 어디에 떨어뜨리든, 눌러서 고르든 이 자리에서 읽는다 */
  function handleFiles(picked: File[]) {
    if (picked.length === 0) return
    setEntries([])
    send.reset()
    setReading(picked)
  }

  /** 읽은 파일을 확인 단계로 넘긴다 — 무엇이 신규이고 무엇이 갱신인지 보고 나서 등록을 시작한다. */
  function proceed(files: ReadFile[]) {
    setReading(null)
    if (files.length === 0) return
    setEntries(files)
  }

  const openPicker = () => fileInputRef.current?.click()

  /** 확인한 파일들을 차례로 등록한다 — 순차인 이유·실패 시 멈춤·재시도 규칙은 useSequentialSend가 갖는다. */
  function registerAll() {
    // 파일의 점이 모두 등록된 값과 같으면 보내도 서버가 할 일이 없다 — 수천 행을 올리는 대신 그 자리에서 끝낸다.
    // 결과는 보낸 건과 같은 완료다: 올린 파일대로 등록돼 있다는 것이 사용자가 확인할 전부다.
    send.markDone(pendingIndexes.filter((at) => nothingToRegister(entries[at].preview)))
    void send.run(
      pendingIndexes.filter((at) => !nothingToRegister(entries[at].preview)),
      (at, order, total) => props.onImport(entries[at].file, { index: order, total }),
    )
    // 끝나도 창을 닫지 않는다 — 무엇이 등록됐는지 확인하고 사용자가 닫는다
  }

  /** 창의 기본 동작(Enter 포함) — 단계마다 주 버튼과 같은 일을 한다. 등록은 확인 단계에서만. */
  function handlePrimary() {
    if (confirming) {
      registerAll()
      return
    }
    if (showReading) {
      // 읽기가 끝났으면 주 버튼(확인하기)과 같은 길 — 단계마다 Enter 가 다른 일을 하면 손이 헛디딘다
      if (readingDone && usable.length > 0) proceed(usable)
      return
    }
    openPicker()
  }

  const readingBody = <ImportPreviewList entries={previews} unit="기준점" />

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

  /**
   * 마지막 확인 — 무엇이 등록되는지 훑어본 뒤 여기서 등록을 시작한다.
   * 등록은 건마다 서버 응답을 기다리므로 같은 목록에 진행 상태를 채워 창이 멈춘 것처럼 보이지 않게 한다.
   */
  // 등록하면 점마다 무엇이 벌어지는지 — 갱신은 기존 성과를 덮으므로 확정 전에 보여야 한다
  const points = entries.flatMap((entry) => entry.preview.points ?? [])
  const countOf = (action: PointPreview['action']) => points.filter((p) => p.action === action).length
  const warningCount = points.filter((p) => p.warning != null).length

  const confirmBody = (
    <>
      <p className="shrink-0 text-[12.5px] text-ink-3">
        {allDone
          ? `${doneCount}건을 등록했습니다.`
          : send.started
            ? `${doneCount}건 등록, ${pendingIndexes.length}건 남음`
            : `${pendingIndexes.length}개 파일, 기준점 ${points.length}점을 등록합니다.`}
      </p>
      {!send.started && (
        <p className="shrink-0 text-[12px] text-ink-3">
          신규 <span className="font-semibold text-teal-text">{countOf('NEW')}</span>점 · 갱신{' '}
          <span className="font-semibold text-amber">{countOf('UPDATE')}</span>점 · 변경 없음 {countOf('UNCHANGED')}점
          {warningCount > 0 && (
            <>
              {' '}· 경고 <span className="font-semibold text-amber">{warningCount}</span>점
            </>
          )}
        </p>
      )}
      <ul className="shrink-0 space-y-2">
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
                <SendMark status={status} />
                <span className="min-w-0 flex-1 truncate text-ink-2">{entry.file.name}</span>
                <span className="shrink-0 text-[11px] text-ink-3">
                  {SEND_LABEL[status]}
                </span>
              </div>
              {error !== undefined && (
                <p className="mt-0.5 break-keep pl-6 text-[11px] leading-[1.5] wrap-anywhere text-danger">{error}</p>
              )}
            </li>
          )
        })}
      </ul>
      {!send.started && <PointPreviewList points={points} />}
    </>
  )

  return (
    <Modal
      title={confirming ? '기준점 등록' : showReading ? '기준점 파일 읽기' : '기준점 파일 등록'}
      busy={send.inFlight || reading !== null}
      onClose={props.onCancel}
      onSubmit={handlePrimary}
      onDropFile={confirming ? undefined : handleFiles}
      scrollInside={confirming && !send.started}
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
                onClick={() => {
                  setEntries([])
                  send.reset()
                }}
              >
                이전
              </button>
            )}
            {!send.started && (
              <button type="submit" className={MODAL_SUBMIT_BTN} disabled={pendingIndexes.length === 0}>
                {entries.length > 1 ? `${pendingIndexes.length}건 등록` : '등록'}
              </button>
            )}
            {/* 실패로 멈추면 남은 건을 이어 보낼 길이 필요하다 — 이미 등록된 건은 목록에서 완료라 다시 보내지 않는다 */}
            {send.started && !allDone && !send.inFlight && (
              <button type="submit" className={MODAL_SUBMIT_BTN}>
                남은 {pendingIndexes.length}건 다시 시도
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
                `${usable.length}건 확인하기`
              ) : (
                <span className="flex items-center gap-1.5">
                  <Spinner className="size-3.5" current />
                  읽는 중
                </span>
              )}
            </button>
          </>
        ) : (
          <>
            <button type="button" className={MODAL_DANGER_BTN} onClick={props.onCancel}>
              취소
            </button>
            <button type="submit" className={`${MODAL_SUBMIT_BTN} ml-auto`}>
              파일 선택
            </button>
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
        onChange={(ev) => {
          const picked = Array.from(ev.target.files ?? [])
          ev.target.value = '' // 같은 파일을 다시 골라도 change 가 나게 비운다
          handleFiles(picked)
        }}
      />
      {confirming ? confirmBody : showReading ? readingBody : pickerBody}
    </Modal>
  )
}
