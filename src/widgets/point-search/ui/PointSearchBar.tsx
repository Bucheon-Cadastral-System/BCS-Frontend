import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ControlPoint } from '@/entities/control-point'
import { PointTypeIcon } from '@/entities/control-point'
import { useDismiss } from '@/shared/lib/useDismiss'

/** 결과 한 줄 높이 — 가상 스크롤 추정치와 실제가 같아야 스크롤이 튀지 않는다 */
const ROW_HEIGHT = 48

/**
 * 기준점 검색 (헤더 우측). 이름·관리번호로 찾고 고르면 그 점으로 지도를 이동한다.
 * 목록은 전부 로드돼 있어 입력 즉시 걸러지고, 결과는 개수 제한 없이 보여주되 보이는 줄만 그린다.
 */
export function PointSearchBar(props: { points: ControlPoint[]; onSelect: (cp: ControlPoint) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  useDismiss({ enabled: open, onDismiss: () => setOpen(false), ref: rootRef })

  const keyword = query.trim()
  const results = useMemo(
    () => (keyword ? props.points.filter((p) => p.name.includes(keyword) || p.pointNo.includes(keyword)) : []),
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

  function choose(cp: ControlPoint) {
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
    <div ref={rootRef} className="relative w-64">
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
        placeholder="점 검색"
        aria-label="기준점 검색"
        role="combobox"
        aria-expanded={showList}
        aria-controls="point-search-results"
        aria-activedescendant={results.length > 0 ? `point-search-option-${active}` : undefined}
        autoComplete="off"
        className="w-full rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 pr-10 text-[13px] text-white backdrop-blur-md transition-all placeholder:text-white/30 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
      />
      <button
        type="button"
        onClick={() => results.length > 0 && choose(results[active])}
        aria-label="검색"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white/40 transition-colors hover:text-blue-300"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>

      {showList && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-center text-[12px] text-gray-500 dark:text-gray-400">검색 결과 없음</p>
          ) : (
            <>
              <p className="border-b border-gray-200 px-3 py-1.5 text-[11px] text-gray-500 dark:border-gray-700 dark:text-gray-400">
                {results.length}개
              </p>
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
                            item.index === active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          }`}
                        >
                          <PointTypeIcon type={cp.type} className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] text-gray-900 dark:text-gray-100">{cp.name}</span>
                            <span className="block truncate text-[11px] text-gray-400 dark:text-gray-500">{cp.pointNo}</span>
                          </span>
                          <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">{cp.type}</span>
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
