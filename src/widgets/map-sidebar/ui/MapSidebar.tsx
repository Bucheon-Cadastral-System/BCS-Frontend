import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PanelKey } from '@/shared/model/panel'
import { useVirtualizer } from '@tanstack/react-virtual'
import { StatusDistributionBar, SURVEY_STATUS_DOT, SURVEY_STATUS_LABEL, SURVEY_STATUS_ORDER, deriveSurveyStatus } from '@/entities/survey-record'
import type { SurveyResult, SurveyStatus } from '@/entities/survey-record'
import { RefreshIcon } from '@/shared/ui/RefreshIcon'
import { Skeleton, SkeletonRows } from '@/shared/ui/Skeleton'
import { Spinner } from '@/shared/ui/Spinner'
import { CHIP_BTN, CHIP_BTN_DANGER, ICON_BTN, ICON_BTN_DANGER, PANEL, PANEL_HEADER, PILL, ROW_ACCENT } from '@/shared/ui/classes'
import { percent } from '@/shared/lib/percent'
import { formatDate } from '@/shared/lib/date'
import type { SheetHandle } from '@/shared/lib/useBottomSheet'
import { SURVEY_ONGOING_LABEL, isProjectComplete, type SurveyProject } from '@/entities/survey-project'
import type { MappableControlPoint, PointType } from '@/entities/control-point'
import { POINT_TYPES, PointTypeIcon, StatusMark } from '@/entities/control-point'

/** 좌측 레일에서 열 수 있는 패널 종류 */

/**
 * 접힌 점 목록 행의 높이(px). 아래 PointRow 의 h-[34px] 와 반드시 같아야 한다 —
 * 가상 스크롤은 이 추정으로 전체 높이를 잡아 두고 그려진 행을 실측해 고치는데,
 * 둘이 어긋나면 굴리는 동안 전체 높이가 계속 고쳐져 막대와 손 위치가 밀린다.
 */
const ROW_HEIGHT = 34

/**
 * 기준점 목록에 서는 줄의 높이(px). 아래 각 줄이 실제로 그리는 높이와 반드시 같아야 한다 —
 * 가상 스크롤이 이 값으로 전체 높이와 자리를 잡으므로, 어긋나면 굴리는 동안 줄이 밀린다.
 * head=TypeHead 의 h-[48px], point=PointRow 의 h-[34px], empty=빈 문구(py-6), loading=자리표시 6줄+py-1.
 */
const POINT_LIST_HEIGHTS = { head: 48, point: ROW_HEIGHT, empty: 68, loading: 6 * ROW_HEIGHT + 8 } as const

/** 패널 상단 검색창 — 프로젝트·기준점 두 패널이 같은 모양을 쓴다 */
const PANEL_SEARCH_INPUT =
  'h-[34px] w-full rounded-ctl border border-line-field bg-field pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-teal-edge'
/** 패널 상단 추가 버튼 — 프로젝트·기준점 두 패널이 같은 모양을 쓴다 */
const PANEL_ADD_BTN =
  'relative flex h-10 w-full items-center justify-center rounded-ctl border-[1.5px] border-teal-btn-edge bg-teal-wash text-[13px] font-semibold tracking-[-.01em] text-teal-label transition-colors hover:border-teal-text hover:bg-teal-wash-strong'
/** 패널이 미끄러져 나가는 시간(ms) — 본문을 트리에서 빼는 시점이 애니메이션보다 빨라선 안 된다 */
const PANEL_SLIDE_MS = 220
/** 프로젝트 상세 레이어가 밀려 나가는 시간(ms) — 본문을 트리에서 빼는 시점이 애니메이션보다 빨라선 안 된다 */
const DETAIL_SLIDE_MS = 200
/** 조사 프로젝트를 안 고른 목록(기준점 탭)에서 상태 판정에 넘길 빈 맵 */
const EMPTY_RESULTS: ReadonlyMap<string, SurveyResult> = new Map()

interface MapSidebarProps {
  // 조사 프로젝트
  projects: SurveyProject[]
  activeProjectId: string | null
  onChangeActive: (id: string | null) => void
  /** 직접 생성 요청 — 값 입력과 대상 지정은 페이지의 모달이 받는다 */
  onCreate: () => void
  /** 파일로 등록 요청 — 파일 고르기부터 페이지의 모달이 받는다 */
  onImportProjects: () => void
  onEditProject: (project: SurveyProject) => void
  onDeleteProject: (project: SurveyProject) => void
  /** 대상 기준점을 파일로 내보낸다 */
  onExportProject: (project: SurveyProject) => void
  /** 파일을 만드는 중 — 그동안 내보내기 버튼이 잠긴다 */
  exporting?: boolean
  // 기준점 목록
  points: MappableControlPoint[]
  /** 고른 조사의 대상 점 — 조사를 고르지 않았으면 points 와 같다 */
  targetPoints: MappableControlPoint[]
  /** 점 id별 조사 결과. 맵에 없으면 미조사 */
  resultById: ReadonlyMap<string, SurveyResult>
  onFocusPoint: (cp: MappableControlPoint) => void
  /**
   * 지금 고른 점 — 그 줄에 강조가 선다.
   *
   * <p>여기서 따로 들고 있지 않는다. 고름은 지도의 마커·상세 카드와 함께 걸리는 화면 전체의 값이라,
   * 목록이 제 것을 하나 더 두면 상세를 닫아도 줄이 강조된 채 남거나 그 반대가 된다.
   */
  selectedPointId: string | null
  /** 강조된 줄을 다시 눌렀다 — 고름을 놓는다(상세도 함께 닫힌다) */
  onDeselectPoint: () => void
  // 서버 조회 진행 여부 — 로딩 중엔 '없습니다' 대신 자리표시를 보여준다
  projectsLoading?: boolean
  pointsLoading?: boolean
  recordsLoading?: boolean
  /** 고른 조사의 대상 목록을 받아오는 중 — 도착 전엔 대상이 0건이라 진행률·목록을 자리표시로 둔다 */
  targetsLoading?: boolean
  /** 이 패널이 쓰는 것을 다시 받는다 — 어느 겹을 보고 있는지는 패널이 안다 */
  onRefresh: (scope: RefreshScope) => void
  /** 지금 받고 있는 자리 — 그 자리의 버튼만 잠긴다 */
  refreshing: RefreshScope | null
  // 도구
  /** 기준점 한 점 추가 시작 — 입력은 페이지의 모달이 받는다 */
  onStartAddPoint: () => void
  /** 기준점 파일 등록 시작 — 파일 고르기부터 페이지의 모달이 받는다 */
  onImportPoints: () => void
  /** 게스트처럼 조회만 가능한 화면 — 등록·수정·삭제 입구를 모두 내린다 */
  readOnly?: boolean
  // 사용자 관리 (어드민)
  isAdmin: boolean
  onOpenUserManagement: () => void
  /** 지금 열려 있는 패널 — 헤더 탭이 정한다 */
  open: PanelKey | null
  /** 칩으로 접힌 상태 — 닫힘 모양이 갈린다(접힘=칩 자리로 말려 올라감, 닫힘=위로 미끄러져 나감) */
  minimized: boolean
  /** 접어 두기 — 고른 것은 그대로 두고 패널만 칩으로 줄인다 */
  onMinimize: () => void
  /** 닫기 — 고른 것을 놓고 패널을 끈다 */
  onClose: () => void
  /** 패널 너비 — 위에 선 헤더 알약과 같은 값을 쓴다 */
  width: number
  /**
   * 좁은 화면에서 아래에서 올라오는 시트로 설 때의 손잡이.
   *
   * <p>얼마나 올라와 서고 언제 닫히는지는 화면 전체를 아는 쪽(useBottomSheet)이 정한다.
   * 여기서는 잡는 자리와 내용 높이를 재는 자리만 내어 준다.
   */
  sheet?: SheetHandle
}

