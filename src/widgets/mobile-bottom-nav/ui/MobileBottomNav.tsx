import { useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTabSlide } from '@/shared/lib/useTabSlide'
import { PILL } from '@/shared/ui/classes'

/**
 * 독의 한 자리 — 아이콘과 이름이 가로로 나란히 선다.
 *
 * <p>높이는 38px 다. 세로로는 손가락 기준(44px)에 못 미치지만 독이 화면 폭을 다 쓰면서 자리 하나가
 * 가로로 150px 넘게 넓어졌다 — 과녁의 넓이는 두 변의 곱이고, 좁아진 쪽은 넓어진 쪽이 갚는다.
 */
const SLOT = 'relative z-[1] flex h-[38px] min-w-0 flex-1 items-center justify-center gap-[6px] whitespace-nowrap rounded-ctl text-[12px] transition-colors [&_svg]:size-4'

/**
 * 좁은 화면 아래에 뜨는 한 줄 독 — 왼쪽에 프로젝트·기준점 두 탭, 구분선 너머 오른쪽에 지도 컨트롤.
 *
 * <p>지도 위에 떠 있는 조각을 줄이려고 한 줄에 모았다. 화면을 옮기는 것과 지도를 만지는 것은 성격이
 * 다르므로 사이에 선을 하나 긋는다. 그 오른쪽에 무엇이 설지는 부르는 쪽이 정한다(controls).
 *
 * <p>내 정보는 여기 두지 않는다. 상단 판의 아바타가 그 자리를 맡는다 — 사람은 하나뿐이고 늘 같은 것을
 * 여는 자리라, 지도를 오가며 누르는 탭과 같은 줄에 세울 이유가 없다.
 *
 * <p>켜진 자리는 큰 판 안에서 작은 상자로 채우고, 그 상자가 탭 사이를 미끄러져 옮겨 간다. 자리마다 면을
 * 따로 켜고 끄면 자리가 옮겨 간다는 것이 보이지 않는다.
 *
 * <p>탭 아이콘은 부르는 쪽이 props 로 준다. 헤더의 아이콘을 여기서 바로 수입하면 widgets 끼리
 * 마주 보고 수입하는 모양이 된다.
 *
 * <p>lg 이상 화면에서 이 위젯을 그릴지는 부르는 쪽(MapPage)이 정한다 — 그래서 폭을 재는 미디어
 * 쿼리는 두지 않는다. 다만 뜬 독이 화면의 어디에 앉을지(fixed)는 이 위젯이 스스로 정한다.
 */
