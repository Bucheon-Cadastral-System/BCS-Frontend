import { useEffect, useMemo, useRef, useState } from 'react'
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
/** 점 목록 행 높이(h-8) — 가상 스크롤 추정치와 실제 렌더가 같아야 스크롤이 튀지 않는다 */
const ROW_HEIGHT = 32
/** 펼친 행에 붙는 조사·망실 버튼 영역 높이 */
const ROW_ACTIONS_HEIGHT = 46
/** 패널 상단 검색창 — 프로젝트·기준점 두 패널이 같은 모양을 쓴다 */
const PANEL_SEARCH_INPUT =
  'h-[34px] w-full rounded-ctl border border-line-field bg-field pl-9 pr-3 text-[12.5px] text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-teal-edge'
/** 패널 상단 추가 버튼 — 프로젝트·기준점 두 패널이 같은 모양을 쓴다 */
const PANEL_ADD_BTN =
  'relative flex h-10 w-full items-center justify-center rounded-ctl border-[1.5px] border-teal-btn-edge bg-teal-wash text-[13px] font-semibold tracking-[-.01em] text-teal-label transition-colors hover:border-teal-text hover:bg-teal-wash-strong'
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
  /** 지금 열려 있는 판 — 헤더 탭이 정한다 */
  open: PanelKey | null
  onClose: () => void
  /** 판 너비 — 위에 선 헤더 알약과 같은 값을 쓴다 */
  width: number
}

/**
 * 지도 왼쪽에 떠 있는 판. 화면을 밀지 않고 지도 위에 겹친다.
 * 어느 판을 여는지는 헤더 탭이 정하고, 여기서는 그 판의 내용만 그린다.
 */