/** 새로고침이 가리키는 자리 — 프로젝트 목록·프로젝트 정보·기준점 목록 */
export type RefreshScope = 'project' | 'project-detail' | 'points'

/** 손잡이·머리말에 붙는 시트 끌기 핸들러 */
type SheetDragHandleProps = SheetHandle['handleProps'] | undefined

/**
 * 지도 왼쪽에 떠 있는 패널. 화면을 밀지 않고 지도 위에 겹친다.
 * 어느 패널을 여는지는 헤더 탭이 정하고, 여기서는 그 패널의 내용만 그린다.
 */
export function MapSidebar(props: MapSidebarProps) {
  const open = props.open
  // 닫히는 동안에도 마지막 패널을 그려둬야 미끄러져 나가는 모습이 이어진다
  const [lastPanel, setLastPanel] = useState<PanelKey>('project')
  useEffect(() => {
    if (open) setLastPanel(open)
  }, [open])

  // 패널 본문은 '열려 있을 때만' 마운트(닫히면 슬라이드 아웃 후 지연 언마운트).
  // ★ 성능: 프로젝트가 펼쳐지면 본문에 점 수천 개(PointRow)가 그려지는데, 닫혀도 마운트돼 있으면
  //   패널과 무관한 리렌더마다 이 수천 행이 재조정돼 렉이 걸린다.
  const [renderBody, setRenderBody] = useState(false)
  useEffect(() => {
    if (open) {
      setRenderBody(true)
      return
    }
    const t = setTimeout(() => setRenderBody(false), PANEL_SLIDE_MS)
    return () => clearTimeout(t)
  }, [open])

  return (
      <aside
        ref={props.sheet?.rootRef}
        aria-hidden={!open}
        inert={!open}
        // 접힘(칩)일 때는 아래 변을 칩 높이까지 끌어올려 패널이 칩 자리로 말려 들어가는 모양을 만든다 —
        // bottom 은 인라인이 클래스(bottom-bar-clear)를 이기므로 펼치면 지우기만 하면 제자리로 풀린다
        // 폭·시트 높이는 CSS 변수로만 흘려보낸다 — lg:/max-lg: 중 어느 쪽이 실제로 읽어 쓰는지는 className 이 가른다.
        // 그래서 데스크톱 폭(--sidebar-width)이 좁은 화면에 그대로 새지 않는다
        style={{
          '--sidebar-width': props.width ? `${props.width}px` : undefined,
          // 넓은 화면에서만 쓰는 말림이다. 좁은 화면의 시트는 아래 변이 화면에 붙은 채 높이로만 오르내리므로,
          // 이 값이 새어 들어가면 시트가 화면 위쪽으로 튄다
          bottom: props.sheet === undefined && !open && props.minimized ? 'calc(100% - 120px)' : undefined,
          ...props.sheet?.style,
        } as CSSProperties}
        // 그림자는 위로 진다 — 값(0 -22px 50px rgba(0,0,0,.55))은 디자인이 확정한 임의값이라 토큰화하지 않는다.
        // 좁은 화면에서는 아래 변을 화면에 붙인 채 높이만 오르내린다(높이는 sheet.className 이 그린다)
        className={`absolute bottom-bar-clear left-4 top-[76px] z-20 flex flex-col overflow-hidden text-ink transition-[opacity,transform,bottom] duration-200 ease-out ${PANEL} lg:w-[var(--sidebar-width)] max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-auto max-lg:z-[46] max-lg:w-auto max-lg:rounded-b-none max-lg:bg-sheet max-lg:shadow-[0_-22px_50px_rgba(0,0,0,.55)] ${
          props.sheet?.className ?? ''
        } ${
          open
            ? 'translate-y-0 opacity-100'
            // 좁은 화면에서는 흐려지지 않는다 — 높이가 0 이 되며 그대로 내려가는 것이 닫히는 모습이고,
            // 흐려짐까지 겹치면 다 내려가기 전에 사라진다
            : `pointer-events-none opacity-0 max-lg:opacity-100 ${props.minimized ? '' : 'lg:-translate-y-2'}`
        }`}
      >
        {/* 시트 손잡이 — 좁은 화면 전용. 잡는 자리는 줄 전체이고, 그어 둔 막대는 그 자리를 눈으로만 알린다 */}
        {props.sheet && (
          <div
            aria-hidden
            className="flex shrink-0 justify-center py-[9px] lg:hidden"
            {...props.sheet.handleProps}
          >
            <span className="h-1 w-[38px] rounded-chip bg-line-field" />
          </div>
        )}
        {renderBody &&
          (lastPanel === 'project' ? (
            <ProjectPanel {...props} dragHandleProps={props.sheet?.handleProps} />
          ) : (
            <PointListPanel {...props} dragHandleProps={props.sheet?.handleProps} />
          ))}
      </aside>
  )
}

