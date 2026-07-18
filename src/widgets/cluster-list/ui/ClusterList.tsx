import { useEffect, useMemo, useRef, useState } from 'react'
import type { ControlPoint } from '@/entities/control-point'
import { PointTypeIcon, StatusMark } from '@/entities/control-point'

export interface ClusterPopup {
  points: ControlPoint[]
  /** 클러스터 뱃지 지도 좌표 (지도 이동 시 픽셀 재투영해 따라감) */
  coord: number[]
  /** 클러스터 뱃지 중심 픽셀 */
  x: number
  y: number
  /** 지도 뷰포트 크기 */
  w: number
  h: number
  /** 팝오버 인스턴스 id (위치 갱신과 열림 애니 구분용) */
  id: number
}

interface ClusterListProps {
  popup: ClusterPopup | null
  surveyedIds: Set<string>
  lostIds: Set<string>
  surveyMode: boolean
  onFocus: (cp: ControlPoint) => void
  onClose: () => void
}

const WIDTH = 260

/** clusterStyle 의 반경 버킷과 동일 (뱃지 크기만큼 옆으로 띄우려고) */
function badgeRadius(count: number): number {
  if (count < 10) return 15
  if (count < 50) return 19
  if (count < 200) return 24
  return 29
}

export function ClusterList({ popup, surveyedIds, lostIds, surveyMode, onFocus, onClose }: ClusterListProps) {
  const [data, setData] = useState<ClusterPopup | null>(popup)
  const [shown, setShown] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)

  // 위치/내용은 매 popup 변경마다 반영(지도 따라 이동 포함)
  useEffect(() => {
    if (popup) setData(popup)
  }, [popup])

  // 열림 애니는 '새 팝오버(id 변경)'일 때만 재생 — 위치 갱신(같은 id)에는 재발동 안 함. 닫힘=shown off 후 언마운트.
  const openId = popup?.id ?? null
  useEffect(() => {
    if (openId != null) {
      if (listRef.current) listRef.current.scrollTop = 0 // 새 뱃지(다른 id) → 이전 스크롤 안 물려받게 초기화
      setShown(false)
      let r2 = 0
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setShown(true))
      })
      return () => {
        cancelAnimationFrame(r1)
        cancelAnimationFrame(r2)
      }
    }
    setShown(false)
    const t = setTimeout(() => setData(null), 170)
    return () => clearTimeout(t)
  }, [openId])

  // 비모달 팝오버라 focus-trap은 넣지 않되(지도 위 임시 UI), Esc 로는 닫히게. (항목은 이미 <button>이라 Tab/Enter 가능)
  useEffect(() => {
    if (!popup) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [popup, onClose])

  // onFocus 는 ref 로 참조 → 아래 rows 메모의 의존성에서 빼서 매 렌더마다 재생성 안 되게(콜백 정체성 무관)
  const onFocusRef = useRef(onFocus)
  useEffect(() => {
    onFocusRef.current = onFocus
  })

  // ★ 성능: 지도 팬(뱃지 클릭 시) 동안 위치(top/left)만 바뀌는데도 매 프레임 리렌더된다.
  //   행 목록은 points/조사상태에만 의존하므로 메모해 위치 갱신엔 재조립·재조정 안 되게 함(같은 엘리먼트 → 서브트리 bail-out).
  const members = data?.points
  const rows = useMemo(
    () =>
      members?.map((cp) => {
        const status = surveyMode ? (lostIds.has(cp.id) ? '망실' : surveyedIds.has(cp.id) ? '조사완료' : '미조사') : ''
        return (
          <li key={cp.id}>
            <button
              type="button"
              onClick={() => onFocusRef.current(cp)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {status && <StatusMark status={status} onLight />}
              <PointTypeIcon type={cp.type} className="h-4 w-4 text-gray-700 dark:text-gray-200" />
              <span className="flex-1 truncate text-[13px] text-gray-800 dark:text-gray-200">{cp.name}</span>
              <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">{cp.type}</span>
            </button>
          </li>
        )
      }),
    [members, surveyedIds, lostIds, surveyMode],
  )

  if (!data) return null

  const width = Math.min(WIDTH, data.w - 16) // 좁은 화면에선 뷰포트에 맞춰 축소
  const gap = badgeRadius(data.points.length) + 12
  const placeLeft = data.x + gap + width > data.w
  // 뱃지 오른쪽(기본)/왼쪽 배치 후, 최종 left를 뷰포트 [8, w-width-8]로 클램프(좁은 화면서 화면 밖 방지)
  const rawLeft = placeLeft ? data.x - gap - width : data.x + gap
  const left = Math.min(Math.max(rawLeft, 8), Math.max(8, data.w - width - 8))
  const top = Math.min(Math.max(data.y - 24, 8), Math.max(8, data.h - 200))

  return (
    <aside
      className="absolute z-10 flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
      style={{
        top,
        left,
        width,
        maxHeight: data.h - top - 8,
        transformOrigin: placeLeft ? 'right center' : 'left center',
        transform: shown ? 'scale(1)' : 'scale(0.85)',
        opacity: shown ? 1 : 0,
        transition: 'transform 150ms cubic-bezier(0.34, 1.5, 0.5, 1), opacity 120ms ease',
      }}
    >
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <strong className="flex-1 text-[13px] text-gray-900 dark:text-gray-100">이 위치 {data.points.length}개</strong>
        <button type="button" onClick={onClose} aria-label="닫기" className="cursor-pointer text-lg leading-none text-gray-500 dark:text-gray-400">×</button>
      </div>
      <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-1">
        {rows}
      </ul>
    </aside>
  )
}
