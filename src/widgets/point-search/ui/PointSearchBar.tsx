import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { MappableControlPoint } from '@/entities/control-point'
import { PointTypeIcon } from '@/entities/control-point'
import { useDismiss } from '@/shared/lib/useDismiss'
import { PILL, POPOVER } from '@/shared/ui/classes'

/** 결과 한 줄 높이 — 가상 스크롤 추정치와 실제가 같아야 스크롤이 튀지 않는다 */
const ROW_HEIGHT = 48

/**
 * 기준점 검색 (헤더 우측). 이름·관리번호로 찾고 고르면 그 점으로 지도를 이동한다.
 * 목록은 전부 로드돼 있어 입력 즉시 걸러지고, 결과는 개수 제한 없이 보여주되 보이는 줄만 그린다.
 */
export function PointSearchBar(props: { points: MappableControlPoint[]; onSelect: (cp: MappableControlPoint) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  useDismiss({ enabled: open, onDismiss: () => setOpen(false), ref: rootRef })

  // 관리번호에 영문이 섞여 있어(예: 41192D000001265) 대소문자를 가리지 않는다
  const keyword = query.trim().toLowerCase()
  const results = useMemo(
    () =>
      keyword
        ? props.points.filter(
            (p) => p.name.toLowerCase().includes(keyword) || p.pointNo.toLowerCase().includes(keyword),
          )
        : [],
    [props.points, keyword],
  )
  // 목록이 줄어들면 선택도 범위 안으로
  const active = Math.min(activeIndex, Math.max(results.length - 1, 0))
  const showList = open && keyword !== ''

  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
    getItemKey: (index) => results[index].id,
  })

  // 방향키로 옮긴 항목이 화면 밖이면 따라 스크롤
  useEffect(() => {
    if (showList && results.length > 0) virtualizer.scrollToIndex(active)
  }, [active, showList, results.length, virtualizer])

  function choose(cp: MappableControlPoint) {
    props.onSelect(cp)
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  // ↑↓로 결과를 옮겨 다니고 Enter로 고른다. 한글 조합 중에는 IME가 후보 이동에 키를 쓰므로 건드리지 않는다.
  function handleKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (results.length === 0) return
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => {
        const cur = Math.min(i, results.length - 1)
        return e.key === 'ArrowDown' ? Math.min(cur + 1, results.length - 1) : Math.max(cur - 1, 0)
      })
      return
    }
    if (e.key === 'Enter' && results.length > 0) choose(results[active])
  }

  return (
    <div ref={rootRef} className="relative w-[250px] max-lg:h-full max-lg:w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="기준점 이름·관리번호 검색"
        aria-label="기준점 검색"
        role="combobox"
        aria-expanded={showList}
        aria-controls="point-search-results"
        aria-autocomplete="list"
        aria-activedescendant={results.length > 0 ? `point-search-option-${active}` : undefined}
        autoComplete="off"
        // 좁은 화면에서는 상단 판 안의 한 자리라 제 알약(면·테두리·그늘)을 내려놓고 판의 높이를 그대로 채운다.
        // 왼쪽 여백 22px = 돋보기 15 + 그 뒤 7.
        // 포커스 테두리도 세우지 않는다 — 판 안에 든 자리라 테두리를 두르면 판 안에 또 하나의 상자가 생긴다.
        // 손으로 짚는 화면에서는 글자 깜빡임과 올라온 자판이 이미 어디를 치는지 알려 준다(넓은 화면은 그대로 둔다)
        className={`h-11 w-full pl-10 pr-3 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-teal-edge max-lg:h-full max-lg:border-0 max-lg:bg-transparent max-lg:pl-[22px] max-lg:pr-0 max-lg:shadow-none ${PILL}`}
      />
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3.5 top-1/2 size-[15px] -translate-y-1/2 text-ink-4 max-lg:left-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7.5" />
        <path d="m21 21-4.3-4.3" />
      </svg>

      {showList && (
        // 좁은 화면에서는 검색 칸이 아니라 그것을 담은 상단 판을 기준으로 뜬다 — 판의 좌우 변(12px)에 맞추고
        // 판 아래 8px 에 선다. 검색 칸 기준으로 두면 판 안쪽 폭만큼만 좁게 떠 판과 어긋난 두 겹으로 보인다
        <div className={`panel-in absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden max-lg:fixed max-lg:inset-x-[12px] max-lg:top-[64px] max-lg:mt-0 ${POPOVER}`}>
          {results.length === 0 ? (
            <p className="px-3 py-3 text-center text-[12px] text-ink-3">검색 결과 없음</p>
          ) : (
            <>
              <p className="border-b border-line-soft px-3 py-1.5 text-[11px] text-ink-3">{results.length}개</p>
              <div ref={listRef} className="max-h-72 overflow-y-auto">
                <ul id="point-search-results" role="listbox" className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
                  {virtualizer.getVirtualItems().map((item) => {
                    const cp = results[item.index]
                    return (
                      <li
                        key={item.key}
                        id={`point-search-option-${item.index}`}
                        role="option"
                        aria-selected={item.index === active}
                        className="absolute left-0 top-0 w-full"
                        style={{ height: ROW_HEIGHT, transform: `translateY(${item.start}px)` }}
                      >
                        <button
                          type="button"
                          onClick={() => choose(cp)}
                          onMouseEnter={() => setActiveIndex(item.index)}
                          className={`flex h-full w-full items-center gap-2 px-3 text-left ${
                            item.index === active ? 'bg-teal-wash' : ''
                          }`}
                        >
                          <PointTypeIcon type={cp.type} className="h-4 w-4 text-teal-text" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] text-ink">{cp.name}</span>
                            <span className="block truncate text-[11px] text-ink-3">{cp.pointNo}</span>
                          </span>
                          <span className="shrink-0 text-[11px] text-ink-3">{cp.type}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