function PanelHeader(props: {
  title: string
  count?: number
  onRefresh?: () => void
  refreshing?: boolean
  onMinimize: () => void
  onClose: () => void
  dragHandleProps: SheetDragHandleProps
}) {
  return (
    <header className={PANEL_HEADER}>
      {/* 제목 영역에만 끌기를 건다 — header 전체에 걸면 포인터 캡처가 옆 버튼의 클릭까지 가로챈다 */}
      <h2 className="flex min-w-0 flex-1 items-baseline gap-[7px]" {...props.dragHandleProps}>
        <span className="text-[13.5px] font-semibold text-ink">{props.title}</span>
        {props.count !== undefined && (
          <span className="text-[11px] text-ink-3">
            총 <span >{props.count}</span>개
          </span>
        )}
      </h2>
      {props.onRefresh !== undefined && (
        <RefreshButton onRefresh={props.onRefresh} refreshing={props.refreshing === true} />
      )}
      <button type="button" onClick={props.onMinimize} aria-label="패널 접기" title="접기" className={ICON_BTN}>
        <IconMinimize />
      </button>
      <button
        type="button"
        onClick={props.onClose}
        aria-label="패널 닫기"
        title="닫기"
        className={ICON_BTN_DANGER}
      >
        <IconClose />
      </button>
    </header>
  )
}

/**
 * 프로젝트 목록. 행을 펼치는 것이 곧 그 조사를 고르는 것이다.
 * 펼쳐 놓은 조사와 지도에 반영되는 조사가 항상 같으므로, 드로어 안의 진행률·점별 기록이 늘 지금 보는 조사의 것이다.
 */
