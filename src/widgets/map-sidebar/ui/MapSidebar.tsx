import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { SURVEY_STATUS_LABEL, deriveSurveyStatus } from '@/entities/survey-record'
import { Skeleton, SkeletonRows } from '@/shared/ui/Skeleton'
import { percent } from '@/shared/lib/percent'
import { formatDate } from '@/shared/lib/date'
import { SURVEY_ONGOING_LABEL, type SurveyProject } from '@/entities/survey-project'
import type { ControlPoint } from '@/entities/control-point'
import { PointTypeIcon, StatusMark } from '@/entities/control-point'

/** 좌측 레일에서 열 수 있는 패널 종류 */
export type PanelKey = 'project' | 'points'
/** 패널 폭(px) — 지도 오버레이 inset 계산과 동일 값 유지 */
const PANEL_WIDTH = 300
/** 점 목록 행 높이(h-8) — 가상 스크롤 추정치와 실제 렌더가 같아야 스크롤이 튀지 않는다 */
const ROW_HEIGHT = 32
/** 펼친 행에 붙는 조사·망실 버튼 영역 높이 */
const ROW_ACTIONS_HEIGHT = 46
/** 패널 상단 검색창 — 프로젝트·기준점 두 패널이 같은 모양을 쓴다 */
const PANEL_SEARCH_INPUT =
  'w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-[13px] text-gray-100 placeholder:text-gray-500 outline-none focus:border-blue-500'
/** 패널 상단 추가 버튼 — 프로젝트·기준점 두 패널이 같은 모양을 쓴다 */
const PANEL_ADD_BTN =
  'flex w-full items-center justify-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 py-2 text-[13px] font-medium text-white hover:bg-blue-500'
/** 패널이 미끄러져 나가는 시간(ms) — 본문을 트리에서 빼는 시점이 애니메이션보다 빨라선 안 된다 */
const PANEL_SLIDE_MS = 220
/** 프로젝트 드로어가 접히는 시간(ms) — 펼칠 때보다 짧게 잡아 목록으로 돌아오는 길을 늦추지 않는다 */
const DRAWER_CLOSE_MS = 120
/** 조사 프로젝트를 안 고른 목록(기준점 탭)에서 상태 판정에 넘길 빈 집합 */
const EMPTY_IDS: Set<string> = new Set()

interface MapSidebarProps {
  // 조사 프로젝트
  projects: SurveyProject[]
  activeProjectId: string | null
  onChangeActive: (id: string | null) => void
  /** 새 조사 만들기 요청 — 입력과 대상지 파일은 페이지의 모달이 받는다 */
  onCreate: () => void
  // 기준점 목록
  points: ControlPoint[]
  /** 고른 조사의 대상 점 — 조사를 고르지 않았으면 points 와 같다 */
  targetPoints: ControlPoint[]
  surveyedIds: Set<string>
  lostIds: Set<string>
  onFocusPoint: (cp: ControlPoint) => void
  onToggleSurvey: (pointId: string) => void
  onToggleLost: (pointId: string) => void
  // 서버 조회 진행 여부 — 로딩 중엔 '없습니다' 대신 자리표시를 보여준다
  projectsLoading?: boolean
  pointsLoading?: boolean
  recordsLoading?: boolean
  /** 고른 조사의 대상 목록을 받아오는 중 — 도착 전엔 대상이 0건이라 진행률·목록을 자리표시로 둔다 */
  targetsLoading?: boolean
  // 도구
  /** 기준점 추가 시작 — 입력은 페이지의 모달이 받는다 */
  onStartAddPoint: () => void
  // 사용자 관리 (어드민)
  isAdmin: boolean
  onOpenUserManagement: () => void
  // 패널이 지도를 가리는 폭 통지 (포커스 센터링 보정용)
  onInsetChange?: (px: number) => void
  // 외부(지도 위 활성 프로젝트 칩)에서 프로젝트 패널 열기 요청 (nonce, 증가할 때마다 열림)
  openProjectSignal?: number
  // 열려 있는 패널 통지 (지도에 그릴 점을 정하는 데 쓴다)
  onOpenPanelChange?: (panel: PanelKey | null) => void
}