export function MapSidebar(props: MapSidebarProps) {
  const open = props.open
  // 닫히는 동안에도 마지막 판을 그려둬야 미끄러져 나가는 모습이 이어진다
  const [lastPanel, setLastPanel] = useState<PanelKey>('project')
  useEffect(() => {
    if (open) setLastPanel(open)
  }, [open])

  // 판 본문은 '열려 있을 때만' 마운트(닫히면 슬라이드 아웃 후 지연 언마운트).
  // ★ 성능: 프로젝트가 펼쳐지면 본문에 점 수천 개(PointRow)가 그려지는데, 닫혀도 마운트돼 있으면
  //   판과 무관한 리렌더마다 이 수천 행이 재조정돼 렉이 걸린다.
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
        aria-hidden={!open}
        inert={!open}
        style={{ width: props.width || undefined }}
        className={`absolute bottom-bar-clear left-4 top-[76px] z-20 flex flex-col overflow-hidden rounded-pill border border-line bg-panel text-ink shadow-panel backdrop-blur-[12px] transition-[opacity,transform] duration-200 ease-out ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        {renderBody &&
          (lastPanel === 'project' ? (
            <ProjectPanel {...props} onClose={props.onClose} />
          ) : (
            <PointListPanel {...props} onClose={props.onClose} />
          ))}
      </aside>
  )
}

function PanelHeader(props: { title: string; count?: number; onClose: () => void }) {
  return (
    <header className="flex shrink-0 items-baseline gap-[7px] pb-[11px] pl-3.5 pr-2.5 pt-[13px]">
      <h2 className="flex min-w-0 flex-1 items-baseline gap-[7px]">
        <span className="text-[13.5px] font-semibold text-ink">{props.title}</span>
        {props.count !== undefined && (
          <span className="text-[11px] text-ink-4">
            총 <span className="font-mono">{props.count}</span>개
          </span>
        )}
      </h2>
      <button
        type="button"
        onClick={props.onClose}
        aria-label="판 접기"
        title="접기"
        className="flex size-[26px] shrink-0 items-center justify-center self-center rounded-chip text-ink-3 transition-colors hover:bg-hover hover:text-ink-2"
      >
        <span className="size-4">
          <IconClose />
        </span>
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
  // 패널 밖에서도 활성 조사가 바뀐다(가져오기 성공·챗봇 안내). 따라가지 않으면 표식은 새 조사에,
  // 펼쳐진 행은 옛 조사에 남아 진행률도 목록도 없는 빈 드로어가 된다.
  const activeProjectId = props.activeProjectId
  useEffect(() => {
    setExpandedId(activeProjectId)
  }, [activeProjectId])
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

      <div className="flex shrink-0 flex-col gap-[9px] px-3 pb-3">
        <span className="relative block">
          <span className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4">
            <IconSearch />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="조사명·비고 검색"
            className={PANEL_SEARCH_INPUT}
          />
        </span>
        <button
          type="button"
          onClick={handleNew}
          className={PANEL_ADD_BTN}
        >
          <span className="absolute left-[13px] top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-teal-text">
            <IconPlus />
          </span>
          프로젝트 추가
        </button>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto border-t-2 border-t-teal">
        {list.length === 0 &&
          (props.projectsLoading ? (
            <li>
              <SkeletonRows rows={3} />
            </li>
          ) : (
            <li className="px-4 py-6 text-center text-[12.5px] text-ink-4">
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
            <li key={p.id} className={`border-b border-line-row ${selected ? 'bg-teal-wash' : ''}`}>
              {/* 행 전체가 하나의 버튼이다 — 표식까지 눌리는 자리에 넣어야 행에 반응 없는 구역이 생기지 않는다.
                  누르면 펼침과 선택이 함께 일어나므로 aria-expanded·aria-pressed 를 같이 알린다. */}
              <button
                type="button"
                onClick={() => toggleProject(p.id, expanded)}
                aria-expanded={expanded}
                aria-pressed={selected}
                className={`flex w-full items-center gap-[11px] py-3 pl-[13px] pr-3.5 text-left transition-colors hover:bg-white/[0.03] ${
                  selected ? 'shadow-[inset_3px_0_0_var(--color-teal)]' : ''
                }`}
              >
                <span
                  aria-hidden
                  className={`flex size-[17px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    selected ? 'border-teal' : 'border-idle'
                  }`}
                >
                  {selected && (
                    <svg viewBox="0 0 24 24" className="size-2.5 text-teal" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                  )}
                </span>
                {/* 접어 둔 조사도 언제 하는 조사인지 알 수 있게 이름 아래 한 줄을 더 둔다 */}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`truncate text-[13px] font-semibold ${selected ? 'text-ink' : 'text-ink-2'}`}>{p.name}</span>
                  <span className="mt-[3px] block truncate font-mono text-[11.5px] text-ink-3">
                    {formatDate(p.startedOn)} ~{' '}
                    {p.endedOn === null ? (
                      <span className="text-teal-text">{SURVEY_ONGOING_LABEL}</span>
                    ) : (
                      formatDate(p.endedOn)
                    )}
                  </span>
                </span>
                <span className={`size-[15px] shrink-0 text-ink-4 transition-transform ${expanded ? 'rotate-180' : ''}`}>
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
                    <>
                    {/* 띠는 행에서 이어져 정보 칸에서 끝난다 — 대상 기준점부터는 성격이 다른 목록이라 잇지 않는다 */}
                    <div className={selected ? 'shadow-[inset_3px_0_0_var(--color-teal)]' : ''}>
                      {/* 진행률 (이 프로젝트 기준) */}
                      {selected && (
                      <div className="px-3.5 pb-[13px] pt-0">
                        {progressLoading ? (
                          <div className="space-y-1.5">
                            <Skeleton className="h-3 w-40" />
                            <Skeleton className="h-1.5 w-full rounded-full" />
                          </div>
                        ) : (
                          <>
                            <div className="mb-[7px] flex items-baseline text-[11.5px] text-ink-3">
                              <span className="flex-1">
                                조사 <b className="font-mono font-semibold text-teal-text">{psurveyed}</b> / 전체{' '}
                                <span className="font-mono">{ptotal}</span>
                              </span>
                              <span className="font-mono font-semibold text-teal-text">{ppct}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-track">
                              <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,#1E9C86,#2FC0A6)] transition-[width] duration-500 ease-out"
                                style={{ width: `${ppct}%` }}
                              />
                            </div>

                            {/* 결과별 내역 — 색은 아래 범례·지도 마커와 같은 뜻으로 쓴다 */}
                            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-[5px] text-[11.5px] text-ink-3">
                              <StatusCount label={SURVEY_STATUS_LABEL.done} count={pdone} dotClass="bg-teal" />
                              <StatusCount label={SURVEY_STATUS_LABEL.lost} count={plost} dotClass="bg-danger" />
                              <StatusCount label={SURVEY_STATUS_LABEL.todo} count={ptodo} dotClass="border-[1.5px] border-idle" />
                            </div>
                          </>
                        )}
                      </div>
                      )}

                      <ProjectNote note={p.note ?? ''} />
                    </div>

                    {/* 목록은 위 정보와 성격이 달라 선으로 끊고 이름표를 붙인다.
                        점별 조사·망실 기록은 '선택된(조사 대상)' 프로젝트에서만. 리스트는 PointRowList가 내부 메모 */}
                    {selected ? (
                      <div className="border-t border-line-soft pt-2">
                        <p className="px-3.5 pb-1 text-[11px] font-medium tracking-[.08em] text-ink-4">대상 기준점</p>
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
                    </>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

    </div>
  )
}

/** 조사 결과 내역 한 칸 — 점 색으로 지도 마커·범례와 같은 상태를 가리킨다. */
function StatusCount(props: { label: string; count: number; dotClass: string }) {
  return (
    <span className="inline-flex items-center gap-[5px]">
      <i className={`inline-block size-2 rounded-full ${props.dotClass}`} aria-hidden />
      {props.label}
      <b className="font-mono font-normal text-ink-2">{props.count}</b>
    </span>
  )
}

/**
 * 조사에 기록한 비고. 수치와 달리 서술형 문장이므로 인용문처럼 세로선을 두어 구분한다.
 * 검색 대상 필드이므로 값이 없어도 자리는 유지한다.
 */
function ProjectNote(props: { note: string }) {
  return (
    <div className="mx-3.5 mb-3 border-l-2 border-line-btn bg-soft px-2.5 py-2 text-[11.5px] leading-[1.6]">
      {props.note === '' ? (
        <p className="text-ink-4">내용이 없습니다</p>
      ) : (
        <p className="whitespace-pre-wrap break-words text-ink-2">{props.note}</p>
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

      <div className="flex shrink-0 flex-col gap-[9px] px-3 pb-3">
        <span className="relative block">
          <span className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-4">
            <IconSearch />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름 검색"
            className={PANEL_SEARCH_INPUT}
          />
        </span>
        <button
          type="button"
          onClick={() => {
            props.onStartAddPoint()
            props.onClose() // 지도에서 위치를 찍을 수 있게 패널은 비켜 준다
          }}
          className={PANEL_ADD_BTN}
        >
          <span className="absolute left-[13px] top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-teal-text">
            <IconPlus />
          </span>
          기준점 추가
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t-2 border-t-teal">
        <PointRowList
          points={list}
          onFocus={props.onFocusPoint}
          emptyText={source.length === 0 ? '기준점이 없습니다' : '검색 결과 없음'}
          loading={props.pointsLoading}
        />
      </div>
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
      <p className="px-4 py-6 text-center text-[12.5px] text-ink-4">{emptyText ?? '기준점이 없습니다'}</p>
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
        className={`absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line-pill bg-pill py-1.5 pl-2.5 pr-3 text-[12px] font-medium text-ink-2 shadow-pill backdrop-blur-[10px] transition-all duration-200 hover:text-ink ${
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
        className={`flex h-[34px] w-full items-center gap-2 px-3.5 text-left transition-colors hover:bg-white/[0.03] ${
          props.expanded ? 'bg-teal-wash shadow-[inset_3px_0_0_var(--color-teal)]' : ''
        }`}
      >
        {props.status && <StatusMark status={props.status} />}
        <PointTypeIcon type={props.cp.type} className="size-[15px] text-ink-3" />
        <span className="flex-1 truncate text-[13px] text-ink-2">{props.cp.name}</span>
        <span className="shrink-0 text-[11px] text-ink-4">{props.cp.type}</span>
      </button>
      {/* 클릭 시 아래에 조사 완료/취소 · 망실 토글 (상세 모달과 동일 기능) */}
      {props.expanded && hasActions && (
        <div className="flex gap-2 px-3.5 py-2">
          <button
            type="button"
            onClick={props.onToggleSurvey}
            className="flex-1 rounded-chip border border-line-btn bg-btn py-1.5 text-center text-[12px] font-medium text-ink-2 transition-colors hover:bg-hover"
          >
            {props.surveyed ? '조사 취소' : '조사 완료'}
          </button>
          <button
            type="button"
            onClick={props.onToggleLost}
            className="flex-1 rounded-chip border border-danger-btn-edge bg-danger-wash py-1.5 text-center text-[12px] font-medium text-danger transition-colors hover:bg-[rgba(222,136,117,.2)]"
          >
            {props.lost ? '망실 해제' : '망실'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ── 판 안에서 쓰는 인라인 SVG 아이콘 ── */
/** 판 안에서 쓰는 작은 아이콘들 — 굵기·선 끝 처리를 한곳에서 맞춘다 */
function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
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
