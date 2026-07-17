import { useEffect, useState } from 'react'
import type { ControlPoint, PointType } from '@/entities/control-point'

export interface ClusterPopup {
  points: ControlPoint[]
  /** 클러스터 뱃지 중심 픽셀 */
  x: number
  y: number
  /** 지도 뷰포트 크기 */
  w: number
  h: number
}

interface ClusterListProps {
  popup: ClusterPopup | null
  surveyedIds: Set<string>
  surveyMode: boolean
  onFocus: (cp: ControlPoint) => void
  onClose: () => void
}

const TYPE_DOT: Record<PointType, string> = {
  지적삼각점: 'bg-gray-900',
  지적삼각보조점: 'bg-gray-500',
  지적도근점: 'bg-gray-700',
}

const WIDTH = 260

/** clusterStyle 의 반경 버킷과 동일 (뱃지 크기만큼 옆으로 띄우려고) */
function badgeRadius(count: number): number {
  if (count < 10) return 15
  if (count < 50) return 19
  if (count < 200) return 24
  return 29
}

export function ClusterList({ popup, surveyedIds, surveyMode, onFocus, onClose }: ClusterListProps) {
  const [data, setData] = useState<ClusterPopup | null>(popup)
  const [shown, setShown] = useState(false)

  // 열림: 초기 hidden 상태를 한 번 그린 뒤(double rAF) shown=true → 팝인. 닫힘: shown=false 후 언마운트.
  useEffect(() => {
    if (popup) {
      setData(popup)
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
  }, [popup])

  // 비모달 팝오버라 focus-trap은 넣지 않되(지도 위 임시 UI), Esc 로는 닫히게. (항목은 이미 <button>이라 Tab/Enter 가능)
  useEffect(() => {
    if (!popup) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [popup, onClose])

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
      className="absolute z-10 flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
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
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
        <strong className="flex-1 text-[13px] text-gray-900">이 위치 {data.points.length}개</strong>
        <button type="button" onClick={onClose} aria-label="닫기" className="cursor-pointer text-lg leading-none text-gray-500">×</button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto py-1">
        {data.points.map((cp) => {
          const status = cp.lost ? '망실' : surveyMode ? (surveyedIds.has(cp.id) ? '조사완료' : '미조사') : ''
          const statusCls = cp.lost ? 'text-red-600' : status === '조사완료' ? 'text-blue-600' : 'text-gray-400'
          return (
            <li key={cp.id}>
              <button
                type="button"
                onClick={() => onFocus(cp)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TYPE_DOT[cp.type]}`} />
                <span className="flex-1 truncate text-[13px] text-gray-800">{cp.name}</span>
                <span className="shrink-0 text-[11px] text-gray-400">{cp.type}</span>
                {status && <span className={`shrink-0 text-[11px] font-semibold ${statusCls}`}>{status}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