export function MapSidebar(props: MapSidebarProps) {
  const [open, setOpen] = useState<PanelKey | null>(null)
  // 닫히는 동안에도 마지막 패널을 그려둬야 슬라이드 아웃이 매끄러움
  const [lastPanel, setLastPanel] = useState<PanelKey>('project')
  const toggle = (key: PanelKey) => {
    if (open === key) setOpen(null)
    else {
      // 두 탭은 함께 서지 않는다. 기준점 탭은 전체 목록이라 고른 조사를 그대로 두면
      // 그 조사의 대상이 아닌 점에 조사·망실을 기록할 수 있다.
      if (key === 'points') props.onChangeActive(null)
      setLastPanel(key)
      setOpen(key)
    }
  }

  // 패널이 지도를 가리는 폭을 부모에 알림 → 포커스 센터링이 '보이는 영역 중앙' 기준을 쓰게
  const onInsetChange = props.onInsetChange
  useEffect(() => {
    onInsetChange?.(open ? PANEL_WIDTH : 0)
  }, [open, onInsetChange])

  // 어느 패널이 열렸는지 알림 → 지도에 그릴 점을 부모가 정한다(기준점 탭=전체, 그 외=고른 조사의 대상)
  const onOpenPanelChange = props.onOpenPanelChange
  useEffect(() => {
    onOpenPanelChange?.(open)
  }, [open, onOpenPanelChange])

  // 활성 프로젝트 칩 클릭 → 프로젝트 패널 열기 (nonce 증가 시. 0=초기값이라 무시)
  const openProjectSignal = props.openProjectSignal
  useEffect(() => {
    if (!openProjectSignal) return
    setLastPanel('project')
    setOpen('project')
  }, [openProjectSignal])

  // 패널 본문은 '열려 있을 때만' 마운트(닫히면 슬라이드 아웃 후 지연 언마운트).
  // ★ 성능: 프로젝트가 펼쳐지면 본문에 점 수천 개(PointRow)가 그려지는데, 닫혀도 마운트돼 있으면
  //   패널과 무관한 리렌더마다 이 수천 행이 재조정돼 렉이 걸린다.
  //   닫힘 상태에선 트리에서 제거해 이런 리렌더가 레일만 건드리게 함. (열림 시 1프레임 빈 상태는 슬라이드 인과 겹쳐 무시 가능)
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
    <div className="relative z-20 flex min-h-0 shrink-0 text-gray-200">
      {/* 아이콘 레일 (헤더와 같은 다크 계열) — 패널보다 위(z)라 패널이 뒤에서 슬라이드 */}
      <nav className="relative z-10 flex w-16 shrink-0 flex-col border-r border-gray-700 bg-gray-800">
        <RailItem label="프로젝트" active={open === 'project'} onClick={() => toggle('project')}>
          <IconProject />
        </RailItem>
        <RailItem label="기준점" active={open === 'points'} onClick={() => toggle('points')}>
          <IconPoints />
        </RailItem>

        {props.isAdmin && (
          <RailItem
            label="사용자"
            active={false}
            onClick={props.onOpenUserManagement}
            className="mt-auto border-t border-gray-700"
          >
            <IconUsers />
          </RailItem>
        )}
      </nav>

      {/* 패널: 지도를 밀지 않고 그 위에 겹치는 오버레이 드로어. 레일 뒤에서 슬라이드 인/아웃 */}
      <aside
        aria-hidden={!open}
        inert={!open}
        className={`absolute bottom-0 left-full top-0 z-0 flex w-[300px] flex-col bg-gray-800 transition-transform duration-200 ease-out ${
          open ? 'translate-x-0 border-r border-gray-700 shadow-xl' : '-translate-x-full pointer-events-none'
        }`}
      >
        {renderBody &&
          (lastPanel === 'project' ? (
            <ProjectPanel {...props} onClose={() => setOpen(null)} />
          ) : (
            <PointListPanel {...props} onClose={() => setOpen(null)} />
          ))}
      </aside>
    </div>
  )
}

/** 레일 아이콘 버튼 (아이콘 + 라벨, 활성 시 파란 블록) */
function RailItem(props: { label: string; active: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={`flex w-full flex-col items-center gap-1 py-3 text-[11px] transition-colors ${
        props.active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      } ${props.className ?? ''}`}
    >
      <span className="h-6 w-6">{props.children}</span>
      {props.label}
    </button>
  )
}

