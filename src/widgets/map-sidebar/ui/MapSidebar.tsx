import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { SurveyProject } from '@/entities/survey-project'
import type { ControlPoint } from '@/entities/control-point'
import { PointTypeIcon, StatusMark } from '@/entities/control-point'

/** 좌측 레일에서 열 수 있는 패널 종류 */
type PanelKey = 'project' | 'points'
/** 패널 폭(px) — 지도 오버레이 inset 계산과 동일 값 유지 */
const PANEL_WIDTH = 300

interface MapSidebarProps {
  // 조사 프로젝트
  projects: SurveyProject[]
  activeProjectId: string | null
  onChangeActive: (id: string | null) => void
  onCreate: (name: string) => void
  onDeleteActive: () => void
  // 기준점 목록
  points: ControlPoint[]
  surveyedIds: Set<string>
  lostIds: Set<string>
  onFocusPoint: (cp: ControlPoint) => void
  onToggleSurvey: (pointId: string) => void
  onToggleLost: (pointId: string) => void
  surveyedCountByProject: Record<string, number>
  // 사용자 관리 (어드민)
  isAdmin: boolean
  onOpenUserManagement: () => void
  // 패널이 지도를 가리는 폭 통지 (포커스 센터링 보정용)
  onInsetChange?: (px: number) => void
  // 외부(지도 위 활성 프로젝트 칩)에서 프로젝트 패널 열기 요청 (nonce, 증가할 때마다 열림)
  openProjectSignal?: number
}