function ProjectPanel(props: MapSidebarProps & { dragHandleProps: SheetDragHandleProps }) {
  const [q, setQ] = useState('')
  const query = q.trim()
  // 조사명은 그때그때 붙이는 값이라 비고에 남긴 말로 찾는 경우도 있어 함께 훑는다
  const list = useMemo(
    () =>
      query === ''
        ? props.projects
        : props.projects.filter((p) => p.name.includes(query) || (p.note ?? '').includes(query)),
    [props.projects, query],
  )
  // 월별 묶음 — 조사는 회차 단위라 시작 월이 자연스러운 축이다. 최신 월이 위, 월 안에서도 최근 시작이 위
  const groups = useMemo(() => {
    const byMonth = new Map<string, SurveyProject[]>()
    for (const p of list) {
      const month = p.startedOn.slice(0, 7) // 'YYYY-MM'
      const bucket = byMonth.get(month)
      if (bucket) bucket.push(p)
      else byMonth.set(month, [p])
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, projects]) => ({
        month,
        // 같은 시작일은 id 로 고정한다 — 정렬이 못 가른 행의 순서는 서버 조회 순서라 수정할 때마다 널뛴다
        projects: [...projects].sort(
          (x, y) => y.startedOn.localeCompare(x.startedOn) || Number(y.id) - Number(x.id),
        ),
      }))
  }, [list])
  // 상세 레이어 — 고른 조사가 곧 화면 깊이다: 행을 누르면 들어가며 고르고, 뒤로 나오면 놓는다.
  // 패널 밖에서 활성 조사가 바뀌어도(가져오기 성공·챗봇 안내) 같은 규칙으로 상세가 선다.
  const activeProjectId = props.activeProjectId
  const active = activeProjectId !== null ? (props.projects.find((p) => p.id === activeProjectId) ?? null) : null
  // 빠져나가는 동안에도 잠깐 그려 둬야 밀려나는 모습이 이어진다
  const [lastProject, setLastProject] = useState<SurveyProject | null>(active)
  useEffect(() => {
    if (active !== null) {
      setLastProject(active)
      return
    }
    const t = setTimeout(() => setLastProject(null), DETAIL_SLIDE_MS)
    return () => clearTimeout(t)
  }, [active])
  const detailOn = active !== null
  const shownProject = active ?? lastProject
  // 나가는 동안 상세가 쓰던 데이터도 함께 붙잡는다 — 선택이 풀리는 순간 대상이 전체 기준점으로 되돌아가
  // 밀려나는 화면의 대상 수·진행률이 전체 수로 튀는 것을 막는다
  const [heldDetail, setHeldDetail] = useState({
    targetPoints: props.targetPoints,
    resultById: props.resultById,
  })
  useEffect(() => {
    if (active !== null) {
      setHeldDetail({ targetPoints: props.targetPoints, resultById: props.resultById })
    }
  }, [active, props.targetPoints, props.resultById])
  const detailData =
    active !== null ? { targetPoints: props.targetPoints, resultById: props.resultById } : heldDetail

  function handleNew() {
    props.onCreate()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 상세에 들어가면 패널의 이름도 그 겹을 따라간다 — 목록 수는 목록을 볼 때만 의미가 있어 함께 거둔다 */}
      <PanelHeader
        title={detailOn ? '프로젝트 정보' : '프로젝트 목록'}
        count={detailOn ? undefined : props.projects.length}
        onRefresh={() => props.onRefresh(detailOn ? 'project-detail' : 'project')}
        refreshing={props.refreshing === (detailOn ? 'project-detail' : 'project')}
        onMinimize={props.onMinimize}
        onClose={props.onClose}
        dragHandleProps={props.dragHandleProps}
      />

      {/* 목록과 상세는 같은 자리를 쓰는 두 겹이다 — 드로어(목록 스크롤 안의 또 다른 스크롤)는 휠을 가로채 접었다 */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
      <div
        aria-hidden={detailOn}
        inert={detailOn}
        className={`absolute inset-0 flex flex-col transition-[transform,opacity] duration-200 ease-out ${
          detailOn ? 'pointer-events-none -translate-x-8 opacity-0' : 'translate-x-0 opacity-100'
        }`}
      >
      <div className="flex shrink-0 flex-col gap-[9px] px-3 pb-3">
        <span className="relative block">
          <span className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4">
            <IconSearch />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="프로젝트명·비고 검색"
            className={PANEL_SEARCH_INPUT}
          />
        </span>
        {/* 입구에서 의도를 가른다 — 직접 만들기(대상 지정)와 파일로 만들기는 다른 창이 맡는다 */}
        {!props.readOnly && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={handleNew} className={PANEL_ADD_BTN}>
              <span className="mr-1.5 flex size-4 items-center justify-center text-teal-text">
                <IconPlus />
              </span>
              직접 추가
            </button>
            <button type="button" onClick={props.onImportProjects} className={PANEL_ADD_BTN}>
              <span className="mr-1.5 flex size-4 items-center justify-center text-teal-text">
                <IconUpload />
              </span>
              파일 업로드
            </button>
          </div>
        )}
      </div>

      <ul ref={props.sheet?.scrollRef} className="min-h-0 flex-1 overflow-y-auto border-t-2 border-t-teal">
        {list.length === 0 &&
          (props.projectsLoading ? (
            <li>
              <SkeletonRows rows={3} />
            </li>
          ) : (
            <li className="px-4 py-6 text-center text-[12.5px] text-ink-3">
              {props.projects.length === 0 ? '프로젝트 없음' : '검색 결과 없음'}
            </li>
          ))}
        {groups.map((group) => (
          <Fragment key={group.month}>
            {/* 월 머리글 — 회차가 쌓일수록 목록이 길어지므로 시작 월로 갈라 훑기 쉽게 한다 */}
            <li className="flex items-baseline gap-1.5 border-b border-line-row bg-soft px-3.5 py-[9px]">
              <span className="text-[12.5px] font-semibold text-teal-text">{monthLabel(group.month)}</span>
              <span className="text-[11px] text-ink-3">{group.projects.length}건</span>
            </li>
            {group.projects.map((p) => (
              <li key={p.id} className="border-b border-line-row">
                {/* 행 전체가 하나의 버튼 — 누르면 그 조사를 고르며 상세 레이어로 들어간다 */}
                <button
                  type="button"
                  onClick={() => props.onChangeActive(p.id)}
                  className="flex w-full items-center gap-[11px] py-3 pl-[13px] pr-3.5 text-left transition-colors hover:bg-hover"
                >
                  <ProjectStateMark complete={isProjectComplete(p)} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-semibold text-ink-2">{p.name}</span>
                    {/* 날짜는 자릿수가 서야 해서 고정폭이지만, 한글은 그 글꼴에 없어 다른 글꼴로 떨어진다 — 글자만 본문 글꼴로 되돌린다 */}
                    <span className="mt-[3px] block truncate text-[11.5px] text-ink-3">
                      {formatDate(p.startedOn)} ~{' '}
                      {p.endedOn === null ? (
                        <span className="font-sans text-teal-text">{SURVEY_ONGOING_LABEL}</span>
                      ) : (
                        formatDate(p.endedOn)
                      )}
                    </span>
                  </span>
                  {/* 오른쪽 화살 — 눌러 들어가는 겹(상세)이 있음을 알린다 */}
                  <span className="size-[15px] shrink-0 -rotate-90 text-ink-4">
                    <IconChevronDown />
                  </span>
                </button>
              </li>
            ))}
          </Fragment>
        ))}
      </ul>
      </div>

      {/* 상세 레이어 — 오른쪽에서 밀려 들어온다. 목록으로 나가면 고른 것도 놓는다 */}
      <div
        aria-hidden={!detailOn}
        inert={!detailOn}
        className={`absolute inset-0 flex flex-col transition-transform duration-200 ease-out ${
          detailOn ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
      >
        {shownProject !== null && (
          <ProjectDetail
            project={shownProject}
            targetPoints={detailData.targetPoints}
            resultById={detailData.resultById}
            recordsLoading={props.recordsLoading}
            targetsLoading={props.targetsLoading}
            pointsLoading={props.pointsLoading}
            selectedPointId={props.selectedPointId}
            onDeselectPoint={props.onDeselectPoint}
            onBack={() => props.onChangeActive(null)}
            onFocusPoint={props.onFocusPoint}
            onEdit={props.onEditProject}
            onDelete={props.onDeleteProject}
            onExport={props.onExportProject}
            exporting={props.exporting}
            readOnly={props.readOnly}
          />
        )}
      </div>
      </div>
    </div>
  )
}

/**
 * 프로젝트 상세 — 목록 위로 한 겹 들어온 화면. 값·진행률·비고·수정/삭제와 대상 기준점 목록을 담고,
 * 스크롤은 대상 목록 하나만 갖는다(목록 안 목록의 휠 가로채기를 없앤 구조).
 */
function ProjectDetail(props: {
  project: SurveyProject
  targetPoints: MappableControlPoint[]
  resultById: ReadonlyMap<string, SurveyResult>
  recordsLoading?: boolean
  targetsLoading?: boolean
  pointsLoading?: boolean
  selectedPointId: string | null
  onDeselectPoint: () => void
  onBack: () => void
  onFocusPoint: (cp: MappableControlPoint) => void
  onEdit: (project: SurveyProject) => void
  onDelete: (project: SurveyProject) => void
  onExport: (project: SurveyProject) => void
  exporting?: boolean
  readOnly?: boolean
}) {
  const p = props.project
  const total = props.targetPoints.length
  // 대상·기록 중 하나라도 오는 중이면 0/0·0% 가 잠깐 보이므로 자리표시로 둔다
  const progressLoading = props.recordsLoading === true || props.targetsLoading === true
  const surveyed = props.resultById.size
  const pct = percent(surveyed, total)
  // 망실도 조사불가도 기타도 '조사됨'이라 진행률에는 함께 세고, 내역에서는 결과별로 갈라 보여 준다.
  // 넷을 뭉뚱그리면 정상 건수가 부풀고 조사불가·기타는 화면 어디에도 드러나지 않는다
  const byStatus: Record<SurveyStatus, number> = { done: 0, lost: 0, unavailable: 0, etc: 0, todo: 0 }
  for (const result of props.resultById.values()) {
    byStatus[deriveSurveyStatus(result)]++
  }
  byStatus.todo = Math.max(0, total - surveyed)

  return (
    <>
      {/* 머리줄 — 어느 조사에 들어와 있는지와 나가는 길. 패널 머리말(PanelHeader)과 같은 크기로 세워 한 겹의 제목임을 말한다 */}
      <div className="flex shrink-0 items-center gap-1.5 border-t-2 border-t-teal py-2.5 pl-2 pr-2.5">
        <button
          type="button"
          onClick={props.onBack}
          title="목록으로"
          aria-label="목록으로"
          className="flex size-[30px] shrink-0 items-center justify-center rounded-chip text-ink-3 transition-colors hover:bg-hover hover:text-ink"
        >
          <span className="size-5">
            <IconChevronLeft />
          </span>
        </button>
        {/* 제목이 길면 줄여 세운다 — 오른쪽 버튼은 자리를 내주지 않는다 */}
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{p.name}</span>
        {!props.readOnly && (
          <button
            type="button"
            onClick={() => props.onExport(p)}
            disabled={props.exporting === true}
            title="내보내기"
            aria-label="내보내기"
            className={`${ICON_BTN} disabled:cursor-wait`}
          >
            {props.exporting === true ? <Spinner className="size-full" current /> : <IconDownload />}
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-baseline justify-between gap-2 px-3.5 text-[11.5px] text-ink-3">
        <span className="shrink-0">
          {formatDate(p.startedOn)} ~{' '}
          {p.endedOn === null ? <span className="text-teal-text">{SURVEY_ONGOING_LABEL}</span> : formatDate(p.endedOn)}
        </span>
        {/* 작성자 — 기간과 한 줄(우측). 인증 없이 만든 프로젝트는 기록이 없어 세우지 않는다 */}
        {p.authorName != null && <span className="min-w-0 truncate">작성자 {p.authorName}</span>}
      </div>

      <div className="shrink-0 px-3.5 pt-3">
        {progressLoading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ) : (
          <>
            <div className="mb-[7px] flex items-baseline text-[11.5px] text-ink-3">
              <span className="flex-1">
                조사 <b className="font-semibold text-teal-text">{surveyed}</b> / 전체 <span>{total}</span>
              </span>
              <span className="font-semibold text-teal-text">{pct}%</span>
            </div>
            {/* 채워진 길이는 그대로 조사한 만큼이라 진행률로 읽히면서, 그 안에서 무엇이 정상이고
                무엇이 망실인지까지 한 줄로 드러난다. 미조사는 칠하지 않아 바탕이 남은 일이 된다 */}
            <StatusDistributionBar countByStatus={byStatus} />
            {/* 결과별 내역 — 위 막대를 갈래별 개수로 풀어 적는다. 색은 막대·지도 마커와 같은 뜻으로 쓴다 */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-[5px] text-[11.5px] text-ink-3">
              {SURVEY_STATUS_ORDER.map((key) => (
                <StatusCount key={key} label={SURVEY_STATUS_LABEL[key]} count={byStatus[key]} dotClass={SURVEY_STATUS_DOT[key]} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 pt-3">
        <ProjectNote note={p.note ?? ''} />
      </div>

      {!props.readOnly && (
        <div className="flex shrink-0 gap-2 px-3.5 pt-2.5">
          <button type="button" onClick={() => props.onEdit(p)} className={`${CHIP_BTN} flex-1 py-1.5 text-[12px]`}>
            수정
          </button>
          <button
            type="button"
            onClick={() => props.onDelete(p)}
            className={`${CHIP_BTN_DANGER} flex-1 py-1.5 text-[12px]`}
          >
            삭제
          </button>
        </div>
      )}

      <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-line-soft pt-2">
        <p className="flex shrink-0 items-baseline gap-1.5 px-3.5 pb-1 text-[11px] font-medium tracking-[.08em] text-ink-3">
          대상 기준점 <span className="font-normal text-ink-4">{total}개</span>
        </p>
        <PointRowList
          points={props.targetPoints}
          onFocus={props.onFocusPoint}
          selectedId={props.selectedPointId}
          onDeselect={props.onDeselectPoint}
          survey={{ resultById: props.resultById }}
          loading={props.pointsLoading === true || props.targetsLoading === true}
        />
      </div>
    </>
  )
}

/** '2026-07' → '2026년 7월' — 프로젝트 목록의 월 머리글용 */
function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  return `${y}년 ${Number(m)}월`
}

/** 목록 행의 진행 상태 — 완료는 청록 체크, 진행 중은 회색 점 셋. */
function ProjectStateMark(props: { complete: boolean }) {
  return (
    <span
      aria-hidden
      // 프로젝트 행에 붙는 표식이라 무엇이 완료·진행 중인지는 행이 이미 말한다
      title={props.complete ? '완료' : SURVEY_ONGOING_LABEL}
      className={`flex size-[17px] shrink-0 items-center justify-center rounded-full border-2 ${
        props.complete ? 'border-teal text-teal' : 'border-idle text-ink-4'
      }`}
    >
      {props.complete ? (
        <svg viewBox="0 0 24 24" className="size-2.5" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 13 4 4L19 7" />
        </svg>
      ) : (
        <span className="flex items-center gap-[1.5px]">
          <i className="size-[2px] rounded-full bg-current" />
          <i className="size-[2px] rounded-full bg-current" />
          <i className="size-[2px] rounded-full bg-current" />
        </span>
      )}
    </span>
  )
}

/** 조사 결과 내역 한 칸 — 점 색으로 지도 마커·범례와 같은 상태를 가리킨다. */
function StatusCount(props: { label: string; count: number; dotClass: string }) {
  return (
    <span className="inline-flex items-center gap-[5px]">
      <i className={`inline-block size-2 rounded-full ${props.dotClass}`} aria-hidden />
      {props.label}
      <b className="font-normal text-ink-2">{props.count}</b>
    </span>
  )
}

/**
 * 조사에 기록한 비고. 수치와 달리 서술형 문장이므로 인용문처럼 세로선을 두어 구분한다.
 * 검색 대상 필드이므로 값이 없어도 자리는 유지한다.
 */
function ProjectNote(props: { note: string }) {
  return (
    <div className="mx-3.5 border-l-2 border-line-btn bg-soft px-2.5 py-2 text-[11.5px] leading-[1.6]">
      {props.note === '' ? (
        <p className="text-ink-4">내용 없음</p>
      ) : (
        <p className="whitespace-pre-wrap break-words text-ink-2">{props.note}</p>
      )}
    </div>
  )
}

/**
 * 기준점 목록 — 종류 머리말과 점 줄이 한 줄기로 이어진다. 굴림도 이 목록 하나뿐이다.
 *
 * <p>종류마다 굴림을 따로 두면 손이 어디에 닿았는지에 따라 움직이는 것이 달라지고, '맨 위로'도 종류 수만큼 생긴다.
 * 그래서 머리말·점·빈 문구를 한 배열로 펴서 통째로 가상 스크롤한다 — 점이 수천 개라 그리는 줄은 보이는 만큼뿐이다.
 */
function PointListPanel(props: MapSidebarProps & { dragHandleProps: SheetDragHandleProps }) {
  const [q, setQ] = useState('')
  const query = q.trim()
  const source = props.points
  // 검색 결과도 메모 → 팬 리렌더 중 새 배열을 만들지 않아 아래 줄 배열 메모가 유지됨.
  // 관리번호에 영문이 섞인다 — 대상 고르기와 같은 규칙으로 대소문자를 가리지 않는다
  const list = useMemo(() => {
    if (!query) return source
    const q = query.toLowerCase()
    return source.filter((p) => p.name.toLowerCase().includes(q) || p.pointNo.toLowerCase().includes(q))
  }, [source, query])
  // 종류별 묶음 — 수천 점을 한 줄기로 늘어놓는 대신 종류로 갈라 보고 싶은 종류만 편다
  const byType = useMemo(() => {
    const map = new Map<PointType, MappableControlPoint[]>()
    for (const t of POINT_TYPES) map.set(t, [])
    for (const p of list) map.get(p.type)?.push(p)
    return map
  }, [list])
  // 종류마다 따로 여닫는다 — 한 종류를 폈다고 보던 종류가 닫히면, 종류를 오갈 때마다 자리를 다시 찾아야 한다
  const [openTypes, setOpenTypes] = useState<ReadonlySet<PointType>>(() => new Set([POINT_TYPES[0]]))
  // 검색 결과가 접힌 종류에 숨지 않게, 편 종류 어디에도 결과가 없으면 결과가 있는 첫 종류를 편다
  useEffect(() => {
    if (query === '') return
    setOpenTypes((cur) => {
      if (POINT_TYPES.some((t) => cur.has(t) && (byType.get(t)?.length ?? 0) > 0)) return cur
      const found = POINT_TYPES.find((t) => (byType.get(t)?.length ?? 0) > 0)
      return found === undefined ? cur : new Set([...cur, found])
    })
  }, [query, byType])

  const loading = props.pointsLoading === true
  // 머리말과 점을 한 배열로 편다 — 이 차례가 곧 화면에 서는 차례다
  const rows = useMemo<PointListRow[]>(() => {
    const out: PointListRow[] = []
    for (const type of POINT_TYPES) {
      const pts = byType.get(type) ?? []
      out.push({ kind: 'head', type, count: pts.length })
      if (!openTypes.has(type)) continue
      if (pts.length > 0) for (const point of pts) out.push({ kind: 'point', point })
      else out.push({ kind: loading ? 'loading' : 'empty', type })
    }
    return out
  }, [byType, openTypes, loading])

  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false) // 한참 내려갔을 때만 '맨 위로'를 띄운다
  // 시트로 설 때도 굴림 영역은 이 자리 하나다 — 시트가 다른 요소를 보면 끌어 내리는 손짓과 굴림이 갈리지 않는다
  const sheetScrollRef = props.sheet?.scrollRef
  const setScrollEl = useCallback(
    (el: HTMLDivElement | null) => {
      scrollRef.current = el
      sheetScrollRef?.(el)
    },
    [sheetScrollRef],
  )

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => POINT_LIST_HEIGHTS[rows[index].kind],
    overscan: 8,
    getItemKey: (index) => pointListRowKey(rows[index]),
  })
  const totalHeight = virtualizer.getTotalSize()

  function toggle(type: PointType) {
    setOpenTypes((cur) => {
      const next = new Set(cur)
      // delete 는 지웠는지 알려 준다 — 있으면 접고, 없으면 편다
      if (!next.delete(type)) next.add(type)
      return next
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="기준점"
        count={source.length}
        onRefresh={() => props.onRefresh('points')}
        refreshing={props.refreshing === 'points'}
        onMinimize={props.onMinimize}
        onClose={props.onClose}
        dragHandleProps={props.dragHandleProps}
      />

      <div className="flex shrink-0 flex-col gap-[9px] px-3 pb-3">
        <span className="relative block">
          <span className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4">
            <IconSearch />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름·관리번호 검색"
            className={PANEL_SEARCH_INPUT}
          />
        </span>
        {!props.readOnly && (
          /* 입구에서 의도를 가른다 — 한 점 입력과 파일 등록은 다른 창이 맡는다 */
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={props.onStartAddPoint} className={PANEL_ADD_BTN}>
              <span className="mr-1.5 flex size-4 items-center justify-center text-teal-text">
                <IconPlus />
              </span>
              직접 추가
            </button>
            <button type="button" onClick={props.onImportPoints} className={PANEL_ADD_BTN}>
              <span className="mr-1.5 flex size-4 items-center justify-center text-teal-text">
                <IconUpload />
              </span>
              파일 업로드
            </button>
          </div>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col border-t-2 border-t-teal">
        <div
          ref={setScrollEl}
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 240)}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {/* 전체 높이만큼 자리를 잡아 스크롤 막대가 실제 목록 길이를 나타내게 하고, 보이는 줄만 그 안에 띄운다 */}
          <div className="relative w-full" style={{ height: totalHeight }}>
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index]
              return (
                <div
                  key={item.key}
                  className="absolute inset-x-0 top-0"
                  style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                >
                  {row.kind === 'head' ? (
                    <TypeHead type={row.type} count={row.count} open={openTypes.has(row.type)} onToggle={() => toggle(row.type)} />
                  ) : row.kind === 'point' ? (
                    <PointRow
                      cp={row.point}
                      selected={props.selectedPointId === row.point.id}
                      // 같은 줄을 다시 누르면 놓는다 — 강조를 끄는 것과 고름을 놓는 것은 한 가지 일이다
                      onClick={() =>
                        props.selectedPointId === row.point.id ? props.onDeselectPoint() : props.onFocusPoint(row.point)
                      }
                    />
                  ) : row.kind === 'loading' ? (
                    <SkeletonRows rows={6} className="py-1" />
                  ) : (
                    <p className="px-4 py-6 text-center text-[12.5px] text-ink-3">
                      {query === '' ? '기준점 없음' : '검색 결과 없음'}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          {/* 맨 아래까지 내렸을 때 '맨 위로' 버튼이 마지막 줄을 가리지 않도록 띄워 둔다 —
              버튼이 뜰 일 없는 짧은 목록에는 붙이지 않는다 */}
          {totalHeight > 480 && <div className="h-12" aria-hidden="true" />}
        </div>
        <ScrollTopButton scrollRef={scrollRef} shown={scrolled} />
      </div>
    </div>
  )
}

/** 목록에 서는 줄 — 종류 머리말, 점, 그리고 편 종류가 비었을 때의 한 줄 */
type PointListRow =
  | { kind: 'head'; type: PointType; count: number }
  | { kind: 'point'; point: MappableControlPoint }
  | { kind: 'empty' | 'loading'; type: PointType }

/** 줄의 신원 — 종류를 여닫아 줄 차례가 바뀌어도 잰 높이가 다른 줄에 붙지 않는다 */
function pointListRowKey(row: PointListRow): string {
  return row.kind === 'point' ? row.point.id : `${row.kind}-${row.type}`
}

/** 종류 머리말 — 누르면 그 종류의 점 줄이 아래로 따라 붙거나 걷힌다 */
function TypeHead(props: { type: PointType; count: number; open: boolean; onToggle: () => void }) {
  // 높이는 POINT_LIST_HEIGHTS.head 와 같아야 한다 — 가상 스크롤이 그 값으로 자리를 잡는다
  return (
    <button
      type="button"
      onClick={props.onToggle}
      aria-expanded={props.open}
      className="flex h-[48px] w-full items-center gap-2 border-b border-line-row px-3.5 text-left transition-colors hover:bg-hover"
    >
      <PointTypeIcon type={props.type} className="size-4 shrink-0 text-teal-text" />
      <span className={`flex-1 text-[13px] font-semibold ${props.open ? 'text-ink' : 'text-ink-2'}`}>{props.type}</span>
      <span className="text-[11px] text-ink-3">{props.count}개</span>
      <span className={`size-[15px] shrink-0 text-ink-4 transition-transform ${props.open ? 'rotate-180' : ''}`}>
        <IconChevronDown />
      </span>
    </button>
  )
}

/** 목록이 길어 한참 내려간 뒤에만 아래에서 올라오는 '맨 위로' */
function ScrollTopButton(props: { scrollRef: React.RefObject<HTMLDivElement | null>; shown: boolean }) {
  return (
    <button
      type="button"
      onClick={() => props.scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-hidden={!props.shown}
      tabIndex={props.shown ? 0 : -1}
      className={`absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 py-1.5 pl-2.5 pr-3 text-[12px] font-medium text-ink-2 transition-all duration-200 hover:text-ink ${PILL} ${
        props.shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m18 15-6-6-6 6" />
      </svg>
      맨 위로
    </button>
  )
}