function PanelHeader(props: { title: string; count?: number; onClose: () => void }) {
  return (
    <header className="flex items-center gap-2 border-b border-gray-700 px-4 py-3">
      <h2 className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className="text-sm font-bold text-gray-50">{props.title}</span>
        {props.count !== undefined && (
          <span className="text-[11px] font-normal text-gray-400">총 {props.count}개</span>
        )}
      </h2>
      <button
        type="button"
        onClick={props.onClose}
        aria-label="패널 닫기"
        className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-700 hover:text-gray-100"
      >
        <IconChevronLeft />
      </button>
    </header>
  )
}

/**
 * 프로젝트 목록. 행을 펼치는 것이 곧 그 조사를 고르는 것이다.
 * 펼쳐 놓은 조사와 지도에 반영되는 조사가 항상 같으므로, 드로어 안의 진행률·점별 기록이 늘 지금 보는 조사의 것이다.
 */
function ProjectPanel(props: MapSidebarProps & { onClose: () => void }) {
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
  // 펼친 조사 = 고른 조사. 패널을 열면 이미 고른 조사를 펼쳐 둔다.
  const [expandedId, setExpandedId] = useState<string | null>(props.activeProjectId)
  // 접히는 동안에도 내용을 잠깐 유지(mountedId 지연 언마운트) → 높이 애니메이션이 이어진다
  const [mountedId, setMountedId] = useState<string | null>(expandedId)
  useEffect(() => {
    if (expandedId !== null) {
      setMountedId(expandedId)
      return
    }
    const t = setTimeout(() => setMountedId(null), DRAWER_CLOSE_MS)
    return () => clearTimeout(t)
  }, [expandedId])

  // 드로어에서 조사 토글 버튼을 펼친 점 (펼친 프로젝트 바뀌면 초기화)
  const [expandedPointId, setExpandedPointId] = useState<string | null>(null)
  useEffect(() => setExpandedPointId(null), [expandedId])

  function handleNew() {
    props.onCreate()
  }

  /** 펼치면 그 조사를 고르고, 접으면 고름을 푼다 — 펼쳐 놓은 조사와 지도에 반영되는 조사가 항상 같다. */
  function toggleProject(id: string, expanded: boolean) {
    setExpandedId(expanded ? null : id)
    props.onChangeActive(expanded ? null : id)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="프로젝트 목록" count={props.projects.length} onClose={props.onClose} />

      {/* 구분선~컨트롤~목록 간격을 같게 유지(위아래 대칭) */}
      <div className="space-y-2 p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="조사명·비고 검색"
          className={PANEL_SEARCH_INPUT}
        />
        <button
          type="button"
          onClick={handleNew}
          className={PANEL_ADD_BTN}
        >
          <span className="h-4 w-4">
            <IconAddProject />
          </span>
          프로젝트 추가
        </button>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {list.length === 0 &&
          (props.projectsLoading ? (
            <li>
              <SkeletonRows rows={3} />
            </li>
          ) : (
            <li className="px-4 py-6 text-center text-[13px] text-gray-500">
              {props.projects.length === 0 ? '프로젝트가 없습니다' : '검색 결과 없음'}
            </li>
          ))}
        {list.map((p) => {
          const expanded = expandedId === p.id
          const selected = props.activeProjectId === p.id // ★ 선택(활성) = 지도/칩에 반영되는 프로젝트
          const mounted = mountedId === p.id
          const ptotal = props.targetPoints.length // 분모는 전체 기준점이 아니라 그 조사의 대상
          // 대상·기록 중 하나라도 오는 중이면 0/0·0% 가 잠깐 보이므로 자리표시로 둔다
          const progressLoading = props.recordsLoading === true || props.targetsLoading === true
          // 조사기록은 활성 프로젝트 것만 조회하므로 카운트·진행률은 선택된 조사에서만 표시
          const psurveyed = selected ? props.surveyedIds.size : 0
          const ppct = percent(psurveyed, ptotal)
          // 망실도 '조사됨'이라 진행률에는 함께 세고, 내역에서는 결과별로 갈라 보여 준다.
          // 대상이 아닌 점에도 기록이 남을 수 있어 음수가 되지 않게 막는다.
          const plost = selected ? props.lostIds.size : 0
          const pdone = Math.max(0, psurveyed - plost)
          const ptodo = Math.max(0, ptotal - psurveyed)
          return (
            <li
              key={p.id}
              className={`border-b border-gray-700/60 border-l-[3px] ${
                selected ? 'border-l-blue-500 bg-blue-500/10' : 'border-l-transparent'
              }`}
            >
              {/* 행 전체가 하나의 버튼이다 — 표식까지 눌리는 자리에 넣어야 행에 반응 없는 구역이 생기지 않는다.
                  누르면 펼침과 선택이 함께 일어나므로 aria-expanded·aria-pressed 를 같이 알린다. */}
              <button
                type="button"
                onClick={() => toggleProject(p.id, expanded)}
                aria-expanded={expanded}
                aria-pressed={selected}
                className={`flex w-full items-center gap-4 py-2.5 pl-4 pr-4 text-left text-sm transition-colors hover:bg-white/[0.06] ${
                  selected ? 'font-semibold text-white' : expanded ? 'text-gray-100' : 'text-gray-200'
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    selected ? 'border-blue-400 bg-blue-500' : 'border-gray-500'
                  }`}
                >
                  {selected && (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="#ffffff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  )}
                </span>
                {/* 접어 둔 조사도 언제 하는 조사인지 알 수 있게 이름 아래 한 줄을 더 둔다 */}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate">{p.name}</span>
                  <span className="block truncate text-[11px] font-normal tabular-nums text-gray-400">
                    {formatDate(p.startedOn)} ~{' '}
                    {p.endedOn === null ? (
                      <span className="text-blue-300/90">{SURVEY_ONGOING_LABEL}</span>
                    ) : (
                      formatDate(p.endedOn)
                    )}
                  </span>
                </span>
                <span className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                  <IconChevronDown />
                </span>
              </button>

              {/* 펼침 드로어: grid-rows 0fr↔1fr 로 높이 애니메이션(열림/닫힘 모두) */}
              <div
                className={`grid transition-[grid-template-rows] ease-out ${
                  expanded ? 'grid-rows-[1fr] duration-200' : 'grid-rows-[0fr] duration-[120ms]'
                }`}
              >
                <div className="overflow-hidden">
                  {mounted && (
                    <div className="bg-gray-900/40 pb-2 pt-1">
                      {/* 진행률 (이 프로젝트 기준) */}
                      {selected && (
                      <div className="px-4 pb-2 pt-2">
                        {progressLoading ? (
                          <div className="space-y-1.5">
                            <Skeleton className="h-3 w-40" />
                            <Skeleton className="h-1.5 w-full rounded-full" />
                          </div>
                        ) : (
                          <>
                            <div className="mb-1.5 flex items-center text-[12px] text-gray-300">
                              <span className="flex-1">
                                조사 <b className="text-blue-400">{psurveyed}</b> / 전체 {ptotal}
                              </span>
                              <span className="font-semibold text-blue-400">{ppct}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-gray-700">
                              <div
                                className="h-full rounded-full bg-blue-500 transition-[width] duration-500 ease-out"
                                style={{ width: `${ppct}%` }}
                              />
                            </div>

                            {/* 결과별 내역 — 색은 아래 범례·지도 마커와 같은 뜻으로 쓴다 */}
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                              <StatusCount label={SURVEY_STATUS_LABEL.done} count={pdone} dotClass="bg-blue-500" />
                              <StatusCount label={SURVEY_STATUS_LABEL.lost} count={plost} dotClass="bg-red-600" />
                              <StatusCount label={SURVEY_STATUS_LABEL.todo} count={ptodo} dotClass="bg-gray-400 opacity-50" />
                            </div>
                          </>
                        )}
                      </div>
                      )}

                      <ProjectNote note={p.note ?? ''} />

                      {/* 목록은 위 정보와 성격이 달라 선으로 끊고 이름표를 붙인다.
                          점별 조사·망실 기록은 '선택된(조사 대상)' 프로젝트에서만. 리스트는 PointRowList가 내부 메모 */}
                      {selected ? (
                        <div className="border-t border-gray-700/60 bg-gray-900/30 pt-1.5">
                          <p className="px-4 pb-1 text-[11px] font-medium text-gray-400">대상 기준점</p>
                          <PointRowList
                            points={props.targetPoints}
                            onFocus={props.onFocusPoint}
                            survey={{
                              surveyedIds: props.surveyedIds,
                              lostIds: props.lostIds,
                              expandedPointId,
                              onExpand: setExpandedPointId,
                              onToggleSurvey: props.onToggleSurvey,
                              onToggleLost: props.onToggleLost,
                            }}
                            loading={props.pointsLoading === true || props.targetsLoading === true}
                            maxHeightClass="max-h-[45vh]"
                          />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <Legend />
    </div>
  )
}

/** 조사 결과 내역 한 칸 — 점 색으로 지도 마커·범례와 같은 상태를 가리킨다. */
function StatusCount(props: { label: string; count: number; dotClass: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className={`inline-block h-2 w-2 rounded-full ${props.dotClass}`} aria-hidden />
      {props.label}
      <b className="font-semibold tabular-nums text-gray-200">{props.count}</b>
    </span>
  )
}

/**
 * 조사에 기록한 비고. 수치와 달리 서술형 문장이므로 인용문처럼 세로선을 두어 구분한다.
 * 검색 대상 필드이므로 값이 없어도 자리는 유지한다.
 */
function ProjectNote(props: { note: string }) {
  return (
    <div className="mx-4 mb-2 border-l-2 border-gray-600 bg-gray-800/40 py-1.5 pl-2.5 pr-2 text-[12px]">
      {props.note === '' ? (
        <p className="text-gray-500">내용이 없습니다</p>
      ) : (
        <p className="whitespace-pre-wrap break-words leading-relaxed text-gray-200">{props.note}</p>
      )}
    </div>
  )
}

/** 기준점 목록: 도식 아이콘 + 이름/종류 (조사여부 표시 안 함), 클릭 시 포커스 */
function PointListPanel(props: MapSidebarProps & { onClose: () => void }) {
  const [q, setQ] = useState('')
  const query = q.trim()
  // 이 탭은 전체 기준점 목록이다. 탭을 열면 지도도 전체를 보여주므로 목록과 지도가 어긋나지 않는다.
  const source = props.points
  // 검색 결과도 메모 → 팬 리렌더 중 새 배열을 만들지 않아 PointRowList 메모가 유지됨
  const list = useMemo(
    () => (query ? source.filter((p) => p.name.includes(query)) : source),
    [source, query],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="기준점" count={source.length} onClose={props.onClose} />

      {/* 구분선~컨트롤~목록 간격을 같게 유지(위아래 대칭) */}
      <div className="space-y-2 p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 검색"
          className={PANEL_SEARCH_INPUT}
        />
        <button
          type="button"
          onClick={() => {
            props.onStartAddPoint()
            props.onClose() // 지도에서 위치를 찍을 수 있게 패널은 비켜 준다
          }}
          className={PANEL_ADD_BTN}
        >
          <span className="h-4 w-4">
            <IconAddPoint />
          </span>
          기준점 추가
        </button>
      </div>

      <PointRowList
        points={list}
        onFocus={props.onFocusPoint}
        emptyText={source.length === 0 ? '기준점이 없습니다' : '검색 결과 없음'}
        loading={props.pointsLoading}
      />
    </div>
  )
}

/**
 * 점 목록 — 가상 스크롤. 기준점이 수천 개라 전부 마운트하면 그 커밋이 프레임을 막아 패널이 늦게 뜨고 조작이 끊긴다.
 * 화면에 보이는 행(+overscan)만 그리므로 DOM 수가 목록 길이와 무관하게 일정하다.
 * 행 높이는 펼침(조사·망실 버튼) 때문에 가변이라 measureElement로 실제 높이를 잰다.
 * survey 주면 상태마크·조사/망실 토글·펼침(프로젝트 드로어), 없으면 이름·종류만(기준점 탭).
 */
function PointRowList(props: {
  points: ControlPoint[]
  onFocus: (cp: ControlPoint) => void
  survey?: {
    surveyedIds: Set<string>
    lostIds: Set<string>
    expandedPointId: string | null
    onExpand: (id: string | null) => void
    onToggleSurvey: (id: string) => void
    onToggleLost: (id: string) => void
  }
  emptyText?: string
  /** 서버에서 목록을 받아오는 중 — 빈 목록 문구 대신 자리표시를 보여준다 */
  loading?: boolean
  /** 스크롤 영역 높이 제한(프로젝트 드로어처럼 다른 내용과 같이 놓일 때) */
  maxHeightClass?: string
}) {
  const { points, survey, emptyText, loading, maxHeightClass } = props
  // 높이 제한이 없으면 남은 공간을 채운다(기준점 탭), 있으면 그만큼만 차지한다(프로젝트 드로어)
  const fills = !maxHeightClass
  const cbRef = useRef({ onFocus: props.onFocus, survey })
  useEffect(() => {
    cbRef.current = { onFocus: props.onFocus, survey }
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false) // 한참 내려갔을 때만 '맨 위로'를 띄운다
  const expandedId = survey?.expandedPointId ?? null
  const virtualizer = useVirtualizer({
    count: points.length,
    getScrollElement: () => scrollRef.current,
    // 접힌 행은 ROW_HEIGHT로 고정이라 추정이 정확하다(실측과 어긋나면 스크롤 중 위치가 밀린다).
    // 펼친 행만 조사·망실 버튼만큼 높아지는데, 한 번에 하나뿐이라 measureElement가 그 차이를 보정한다.
    estimateSize: (index) => (points[index].id === expandedId ? ROW_HEIGHT + ROW_ACTIONS_HEIGHT : ROW_HEIGHT),
    overscan: 8,
    getItemKey: (index) => points[index].id,
  })

  const surveyedIds = survey?.surveyedIds
  const lostIds = survey?.lostIds
  const expandedPointId = survey?.expandedPointId ?? null
  const hasSurvey = Boolean(survey)

  if (points.length === 0) {
    return loading ? (
      <SkeletonRows rows={6} className="py-1" />
    ) : (
      <p className="px-4 py-6 text-center text-[13px] text-gray-500">{emptyText ?? '기준점이 없습니다'}</p>
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
      <ul className="relative w-full pb-1" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const cp = points[item.index]
          const status = deriveSurveyStatus(cp.id, surveyedIds ?? EMPTY_IDS, lostIds ?? EMPTY_IDS)
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
                status={hasSurvey ? SURVEY_STATUS_LABEL[status] : undefined}
                expanded={expandedPointId === cp.id}
                surveyed={status !== 'todo'}
                lost={status === 'lost'}
                onToggleSurvey={hasSurvey ? () => cbRef.current.survey?.onToggleSurvey(cp.id) : undefined}
                onToggleLost={hasSurvey ? () => cbRef.current.survey?.onToggleLost(cp.id) : undefined}
                onClick={() => {
                  const cur = cbRef.current
                  if (cur.survey) {
                    const willExpand = expandedPointId !== cp.id
                    cur.survey.onExpand(willExpand ? cp.id : null)
                    if (willExpand) cur.onFocus(cp)
                  } else {
                    cur.onFocus(cp)
                  }
                }}
              />
            </li>
          )
        })}
      </ul>
      {/* 맨 아래까지 내렸을 때 '맨 위로' 버튼이 마지막 행을 가리지 않도록 띄워 둔다 */}
      <div className="h-12" aria-hidden="true" />
    </div>

      {/* 목록이 길어 한참 내려간 뒤에만 아래에서 올라온다 */}
      <button
        type="button"
        onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-hidden={!scrolled}
        tabIndex={scrolled ? 0 : -1}
        className={`absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gray-900/85 py-1.5 pl-2.5 pr-3 text-[12px] font-medium text-white shadow-lg backdrop-blur transition-all duration-200 hover:bg-gray-900 ${
          scrolled ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m18 15-6-6-6 6" />
        </svg>
        맨 위로
      </button>
    </div>
  )
}

/**
 * 점 한 줄. 좌측에 종류 도식(⊕/●/○)은 항상, status 있으면(프로젝트 드로어) 그 앞에 V/X 조사표시를 함께 표시.
 */
function PointRow(props: {
  cp: ControlPoint
  status?: string
  onClick: () => void
  expanded?: boolean
  surveyed?: boolean
  lost?: boolean
  onToggleSurvey?: () => void
  onToggleLost?: () => void
}) {
  const hasActions = Boolean(props.onToggleSurvey && props.onToggleLost)
  // 바깥 <li>는 가상 스크롤 래퍼가 그린다(위치·높이 측정 대상).
  // 행 높이는 h-8로 고정 — 가상 스크롤 추정 높이와 어긋나면 스크롤 도중 총 높이가 재계산돼 막대와 손 위치가 밀린다.
  return (
    <div>
      <button
        type="button"
        onClick={props.onClick}
        aria-expanded={hasActions ? Boolean(props.expanded) : undefined}
        className={`flex h-8 w-full items-center gap-2 px-4 text-left hover:bg-gray-700 ${props.expanded ? 'bg-gray-700/40' : ''}`}
      >
        {props.status && <StatusMark status={props.status} />}
        <PointTypeIcon type={props.cp.type} className="h-4 w-4 text-gray-200" />
        <span className="flex-1 truncate text-[13px] text-gray-200">{props.cp.name}</span>
        <span className="shrink-0 text-[11px] text-gray-500">{props.cp.type}</span>
      </button>
      {/* 클릭 시 아래에 조사 완료/취소 · 망실 토글 (상세 모달과 동일 기능) */}
      {props.expanded && hasActions && (
        <div className="flex gap-2 px-4 py-2">
          <button
            type="button"
            onClick={props.onToggleSurvey}
            className={`flex-1 rounded-md border py-1.5 text-center text-[12px] font-medium ${
              props.surveyed
                ? 'border-gray-600 bg-gray-700 text-gray-100 hover:bg-gray-600'
                : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {props.surveyed ? '조사 취소' : '조사 완료'}
          </button>
          <button
            type="button"
            onClick={props.onToggleLost}
            className={`flex-1 rounded-md border py-1.5 text-center text-[12px] font-medium ${
              props.lost
                ? 'border-red-500 bg-red-500/20 text-red-200 hover:bg-red-500/30'
                : 'border-red-800 bg-red-900/40 text-red-300 hover:bg-red-900'
            }`}
          >
            {props.lost ? '망실 해제' : '망실'}
          </button>
        </div>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-3 border-t border-gray-700 px-4 py-2.5 text-[11px] text-gray-400">
      <span className="inline-flex items-center gap-1.5">
        <i className="inline-block h-3 w-3 rounded-full border border-blue-600 bg-blue-500" />조사완료
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="inline-block h-3 w-3 rounded-full bg-gray-400 opacity-50" />미조사
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="inline-block h-3 w-3 rounded-full border border-red-900 bg-red-600" />망실
      </span>
    </div>
  )
}

/* ── 레일/패널 인라인 SVG 아이콘 ── */

/**
 * 아이콘 공통 껍데기 — 선 굵기·마감·크기를 한 곳에서 정한다.
 * pad: 도형이 뷰박스를 꽉 채워 유독 커 보이는 아이콘(사람·렌치 등)에 여백을 줘 다른 아이콘과 시각 크기를 맞춘다.
 */
function RailIcon({ pad = 0, children }: { pad?: number; children: ReactNode }) {
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${24 + pad * 2} ${24 + pad * 2}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      {children}
    </svg>
  )
}

function IconProject() {
  return (
    <RailIcon>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </RailIcon>
  )
}

function IconPoints() {
  return (
    <RailIcon>
      <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </RailIcon>
  )
}


function IconUsers() {
  return (
    <RailIcon pad={2}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </RailIcon>
  )
}

function IconAddProject() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M12 11v6M9 14h6" />
    </svg>
  )
}

function IconAddPoint() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="10" cy="10" r="6" />
          <path d="M10 3v14M3 10h14" strokeWidth="1.2" />
        </g>
      <circle cx="18" cy="18" r="5.5" fill="#16a34a" />
      <path d="M18 15.4v5.2M15.4 18h5.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}


function IconChevronLeft() {
  return (
    <RailIcon>
      <path d="m15 18-6-6 6-6" />
    </RailIcon>
  )
}

function IconChevronDown() {
  return (
    <RailIcon>
      <path d="m6 9 6 6 6-6" />
    </RailIcon>
  )
}
