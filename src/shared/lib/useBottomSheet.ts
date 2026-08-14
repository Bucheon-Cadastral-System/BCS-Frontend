import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useDismiss } from './useDismiss'
import { useSheetDrag } from './useSheetDrag'

/**
 * 시트가 멈춰 서는 자리는 둘뿐이다.
 *
 * <p>content 는 안에 든 것이 다 보이는 높이, full 은 화면을 다 덮는 높이다. 그 사이 아무 데나 세워 두는
 * 자유 높이는 두지 않는다 — 손을 뗀 자리마다 시트가 조금씩 다르게 서면 같은 화면을 두 번 열었을 때
 * 모양이 달라, 어디까지 읽을 수 있는지를 열 때마다 다시 가늠하게 된다.
 */
export type SheetStop = 'content' | 'full'

/** 화면을 다 덮었을 때 위에 남기는 틈(px) — 시트의 둥근 어깨가 보일 만큼만 남긴다 */
const FULL_GAP = 10
/** 내용이 화면보다 길어 '다 보이는 높이'를 잡을 수 없을 때 대신 쓰는 화면 비율 */
const FALLBACK_RATIO = 0.6
/** 이보다 낮게는 세우지 않는다 — 손잡이와 머리말만 남은 시트는 읽을 것이 없다 */
const MIN_HEIGHT = 240
/**
 * 목록 시트가 처음 서는 높이(화면 대비).
 *
 * <p>목록 패널은 남는 자리를 채우는 배치라 '안에 든 것의 높이'라는 것이 없다 — 시트를 키우면 목록이
 * 따라 커지고 줄이면 따라 줄어들 뿐이라 재도 늘 지금 높이가 나온다. 그래서 시안이 정한 높이를 그대로 쓴다
 * (시안 390×844, 안전 영역 46/24 → 판이 서는 자리 116px, 남는 682px = 0.855).
 */
export const LIST_SHEET_RATIO = 0.855
/** 다음 자리로 넘어가는 거리(px). 이보다 짧게 끌면 제자리로 돌아간다 */
const SNAP = 64
/** 오르내리는 시간(ms). 아래 SHEET_SLIDE 의 duration 과 같아야 다 내려가기 전에 사라지지 않는다 */
const SLIDE_MS = 240
/** 오르내림에 거는 전이 — 끄는 동안에는 손끝을 그대로 따라야 하므로 뗀다 */
const SHEET_SLIDE = 'max-lg:transition-[height] max-lg:duration-[240ms] max-lg:ease-out'

/** 시트로 서는 위젯에 그대로 펼쳐 넣는 값 */
export interface SheetHandle {
  /** 시트의 뿌리(손잡이·머리말·굴림 영역을 담은 요소)에 건다 */
  rootRef: (el: HTMLElement | null) => void
  /** 시트 안에서 굴러가는 영역에 건다 — 이 안의 내용이 '다 보이는 높이'를 정한다 */
  scrollRef: (el: HTMLElement | null) => void
  /** 손잡이(와 머리말 제목)에 펼쳐 넣는다 */
  handleProps: ReturnType<typeof useSheetDrag>['handleProps']
  /** 높이를 그리는 자리에 붙인다 — 재는 동안에는 내용 높이대로 두고 눈에서만 감춘다 */
  className: string
  /** 위 클래스가 읽는 변수 */
  style: CSSProperties
}