export function MapSidebar(props: MapSidebarProps) {
  const [open, setOpen] = useState<PanelKey | null>(null)
  // 닫히는 동안에도 마지막 패널을 그려둬야 슬라이드 아웃이 매끄러움
  const [lastPanel, setLastPanel] = useState<PanelKey>('project')
  const toggle = (key: PanelKey) => {
    if (open === key) setOpen(null)
    else {
      setLastPanel(key)
      setOpen(key)
    }
  }

  // 패널이 지도를 가리는 폭을 부모에 알림 → 포커스 센터링이 '보이는 영역 중앙' 기준을 쓰게
  const onInsetChange = props.onInsetChange
  useEffect(() => {
    onInsetChange?.(open ? PANEL_WIDTH : 0)
  }, [open, onInsetChange])

  // 활성 프로젝트 칩 클릭 → 프로젝트 패널 열기 (nonce 증가 시. 0=초기값이라 무시)
  const openProjectSignal = props.openProjectSignal
  useEffect(() => {
    if (!openProjectSignal) return
    setLastPanel('project')
    setOpen('project')
  }, [openProjectSignal])

  // 패널 본문은 '열려 있을 때만' 마운트(닫히면 슬라이드 아웃 후 지연 언마운트).
  // ★ 성능: 프로젝트가 펼쳐지면 본문에 점 수천 개(PointRow)가 그려지는데, 닫혀도 마운트돼 있으면
  //   무관한 리렌더(예: 클러스터 클릭 팬 중 매 프레임 setClusterPopup)마다 이 수천 행이 재조정돼 렉이 걸린다.
  //   닫힘 상태에선 트리에서 제거해 이런 리렌더가 레일만 건드리게 함. (열림 시 1프레임 빈 상태는 슬라이드 인과 겹쳐 무시 가능)
  const [renderBody, setRenderBody] = useState(false)
  useEffect(() => {
    if (open) {
      setRenderBody(true)
      return
    }
    const t = setTimeout(() => setRenderBody(false), 220)
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

function PanelHeader(props: { title: string; onClose: () => void }) {
  return (
    <header className="flex items-center gap-2 border-b border-gray-700 px-4 py-3">
      <h2 className="flex-1 text-sm font-bold text-gray-50">{props.title}</h2>
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
 * 프로젝트 목록. 행 클릭 = 펼침(browse)일 뿐이고, '선택(활성화)'은 드로어 안의 버튼으로 한다.
 * 선택(active)과 펼침(expand)을 분리 → '선택'이 명시적 행위가 되고, 선택중은 행에 뚜렷이 표시된다.
 */
function ProjectPanel(props: MapSidebarProps & { onClose: () => void }) {
  // 펼침(browse)은 선택(active)과 독립. 처음엔 선택된 프로젝트를 펼쳐 둔다.
  const [expandedId, setExpandedId] = useState<string | null>(props.activeProjectId)
  // 닫힘 애니메이션: 접히는 동안에도 내용을 잠깐 유지(mountedId 지연 언마운트)
  const [mountedId, setMountedId] = useState<string | null>(expandedId)
  useEffect(() => {
    if (expandedId !== null) {
      setMountedId(expandedId)
      return
    }
    const t = setTimeout(() => setMountedId(null), 220)
    return () => clearTimeout(t)
  }, [expandedId])

  // 드로어에서 조사 토글 버튼을 펼친 점 (펼친 프로젝트 바뀌면 초기화)
  const [expandedPointId, setExpandedPointId] = useState<string | null>(null)
  useEffect(() => setExpandedPointId(null), [expandedId])

  function handleNew() {
    const name = window.prompt('조사 프로젝트 이름 (예: 2026.7.1.자 조사)', '')
    if (name && name.trim()) props.onCreate(name.trim())
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="조사 프로젝트" onClose={props.onClose} />

      <div className="px-3 py-3">
        <button
          type="button"
          onClick={handleNew}
          className="w-full rounded-md border border-blue-600 bg-blue-600 py-2 text-[13px] font-medium text-white hover:bg-blue-500"
        >
          ＋ 새 조사
        </button>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {props.projects.length === 0 && (
          <li className="px-4 py-6 text-center text-[13px] text-gray-500">조사 프로젝트가 없습니다</li>
        )}
        {props.projects.map((p) => {
          const expanded = expandedId === p.id
          const selected = props.activeProjectId === p.id // ★ 선택(활성) = 지도/칩에 반영되는 프로젝트
          const mounted = mountedId === p.id
          const psurveyed = props.surveyedCountByProject[p.id] ?? 0
          const ptotal = props.points.length
          const ppct = ptotal ? Math.round((psurveyed / ptotal) * 100) : 0
          return (
            <li
              key={p.id}
              className={`border-b border-gray-700/60 border-l-[3px] ${
                selected ? 'border-l-blue-500 bg-blue-500/10' : 'border-l-transparent'
              }`}
            >
              {/* 행: 이름 좌측 라디오 = 선택(활성) 토글 겸 표시 · 나머지 클릭 = 펼침(browse) */}
              <div className="flex items-stretch">
                <span className="flex items-center py-3 pl-4 pr-1.5">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => props.onChangeActive(selected ? null : p.id)}
                    title={selected ? '선택 해제' : '이 조사 선택'}
                    aria-label={selected ? `${p.name} 선택 해제` : `${p.name} 이 조사 선택`}
                    className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 transition-colors ${
                      selected ? 'border-blue-400 bg-blue-500' : 'border-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {selected && (
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="#ffffff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 5 5 9-10" />
                      </svg>
                    )}
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                  aria-expanded={expanded}
                  className={`flex min-w-0 flex-1 items-center gap-2 py-3 pr-4 text-left text-sm ${
                    selected ? 'font-semibold text-white' : expanded ? 'text-gray-100' : 'text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  <span className="flex-1 truncate">{p.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                      ptotal > 0 && psurveyed >= ptotal ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {psurveyed}/{ptotal}
                  </span>
                  <span className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                    <IconChevronDown />
                  </span>
                </button>
              </div>

              {/* 펼침 드로어: grid-rows 0fr↔1fr 로 높이 애니메이션(열림/닫힘 모두) */}
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  {mounted && (
                    <div className="bg-gray-900/40 pb-2 pt-1">
                      {/* 진행률 (이 프로젝트 기준) */}
                      <div className="px-4 py-2">
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
                      </div>

                      {/* 점별 조사·망실 기록은 '선택된(조사 대상)' 프로젝트에서만. 리스트는 PointRowList가 내부 메모 */}
                      {selected ? (
                        <PointRowList
                          points={props.points}
                          onFocus={props.onFocusPoint}
                          survey={{
                            surveyedIds: props.surveyedIds,
                            lostIds: props.lostIds,
                            expandedPointId,
                            onExpand: setExpandedPointId,
                            onToggleSurvey: props.onToggleSurvey,
                            onToggleLost: props.onToggleLost,
                          }}
                        />
                      ) : (
                        <p className="px-4 py-2 text-[12px] leading-relaxed text-gray-500">
                          이름 왼쪽의 <b className="text-gray-400">○</b> 를 눌러 이 조사를 선택하면, 지도에 조사 현황이 표시되고 점별로 조사·망실을 기록할 수 있습니다.
                        </p>
                      )}

                      {/* 삭제는 선택된 프로젝트에서만 (onDeleteActive=활성 삭제) */}
                      {selected && (
                        <div className="px-4 pt-2">
                          <button
                            type="button"
                            onClick={props.onDeleteActive}
                            className="w-full rounded-md border border-red-800 bg-red-900/40 py-1.5 text-[12px] text-red-300 hover:bg-red-900"
                          >
                            이 조사 삭제
                          </button>
                        </div>
                      )}
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

/** 기준점 목록: 도식 아이콘 + 이름/종류 (조사여부 표시 안 함), 클릭 시 포커스 */
function PointListPanel(props: MapSidebarProps & { onClose: () => void }) {
  const [q, setQ] = useState('')
  const query = q.trim()
  // 검색 결과도 메모 → 팬 리렌더 중 새 배열을 만들지 않아 PointRowList 메모가 유지됨
  const list = useMemo(
    () => (query ? props.points.filter((p) => p.name.includes(query)) : props.points),
    [props.points, query],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title={`기준점 ${props.points.length}`} onClose={props.onClose} />

      <div className="px-3 py-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 검색"
          className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-[13px] text-gray-100 placeholder:text-gray-500 outline-none focus:border-blue-500"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <PointRowList
          points={list}
          onFocus={props.onFocusPoint}
          emptyText={props.points.length === 0 ? '기준점이 없습니다' : '검색 결과 없음'}
        />
      </div>
    </div>
  )
}

/**
 * 점 목록(내부 메모). 무관한 리렌더(지도 팬 등 부모 리렌더)엔 **같은 <ul> 엘리먼트**를 반환해
 * 수천 행 재조정을 건너뛴다(React 서브트리 bail-out). 콜백은 매 렌더 새 정체성이어도 되게 ref로 참조.
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
}) {
  const { points, survey, emptyText } = props
  const cbRef = useRef({ onFocus: props.onFocus, survey })
  useEffect(() => {
    cbRef.current = { onFocus: props.onFocus, survey }
  })

  // survey 객체는 매 렌더 새로 만들어지므로 deps엔 안정된 내부 값만 넣는다(값 같으면 팬 중 메모 유지).
  const surveyedIds = survey?.surveyedIds
  const lostIds = survey?.lostIds
  const expandedPointId = survey?.expandedPointId ?? null
  const hasSurvey = Boolean(survey)

  return useMemo(
    () => (
      <ul className="pb-1">
        {points.map((cp) => {
          const surveyed = surveyedIds?.has(cp.id) ?? false
          const lost = lostIds?.has(cp.id) ?? false
          return (
            <PointRow
              key={cp.id}
              cp={cp}
              status={hasSurvey ? (lost ? '망실' : surveyed ? '조사완료' : '미조사') : undefined}
              expanded={expandedPointId === cp.id}
              surveyed={surveyed}
              lost={lost}
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
          )
        })}
        {points.length === 0 && (
          <li className="px-4 py-6 text-center text-[13px] text-gray-500">{emptyText ?? '기준점이 없습니다'}</li>
        )}
      </ul>
    ),
    [points, surveyedIds, lostIds, expandedPointId, hasSurvey, emptyText],
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
  return (
    <li>
      <button
        type="button"
        onClick={props.onClick}
        aria-expanded={hasActions ? Boolean(props.expanded) : undefined}
        className={`flex w-full items-center gap-2 px-4 py-1.5 text-left hover:bg-gray-700 ${props.expanded ? 'bg-gray-700/40' : ''}`}
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
    </li>
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

/* ── 레일/헤더 인라인 SVG 아이콘 ── */
function svgProps() {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-full w-full',
  }
}
function IconProject() {
  return (
    <svg {...svgProps()}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  )
}
function IconPoints() {
  return (
    <svg {...svgProps()}>
      <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  )
}
function IconUsers() {
  return (
    // 두 사람 도형이 뷰박스를 꽉 채워 커 보이므로 여백을 줘 다른 아이콘과 시각 크기 맞춤
    <svg {...svgProps()} viewBox="-2 -2 28 28">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconChevronLeft() {
  return (
    <svg {...svgProps()}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}
function IconChevronDown() {
  return (
    <svg {...svgProps()}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