/**
 * 점 목록 — 가상 스크롤. 기준점이 수천 개라 전부 마운트하면 그 커밋이 프레임을 막아 패널이 늦게 뜨고 조작이 끊긴다.
 * 화면에 보이는 행(+overscan)만 그리므로 DOM 수가 목록 길이와 무관하게 일정하다.
 * 행 높이는 모두 같다 — 결과를 고르는 자리가 상세 카드로 옮겨가 펼쳐지는 행이 없다.
 * survey 를 주면 상태마크가 함께 서고(프로젝트 드로어), 없으면 이름·종류만 선다(기준점 탭).
 */
function PointRowList(props: {
  points: MappableControlPoint[]
  onFocus: (cp: MappableControlPoint) => void
  /** 지금 고른 점 — 그 줄에 강조가 선다 */
  selectedId: string | null
  /** 강조된 줄을 다시 눌렀다 */
  onDeselect: () => void
  survey?: { resultById: ReadonlyMap<string, SurveyResult> }
  emptyText?: string
  /** 서버에서 목록을 받아오는 중 — 빈 목록 문구 대신 자리표시를 보여준다 */
  loading?: boolean
  /** 스크롤 영역 높이 제한(프로젝트 드로어처럼 다른 내용과 같이 놓일 때) */
  maxHeightClass?: string
}) {
  const { points, survey, selectedId, emptyText, loading, maxHeightClass } = props
  // 높이 제한이 없으면 남은 공간을 채운다(기준점 탭), 있으면 그만큼만 차지한다(프로젝트 드로어)
  const fills = !maxHeightClass
  // 줄마다 새 함수를 만들지 않으려고 콜백은 ref 로 들고, 누른 순간의 최신 값을 읽는다
  const cbRef = useRef({ onFocus: props.onFocus, onDeselect: props.onDeselect, selectedId })
  useEffect(() => {
    cbRef.current = { onFocus: props.onFocus, onDeselect: props.onDeselect, selectedId }
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false) // 한참 내려갔을 때만 '맨 위로'를 띄운다
  const virtualizer = useVirtualizer({
    count: points.length,
    getScrollElement: () => scrollRef.current,
    // 모든 행이 ROW_HEIGHT 로 고정이다. 결과를 고르는 자리가 상세 카드로 옮겨가 펼친 행도 높아지지 않는다
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => points[index].id,
  })

  const resultById = survey?.resultById
  const hasSurvey = Boolean(survey)

  if (points.length === 0) {
    return loading ? (
      <SkeletonRows rows={6} className="py-1" />
    ) : (
      <p className="px-4 py-6 text-center text-[12.5px] text-ink-3">{emptyText ?? '기준점 없음'}</p>
    )
  }

  return (
    <div className={`relative flex min-h-0 flex-col ${fills ? 'flex-1' : ''}`}>
    <div
      ref={scrollRef}
      onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 240)}
      className={`overflow-y-auto ${maxHeightClass ?? 'min-h-0 flex-1'}`}
    >
      {/* 전체 높이만큼 자리를 잡아 스크롤 막대가 실제 목록 길이를 나타내게 하고, 보이는 행만 그 안에 띄운다 */}
      {/* 아래 여백을 두지 않는다 — 드로어는 이 높이에 딱 맞춰 열리므로 여백이 그대로 드로어 사이의 틈이 된다 */}
      <ul className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const cp = points[item.index]
          const status = deriveSurveyStatus((resultById ?? EMPTY_RESULTS).get(cp.id))
          return (
            <li
              key={item.key}
              ref={virtualizer.measureElement}
              data-index={item.index}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <PointRow
                cp={cp}
                status={hasSurvey ? status : undefined}
                selected={selectedId === cp.id}
                onClick={() => {
                  const cur = cbRef.current
                  // 같은 줄을 다시 누르면 놓는다 — 강조를 끄는 것과 고름을 놓는 것은 한 가지 일이다
                  if (cur.selectedId === cp.id) cur.onDeselect()
                  else cur.onFocus(cp)
                }}
              />
            </li>
          )
        })}
      </ul>
      {/* 맨 아래까지 내렸을 때 '맨 위로' 버튼이 마지막 행을 가리지 않도록 띄워 둔다 —
          버튼이 뜰 일 없는 짧은 목록에는 붙이지 않는다(개수 맞춤 드로어에 빈 꼬리가 남는다) */}
      {points.length * ROW_HEIGHT > 480 && <div className="h-12" aria-hidden="true" />}
    </div>

      <ScrollTopButton scrollRef={scrollRef} shown={scrolled} />
    </div>
  )
}