/**
 * 아래에서 올라오는 시트의 오르내림 전부 — 여는 높이, 두 자리 사이의 스냅, 닫기.
 *
 * <p>열면 안에 든 것이 다 보이는 높이까지 저절로 올라간다. 거기서 위로 끌면 화면을 다 덮고, 다시 내리면
 * 처음 높이로 돌아온다. 처음 높이에서 더 내리거나 시트 바깥을 누르면 닫힌다.
 *
 * <p>높이만으로 그린다. 시트의 아래 변은 늘 화면 아래에 붙어 있으므로 높이를 줄이면 그대로 내려가는
 * 모양이 되고 0 이 되면 화면 밖으로 빠진다. 옮기기(transform)와 섞으면 끌던 손끝과 스냅으로 도로
 * 붙는 자리가 어긋난다.
 *
 * <p>'다 보이는 높이'는 열기 직전 한 프레임을 내용 높이대로 세워 재고(그 프레임은 눈에서 감춘다),
 * 그 뒤로는 굴림 영역의 안팎을 더해 이어서 고친다. 사진이 늦게 도착하거나 비고 칸이 펴져도 따라간다.
 *
 * <p>다 내려간 뒤에 onClosed 를 부른다 — 내려가는 동안에도 시트는 화면에 있어야 하기 때문이다.
 * 그 사이 다른 것을 골라 contentKey 가 바뀌면 닫던 것을 물리고 새 내용으로 그대로 세워 둔다.
 */