export function MobileBottomNav(props: {
  tabs: { key: string; label: string; icon: ReactNode; active: boolean; onClick: () => void }[]
  /** 구분선 오른쪽에 서는 지도 컨트롤 — 탭과 같은 높이(38px)의 정사각 자리들이다 */
  controls?: ReactNode
}) {
  // 켜진 자리를 따라 미끄러지는 면
  const [row, setRow] = useState<HTMLDivElement | null>(null)
  const activeKey = props.tabs.find((tab) => tab.active)?.key ?? null
  // 손끝으로 훑는 동안에는 손 아래 자리를 보여 준다. 실제로 켜지는 것은 손을 뗄 때다
  const sliding = useTabSlide({
    row,
    attr: 'data-slot',
    onSelect: (key) => props.tabs.find((tab) => tab.key === key)?.onClick(),
  })
  const shownKey = sliding?.key ?? activeKey
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(null)
  useLayoutEffect(() => {
    const el = shownKey === null ? null : row?.querySelector<HTMLElement>(`[data-slot="${shownKey}"]`)
    if (!row || !el) return // 꺼진 동안에는 마지막 자리를 그대로 두고 흐리게만 한다
    const place = () => {
      // 화면 좌표로 재서 내비 상자를 기준으로 환산한다
      const bounds = el.getBoundingClientRect()
      const base = row.getBoundingClientRect()
      const next = { left: bounds.left - base.left, width: bounds.width }
      // 훑는 동안에는 손끝을 그대로 따라간다 — 탭 단위로 툭 옮겨 가면 손끝과 면이 따로 논다.
      // 양끝은 탭 줄을 벗어나지 않게 잡아 둔다(구분선 너머 지도 컨트롤 자리로는 넘어가지 않는다)
      if (sliding !== null) {
        const slots = [...row.querySelectorAll<HTMLElement>('[data-slot]')]
        const first = (slots[0]?.getBoundingClientRect().left ?? bounds.left) - base.left
        const last = (slots.at(-1)?.getBoundingClientRect().right ?? bounds.right) - base.left
        next.left = Math.min(Math.max(sliding.x - next.width / 2, first), last - next.width)
      }
      // 같은 값으로 다시 넣으면 렌더가 끝없이 돈다
      setMarker((current) => (current && current.left === next.left && current.width === next.width ? current : next))
    }
    place()
    if (sliding !== null) return // 훑는 동안에는 손끝이 자리를 정한다
    // 자리가 달라지는 것은 켜진 탭이 옮겨 갈 때(위 deps)와 상자가 늘고 줄 때(화면 돌리기)뿐이다.
    // 탭 배열을 deps 에 두면 그 배열이 렌더마다 새 참조라 부모가 그려질 때마다 두 번씩 재게 되고,
    // 재는 일은 그리다 만 배치를 강제로 끝내는 일이라 지도 위에서 값이 싸지 않다
    const observer = new ResizeObserver(place)
    observer.observe(row)
    observer.observe(el)
    return () => observer.disconnect()
  }, [shownKey, row, sliding])

  return (
    <div
      ref={setRow}
      // 상단 판과 같은 좌우 여백(12px)에 서고 아래로 24px 띄운다.
      // 두께도 상단 판과 같은 46px 다 — 화면 위아래에 같은 굵기의 띠가 하나씩 서면 지도가 그만큼 넓어 보인다.
      // 24px 은 화면 아래 변이 아니라 안전 영역 위에서 잰다. 지금 문서는 안전 영역 안에 그려져 그 값이 0 이지만,
      // 홈 표시줄 아래까지 덮고 그리게 되면(viewport-fit=cover) 이 값이 그만큼 커져 독이 표시줄을 비켜선다
      // touch-none: 가로로 훑는 손짓을 브라우저가 먼저 가져가지 않게 한다. 이 줄 아래에는 굴릴 것이 없다
      className={`fixed inset-x-[12px] bottom-[calc(env(safe-area-inset-bottom,0px)+24px)] z-30 flex h-[46px] touch-none items-center gap-1 px-1 ${PILL}`}
    >
      {marker && (
        <span
          aria-hidden="true"
          style={{ left: marker.left, width: marker.width }}
          // 훑는 동안에는 전이를 뗀다 — 손끝과 면이 어긋나면 그 어긋남이 곧 지연으로 읽힌다
          className={`absolute top-1/2 h-[38px] -translate-y-1/2 rounded-ctl bg-teal-wash-strong ${
            sliding === null ? 'transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]' : ''
          } ${shownKey === null ? 'opacity-0' : 'opacity-100'}`}
        />
      )}

      {props.tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          data-slot={tab.key}
          onClick={tab.onClick}
          aria-pressed={tab.active}
          className={`${SLOT} ${tab.active ? 'font-semibold text-teal-text' : 'font-medium text-ink-3'}`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}

      {props.controls !== undefined && (
        <>
          {/* 왼쪽은 화면을 옮기는 것, 오른쪽은 지도를 만지는 것 — 성격이 이 선으로 갈린다 */}
          <span className="mx-[2px] h-[22px] w-px shrink-0 bg-line-field" aria-hidden />
          {props.controls}
        </>
      )}
    </div>
  )
}