/**
 * 점 한 줄. 좌측에 종류 도식(⊕/●/○)은 항상, status 있으면(프로젝트 드로어) 그 앞에 V/X 조사표시를 함께 표시.
 */
function PointRow(props: {
  cp: MappableControlPoint
  status?: SurveyStatus
  onClick: () => void
  /** 지금 고른 점의 줄 — 지도의 마커와 오른쪽 상세가 가리키는 그 점이다 */
  selected?: boolean
}) {
  // 바깥 <li>는 가상 스크롤 래퍼가 그린다(위치·높이 측정 대상).
  // 행 높이는 고정이고 ROW_HEIGHT 와 같은 값이어야 한다 — 어긋나면 굴리는 동안 위치가 밀린다.
  return (
    <div>
      <button
        type="button"
        onClick={props.onClick}
        aria-current={props.selected === true ? 'true' : undefined}
        className={`flex h-[34px] w-full items-center gap-2 px-3.5 text-left transition-colors hover:bg-hover ${
          props.selected === true ? `bg-teal-wash ${ROW_ACCENT}` : ''
        }`}
      >
        {props.status && <StatusMark status={props.status} />}
        <PointTypeIcon type={props.cp.type} className="size-[15px] text-ink-3" />
        <span className="flex-1 truncate text-[13px] text-ink-2">{props.cp.name}</span>
        <span className="shrink-0 text-[11px] text-ink-3">{props.cp.type}</span>
      </button>
    </div>
  )
}