export function useBottomSheet(props: {
  /** 서 있어야 하는지 — 넓은 화면에서는 늘 false 로 준다 */
  open: boolean
  /** 다 내려갔다 — 이때 부르는 쪽이 실제로 시트를 끈다 */
  onClosed: () => void
  /** 화면 높이(px) */
  viewportHeight: number
  /** 지금 담고 있는 것 — 닫는 도중에 이 값이 바뀌면 닫기를 물린다 */
  contentKey?: string | null
  /**
   * 처음 서는 높이를 화면 대비 비율로 못박는다. 주지 않으면 안에 든 것을 재서 그 높이로 선다.
   *
   * <p>남는 자리를 채우는 배치(목록)에는 잴 것이 없으므로 비율로 준다.
   */
  ratio?: number
  /** 재서 세울 때의 최소 높이 — 안에 든 것이 아주 적어도 이보다 낮게 서지 않는다 */
  minHeight?: number
}): { height: number; stop: SheetStop; sheet: SheetHandle; requestClose: () => void } {
  const rootRef = useRef<HTMLElement | null>(null)
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null)
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null)
  const setRoot = useCallback((el: HTMLElement | null) => {
    rootRef.current = el
    setRootEl(el)
  }, [])

  /** 안에 든 것을 다 세웠을 때의 높이(px). 아직 재지 못했으면 null */
  const [natural, setNatural] = useState<number | null>(null)
  const [stop, setStop] = useState<SheetStop>('content')
  /** 올라와 있는지 — 여는 첫 프레임은 0 으로 두어야 올라오는 모습이 보인다 */
  const [raised, setRaised] = useState(false)
  const [drag, setDrag] = useState(0)

  const onClosedRef = useRef(props.onClosed)
  onClosedRef.current = props.onClosed
  const closeTimer = useRef<number | null>(null)
  const cancelClose = useCallback(() => {
    if (closeTimer.current === null) return
    clearTimeout(closeTimer.current)
    closeTimer.current = null
  }, [])

  const requestClose = useCallback(() => {
    setRaised(false)
    setDrag(0)
    cancelClose()
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null
      onClosedRef.current()
    }, SLIDE_MS)
  }, [cancelClose])

  // 열림이 바뀌는 순간에만 처음 자리로 되돌린다
  const wasOpen = useRef(false)
  useEffect(() => {
    const opening = props.open && !wasOpen.current
    wasOpen.current = props.open
    cancelClose()
    if (!props.open) {
      setRaised(false)
      setStop('content')
      setDrag(0)
      setNatural(null) // 다음에 열 때 그 내용으로 다시 잰다
      return
    }
    if (!opening) {
      setRaised(true) // 닫는 중에 다른 것을 골랐다 — 도로 세운다
      return
    }
    setStop('content')
    setDrag(0)
    // 두 프레임을 기다린다 — 한 프레임만 두면 높이를 재는 프레임과 겹쳐 0 인 채로 그려지는 프레임이 없어진다
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setRaised(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [props.open, props.contentKey, cancelClose])

  useEffect(() => cancelClose, [cancelClose])

  const dragState = useSheetDrag({
    onMove: setDrag,
    onSettle: (movedY) => {
      setDrag(0)
      if (movedY < -SNAP) {
        setStop('full')
        return
      }
      if (movedY > SNAP) {
        // 다 덮고 있었으면 한 자리만 내려온다. 한 번에 화면 밖으로 보내지 않는다
        if (stop === 'full') setStop('content')
        else requestClose()
      }
    },
  })

  // 아직 한 번도 재지 못했다면 이번 프레임은 내용 높이대로 세워 잰다. 그 프레임은 눈에서 감춘다
  const measuring = props.ratio === undefined && props.open && !raised && natural === null && scrollEl !== null
  const dragging = dragState.dragging

  useLayoutEffect(() => {
    if (props.ratio !== undefined || !props.open || rootEl === null || scrollEl === null) return
    const measure = () => {
      if (measuring) {
        // 높이를 매지 않은 프레임이라 뿌리의 높이가 곧 다 보이는 높이다.
        // 올림한다 — 1px 이라도 모자라면 굴림 막대가 생겨 '다 보인다'가 아니게 된다
        setNatural(Math.ceil(rootEl.getBoundingClientRect().height))
        return
      }
      // 다 보이는 자리에 가만히 서 있을 때만 이어서 잰다. 화면을 다 덮은 채로 재면 그 높이가 그대로
      // '다 보이는 높이'가 되어 버려, 내려오려 해도 같은 자리에 다시 선다
      if (!raised || dragging || stop !== 'content' || rootEl.clientHeight === 0) return
      // 손잡이·머리말(굴림 영역 바깥) + 굴림 영역 안에 든 것
      const chrome = rootEl.getBoundingClientRect().height - scrollEl.getBoundingClientRect().height
      let content = 0
      for (const child of scrollEl.children) content += child.getBoundingClientRect().height
      const next = Math.ceil(chrome + content)
      setNatural((current) => (current !== null && Math.abs(current - next) < 2 ? current : next))
    }
    measure()
    // 사진이 늦게 도착하거나 비고 칸이 펴지면 내용 높이가 달라진다
    const observer = new ResizeObserver(measure)
    observer.observe(rootEl)
    observer.observe(scrollEl)
    for (const child of scrollEl.children) observer.observe(child)
    return () => observer.disconnect()
  }, [props.open, props.contentKey, props.ratio, rootEl, scrollEl, measuring, raised, dragging, stop])

  const fullHeight = Math.max(MIN_HEIGHT, props.viewportHeight - FULL_GAP)
  const floor = Math.max(MIN_HEIGHT, props.minHeight ?? 0)
  // 비율로 못박았으면 그 높이, 아니면 잰 높이. 잰 높이가 화면을 넘으면 화면의 일정 몫만 차지한다
  const contentHeight =
    props.ratio !== undefined
      ? Math.min(fullHeight, Math.round(props.viewportHeight * props.ratio))
      : natural !== null && natural <= fullHeight
        ? Math.min(fullHeight, Math.max(natural, floor))
        : Math.min(fullHeight, Math.round(props.viewportHeight * FALLBACK_RATIO))
  const target = stop === 'full' ? fullHeight : contentHeight
  const height = raised ? Math.min(Math.max(target - drag, 0), fullHeight) : 0

  // 시트 바깥을 누르거나 Esc — 어느 자리에 서 있든 닫는다
  useDismiss({ enabled: props.open && raised, onDismiss: requestClose, ref: rootRef })

  return {
    height,
    stop,
    requestClose,
    sheet: {
      rootRef: setRoot,
      scrollRef: setScrollEl,
      handleProps: dragState.handleProps,
      className: measuring ? 'max-lg:invisible max-lg:h-auto' : `max-lg:h-[var(--sheet-h)] ${dragging ? '' : SHEET_SLIDE}`,
      style: { '--sheet-h': `${height}px` } as CSSProperties,
    },
  }
}
