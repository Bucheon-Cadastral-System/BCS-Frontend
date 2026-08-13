import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { POINT_TYPES, PointTypeIcon } from '@/entities/control-point'
import type { ControlPoint, PointType } from '@/entities/control-point'
import { CheckMark } from '@/shared/ui/CheckMark'

/** 접힌 점 줄의 높이(px) — 아래 버튼의 h-[34px] 와 같아야 스크롤 위치가 밀리지 않는다 */
const ROW_HEIGHT = 34

/**
 * 대상 기준점 고르기 — 전체 점에서 검색·종류로 좁혀 체크로 담는다.
 * 점이 수천이라 보이는 줄만 그린다(기준점 탭 목록과 같은 수법).
 * 담은 점 집합은 부르는 쪽이 소유한다 — 이 판은 좁혀 보여 주고 담고 빼는 일만 한다.
 */
export function TargetPicker(props: {
  points: ControlPoint[]
  selected: ReadonlySet<string>
  onChange: (next: Set<string>) => void
}) {
  const [q, setQ] = useState('')
  const [type, setType] = useState<PointType | null>(null)
  // 선택해 둔 점만 보기 — 수천 점 사이에서 지금 무엇이 선택돼 있는지 확인하고 빼는 용도(수정에서 특히).
  // 정렬로 선택분을 위로 올리는 대신 거름을 쓴다 — 목록이 체크할 때마다 재정렬되면 줄이 손밑에서 튄다.
  const [onlySelected, setOnlySelected] = useState(false)
  // 관리번호에 영문이 섞인다 — 대소문자를 가리지 않고 맞춘다
  const query = q.trim().toLowerCase()
  const selected = props.selected
  const list = useMemo(() => {
    let base = props.points
    if (onlySelected) base = base.filter((p) => selected.has(p.id))
    if (type !== null) base = base.filter((p) => p.type === type)
    if (query !== '') {
      base = base.filter(
        (p) => p.name.toLowerCase().includes(query) || p.pointNo.toLowerCase().includes(query),
      )
    }
    return base
  }, [props.points, onlySelected, selected, type, query])

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: list.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => list[index].id,
  })

  function toggle(id: string) {
    const next = new Set(props.selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    props.onChange(next)
  }

  /** 걸러진 목록을 통째로 선택한다 — 종류 필터와 함께 쓰면 "도근점 전체" 같은 지정이 한 번에 된다. */
  function addFiltered() {
    const next = new Set(props.selected)
    list.forEach((p) => next.add(p.id))
    props.onChange(next)
  }

  const allFilteredSelected = useMemo(
    () => list.length > 0 && list.every((p) => props.selected.has(p.id)),
    [list, props.selected],
  )

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-medium tracking-[.08em] text-ink-3">
          대상 기준점
          {/* 별표는 장식이라 읽어 줄 필요가 없다 — 다른 필수 칸(ModalField)과 같은 규격 */}
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        </span>
        <span className="text-[11px] text-ink-3">
          <b className="font-semibold text-teal-text">{props.selected.size}</b>개 선택
        </span>
      </div>
      <div className="overflow-hidden rounded-ctl border border-line-field">
        <div className="flex flex-col gap-1.5 border-b border-line-soft bg-soft p-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름·관리번호 검색"
            className="h-8 w-full rounded-chip border border-line-field bg-field px-2.5 text-[12px] text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-teal-edge"
          />
          <div className="flex flex-wrap items-center gap-1">
            <TypeChip label="전체" on={type === null} onClick={() => setType(null)} />
            {POINT_TYPES.map((t) => (
              <TypeChip key={t} label={t} on={type === t} onClick={() => setType(type === t ? null : t)} />
            ))}
            {/* 종류와 다른 축(선택 여부)이라 오른쪽 끝에 떨어뜨려 둔다 — 검색·종류와 겹쳐 함께 좁힌다 */}
            <span className="ml-auto">
              <TypeChip label="선택중" on={onlySelected} onClick={() => setOnlySelected((v) => !v)} />
            </span>
          </div>
        </div>
        <div ref={scrollRef} className="h-[218px] overflow-y-auto overscroll-contain bg-field">
          {list.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-ink-3">
              {props.points.length === 0
                ? '기준점 없음'
                : onlySelected && props.selected.size === 0
                  ? '선택중인 점 없음'
                  : '검색 결과 없음'}
            </p>
          ) : (
            <ul className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((item) => {
                const cp = list[item.index]
                const on = props.selected.has(cp.id)
                return (
                  <li
                    key={item.key}
                    className="absolute left-0 top-0 w-full"
                    style={{ transform: `translateY(${item.start}px)` }}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(cp.id)}
                      aria-pressed={on}
                      className={`flex h-[34px] w-full items-center gap-2 px-3 text-left transition-colors hover:bg-hover ${on ? 'bg-teal-wash' : ''}`}
                    >
                      <CheckMark on={on} />
                      <PointTypeIcon type={cp.type} className="size-[15px] shrink-0 text-ink-3" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">{cp.name}</span>
                      <span className="shrink-0 text-[11px] text-ink-4">{cp.pointNo}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {/* 해제(빨강)는 왼쪽, 선택은 오른쪽 — 버리는 동작과 담는 동작이 자리로도 갈린다 */}
        <div className="flex items-center justify-between gap-1.5 border-t border-line-soft bg-soft px-2 py-1.5">
          <button
            type="button"
            onClick={() => props.onChange(new Set())}
            disabled={props.selected.size === 0}
            className="rounded-chip px-2 py-1 text-[11.5px] text-danger transition-colors hover:bg-danger-wash disabled:opacity-40"
          >
            전체 해제
          </button>
          <button
            type="button"
            onClick={addFiltered}
            disabled={list.length === 0 || allFilteredSelected}
            className="rounded-chip px-2 py-1 text-[11.5px] text-teal-text transition-colors hover:bg-teal-wash disabled:opacity-40"
          >
            {list.length}개 전체 선택
          </button>
        </div>
      </div>
    </div>
  )
}

function TypeChip(props: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.on}
      className={`rounded-chip border px-2 py-[3px] text-[11px] transition-colors ${
        props.on
          ? 'border-teal-btn-edge bg-teal-wash font-medium text-teal-label'
          : 'border-line-field bg-field text-ink-3 hover:text-ink-2'
      }`}
    >
      {props.label}
    </button>
  )
}