/* ── 패널 안에서 쓰는 인라인 SVG 아이콘 ── */
/** 패널 안에서 쓰는 작은 아이콘들 — 굵기·선 끝 처리를 한곳에서 맞춘다 */
function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/** 파일 올리기 — 화면 전체 드롭 안내·파일 등록 창과 같은 뜻의 화살표 */
function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}

/** 내보내기 — 파일 업로드(IconUpload)의 반대 방향이다 */
function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7.5" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

/** 접기 — 창을 줄여 칩으로 보내는 뜻의 밑줄 */
/**
 * 다시 불러오기 — 받는 동안에는 잠그고 그 자리에서 돈다.
 *
 * <p>잠그지 않고 무시하면 눌린 것인지 알 수 없다. 아이콘이 도는 동안 누를 수 없는 것이 곧 진행 표시다.
 */
function RefreshButton(props: { onRefresh: () => void; refreshing: boolean }) {
  return (
    <button
      type="button"
      onClick={props.onRefresh}
      disabled={props.refreshing}
      aria-label="새로고침"
      title="새로고침"
      className={`${ICON_BTN} disabled:cursor-wait`}
    >
      {props.refreshing ? <Spinner className="size-full" current /> : <RefreshIcon className="size-full" />}
    </button>
  )
}

function IconMinimize() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 18h12" />
    </svg>
  )
}

/** 상세 레이어에서 목록으로 되돌아가는 방향 */
function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m14 6-6 6 6 6" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
/** 펼침 표시 셰브론 */
function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
