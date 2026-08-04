import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { setActiveProject, toggleTheme } from '@/app/store'
import { AppHeader, PointIcon, ProjectIcon } from '@/widgets/app-header'
import { ControlPointMap } from '@/widgets/control-point-map'
import { ControlPointDetail } from '@/widgets/control-point-detail'
import { MapSidebar, MinimizedPanelChip } from '@/widgets/map-sidebar'
import type { PanelKey } from '@/shared/model/panel'
import { PointSearchBar } from '@/widgets/point-search'
import { MapCommandBar } from '@/widgets/map-command-bar'
import type OlMap from 'ol/Map'
import { ChatDockLayout } from '@/widgets/chatbot'
import type { ChatAction } from '@/widgets/chatbot'
import { POINT_TYPES, useControlPointsQuery, useRegisterControlPointMutation } from '@/entities/control-point'
import type { ControlPoint } from '@/entities/control-point'
import { useCreateSurveyProjectMutation, useSurveyProjectsQuery, useSurveyTargetsQuery } from '@/entities/survey-project'
import type { SurveyProjectDraft } from '@/entities/survey-project'
import { useCancelSurveyMutation, useRecordSurveyMutation, useSurveyRecordsQuery } from '@/entities/survey-record'
import { useImportControlPoints, useImportSurveyCsv } from '@/features/import-file'
import { AddControlPointModal } from '@/features/add-control-point'
import type { AddControlPointValues } from '@/features/add-control-point'
import { SurveyProjectFormModal } from '@/features/survey-project-form'
import { ApiError } from '@/shared/api/http'
import { Toast } from '@/shared/ui/Toast'
import { FileDropOverlay } from '@/shared/ui/FileDropOverlay'
import { useFileDrop } from '@/shared/lib/useFileDrop'
import type { ToastTone } from '@/shared/ui/Toast'
import { withoutTransition } from '@/shared/lib/instantChange'
import { wgs84ToTm } from '@/shared/lib/crs'
import type { TmEpsg } from '@/shared/lib/crs'
import { VWORLD_KEY } from '@/shared/config/map'
import type { UserProfile } from '@/entities/user'

interface MapPageProps {
  /** 지금 로그인한 사용자 — 헤더 표시와 권한 판정에 함께 쓴다 */
  profile: UserProfile | null
  onOpenUserManagement: () => void
}

/** 아무것도 그리지 않을 때 쓰는 고정 배열 — 렌더마다 새 배열을 만들면 지도 소스가 매번 재구성된다 */
const EMPTY_POINTS: ControlPoint[] = []
/**
 * 판이 화면 가장자리에서 떨어진 거리 — 지도 보정에 판 너비와 함께 쓴다.
 * 판·헤더·커맨드 바는 이 값을 유틸리티(`left-4`·`right-4`·`inset-x-4` = 16px)로 두므로 함께 움직여야 한다.
 * 클래스 이름은 문자열이라 이 상수에서 만들 수 없어 값을 두 벌로 둔다.
 */
const PANEL_MARGIN = 16
/** 커맨드 바의 대표 폭(축척이 보통 길이일 때) — 바의 왼쪽 끝을 붙여 둘 기준 자리다. 좁은 화면 값은 글자를 접은 폭 */
const COMMAND_BAR_NOMINAL = 'w-[606px] max-lg:w-[518px]'

const BANNER_TONE = {
  warn: 'border-amber/40 bg-amber-wash text-amber',
  danger: 'border-danger-edge bg-danger-wash text-danger',
  muted: 'border-line bg-panel text-ink-3',
} as const

/** 지도 위에 잠깐 뜨는 알림 띠 — 지도를 밀지 않도록 떠 있는 알약으로 둔다 */
function Banner(props: { tone: keyof typeof BANNER_TONE; children: React.ReactNode }) {
  return (
    <p
      className={`pointer-events-auto rounded-pop border px-3.5 py-1.5 text-[12px] shadow-pill [&_code]:rounded [&_code]:bg-black/20 [&_code]:px-1 ${BANNER_TONE[props.tone]}`}
    >
      {props.children}
    </p>
  )
}

export function MapPage({ profile, onOpenUserManagement }: MapPageProps) {
  const isAdmin = profile?.role === 'ADMIN'
  const dispatch = useAppDispatch()
  const theme = useAppSelector((state) => state.ui.theme)
  const activeProjectId = useAppSelector((state) => state.ui.activeProjectId)

  const pointsQuery = useControlPointsQuery()
  const projectsQuery = useSurveyProjectsQuery()
  const recordsQuery = useSurveyRecordsQuery(activeProjectId)
  const targetsQuery = useSurveyTargetsQuery(activeProjectId)
  const registerMutation = useRegisterControlPointMutation()
  const createProjectMutation = useCreateSurveyProjectMutation()
  const recordMutation = useRecordSurveyMutation()
  const cancelMutation = useCancelSurveyMutation()
  const importMutation = useImportSurveyCsv()
  const importPointsMutation = useImportControlPoints()

  // 쿼리 미도착(undefined) 기본값 — 참조가 렌더마다 바뀌면 지도 소스 재구성·리스트 메모가 깨져 useMemo로 고정
  const points = useMemo(() => pointsQuery.data ?? [], [pointsQuery.data])
  // 수동 등록이 임포트 규칙(이름·종류 매칭)을 따르므로, 입력 중인 이름이 기존 점과 맞는지 그 키로 찾아 준다
  const pointByNameType = useMemo(
    () => new Map(points.map((point) => [`${point.type}|${point.name}`, point])),
    [points],
  )
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])
  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data])

  // 고른 조사의 대상 점 — 진행률 분모와 프로젝트 패널 목록이 이걸 따른다.
  const targetIds = useMemo(
    () => (targetsQuery.data === undefined ? null : new Set(targetsQuery.data)),
    [targetsQuery.data],
  )
  // 대상 목록이 도착하기 전에는 아무것도 대상으로 치지 않는다.
  // 전체를 대신 내놓으면 조사를 고른 직후 한 프레임 동안 지도에 전체 기준점이 깔렸다가 걸러진다.
  const targetPoints = useMemo(() => {
    if (activeProjectId === null) return points
    if (targetIds === null) return EMPTY_POINTS
    return points.filter((p) => targetIds.has(p.id))
  }, [activeProjectId, points, targetIds])

  const tmEpsg: TmEpsg = 'EPSG:5186' // 부천 = 중부원점 고정
  const [showCadastral, setShowCadastral] = useState(true)
  const [mapInstance, setMapInstance] = useState<OlMap | null>(null) // 하단 상태 표시가 직접 구독한다
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusNonce, setFocusNonce] = useState(0)
  /** 처음 자리로 되돌리라는 신호 — 얼마나 옮길지는 판이 가린 폭을 아는 지도가 정한다 */
  const [homeNonce, setHomeNonce] = useState(0)
  /**
   * 좌측 판 — 켜진 판이 지도에 그릴 점도 정한다.
   * 접어 두면(minimized) 고른 것은 그대로 두고 판만 칩으로 줄인다. 끄면 고른 것도 놓는다.
   */
  const [panel, setPanel] = useState<{ key: PanelKey; minimized: boolean } | null>(null)
  const openPanel = panel !== null && !panel.minimized ? panel.key : null
  // 헤더 알약 폭 — 그 아래 서는 활성 조사 칩과 좌측 판이 같은 너비를 쓴다
  const [headerWidth, setHeaderWidth] = useState(0)
  // 헤더 우측 묶음(검색+사용자) 폭 — 그 아래 서는 대화 판이 같은 너비를 쓴다
  const [utilityWidth, setUtilityWidth] = useState(0)
  // 대화 판이 지도를 가리는 폭(닫혀 있으면 0)
  const [chatWidth, setChatWidth] = useState(0)
  // 판이 지도를 가리는 폭 — 포커스 센터링과 지도 위 요소 배치가 '보이는 영역'을 쓰게 한다
  const mapLeftInset = openPanel === null ? 0 : headerWidth + PANEL_MARGIN * 2
  const mapRightInset = chatWidth === 0 ? 0 : chatWidth + PANEL_MARGIN * 2
  // 기준점 추가 — 모달이 주 경로이고, '지도에서 위치 찍기'는 그 안의 한 단계(찍는 동안만 모달을 숨긴다)
  const [addOpen, setAddOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<{ northing: number; easting: number; epsg: TmEpsg } | null>(null)
  // 조사 프로젝트 추가 — 창 하나가 입력·파일 읽기·여러 건 넘기기를 모두 맡는다
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const [creatingProject, setCreatingProject] = useState(false)
  // 파일을 고르기 전에 적어 두던 값 — 첫 조사 입력으로 이어 준다
  const [carriedDraft, setCarriedDraft] = useState<SurveyProjectDraft | null>(null)
  // 입력 중인 값을 ref 로 따라간다 — 화면 아무 데나 파일을 놓아도 이어 쓸 수 있어야 하는데,
  // 상태로 올리면 글자를 칠 때마다 지도까지 다시 그린다
  const openDraftRef = useRef<SurveyProjectDraft | null>(null)
  // 결과 알림 — id를 key로 써서 같은 문구가 다시 떠도 애니·타이머가 재시작된다
  const [toast, setToast] = useState<{ id: number; message: string; tone: ToastTone } | null>(null)
  const toastIdRef = useRef(0)

  function showToast(message: string, tone: ToastTone = 'info') {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, message, tone })
  }
  const fileDrop = useFileDrop((files) => startImport(files))

  /**
   * 헤더 탭 — 같은 탭을 다시 누르면 닫는다.
   * 두 탭은 함께 서지 않는다: 기준점 탭은 전체 목록이라 고른 조사를 그대로 두면
   * 그 조사의 대상이 아닌 점에 조사·망실을 기록할 수 있다.
   */
  function togglePanel(key: PanelKey) {
    // 접어 둔 판의 탭을 다시 누르면 끄지 않고 펼친다 — 칩으로 줄여 둔 것을 되돌리는 길이다
    if (panel?.key === key) {
      if (panel.minimized) setPanel({ key, minimized: false })
      else closePanel()
      return
    }
    setPanel({ key, minimized: false })
    if (key === 'points') dispatch(setActiveProject(null))
  }

  /** 판을 끈다 — 고른 것도 함께 놓는다(조사 선택 해제) */
  function closePanel() {
    setPanel(null)
    dispatch(setActiveProject(null))
  }

  /**
   * 지도에 그릴 점 — 기본은 아무것도 그리지 않는다.
   * 기준점 탭을 열면 전체(목록과 지도가 같은 집합), 조사를 고르면 그 조사의 대상만.
   * 고른 점은 어느 경우에도 함께 그린다 — 헤더 검색·챗봇 안내는 패널을 열지 않고 점을 지목하므로,
   * 빼면 지목한 자리에 아무것도 나타나지 않는다.
   */
  const visiblePoints = useMemo(() => {
    const base = panel?.key === 'points' ? points : activeProjectId !== null ? targetPoints : EMPTY_POINTS
    if (selectedId === null || base.some((p) => p.id === selectedId)) return base
    const focused = points.find((p) => p.id === selectedId)
    return focused === undefined ? base : [...base, focused]
  }, [panel, activeProjectId, points, targetPoints, selectedId])

  // 고른 점이 지도에서 사라졌으면 선택을 푼다(마커 없는 상세가 남지 않게)
  useEffect(() => {
    setSelectedId((cur) => (cur !== null && !visiblePoints.some((p) => p.id === cur) ? null : cur))
  }, [visiblePoints])

  // 활성 프로젝트의 조사기록만 조회하므로 레코드 존재=조사됨, lost=망실
  const surveyedIds = useMemo(() => new Set(records.map((r) => r.pointId)), [records])
  const lostIds = useMemo(() => new Set(records.filter((r) => r.lost).map((r) => r.pointId)), [records])

  // 위치 찍기 중 지도 클릭 → 좌표만 모달로 돌려주고 다시 입력 화면으로. 찍은 값은 시작값일 뿐 실제 성과가 아니다.
  function addPoint(lng: number, lat: number) {
    const { x, y } = wgs84ToTm(lng, lat, tmEpsg)
    setPicked({ northing: y, easting: x, epsg: tmEpsg })
    setPicking(false)
  }

  function startAddPoint() {
    setPicked(null)
    setPicking(false)
    setAddOpen(true)
  }

  function closeAddPoint() {
    setAddOpen(false)
    setPicking(false)
    setPicked(null)
  }

  /**
   * 기준점 파일 한 건 등록.
   * 여러 건을 등록하는 중이면 건마다 알리지 않고 마지막에 한 번만 알린다.
   * 실패는 여기서 알리고 그대로 다시 던진다: 창이 그 건에 머물러 사유를 보여줄 수 있어야 한다.
   */
  async function importPoints(file: File, batch: { index: number; total: number }) {
    const batched = batch.total > 1
    const last = batch.index === batch.total - 1
    try {
      const summary = await importPointsMutation.mutateAsync(file)
      if (!batched) {
        showToast(`기준점 ${summary.newPoints}건을 등록하고 ${summary.updatedPoints}건을 고쳤습니다.`, 'success')
      }
      if (batched && last) showToast(`기준점 파일 ${batch.total}건을 등록했습니다.`, 'success')
    } catch (e) {
      // 파일이 거부된 사유(몇 행이 왜 잘못됐는지)는 서버 응답에만 있어 그대로 보여 준다
      showToast(e instanceof ApiError ? e.message : '기준점을 등록하지 못했습니다.', 'error')
      throw e
    }
  }

  function submitAddPoint(values: AddControlPointValues) {
    registerMutation.mutate(
      {
        pointNo: values.pointNo,
        type: values.type,
        name: values.name,
        northing: values.northing,
        easting: values.easting,
        tmEpsg: values.tmEpsg,
      },
      {
        onSuccess: (outcome) => {
          closeAddPoint()
          setSelectedId(outcome.point.id)
          // 같은 이름·종류가 있으면 임포트 규칙대로 갱신으로 끝난다 — 무엇이 벌어졌는지 그대로 알린다
          const done = outcome.created
            ? '기준점을 등록했습니다.'
            : outcome.updated
              ? '같은 이름·종류의 기준점을 입력 값으로 갱신했습니다.'
              : '이미 같은 값으로 등록된 기준점입니다.'
          // 부천 범위 밖 경고는 등록을 막지 않으므로 완료와 한 알림에 싣는다(알림은 한 번에 하나만 뜬다)
          showToast(outcome.warning === null ? done : `${done} ${outcome.warning}`, outcome.warning === null ? 'success' : 'info')
        },
        onError: (e) =>
          showToast(
            e instanceof ApiError && e.code === 'CONTROL_POINT_DUPLICATE'
              ? e.message
              : '기준점을 등록하지 못했습니다.',
            'error',
          ),
      },
    )
  }

  /**
   * 조사 한 건 등록.
   * 여러 건을 등록하는 중이면 건마다 알리지 않고 마지막에 한 번만 알린다.
   * 실패는 여기서 알리고 그대로 다시 던진다: 창이 그 건에 머물러 고쳐 보낼 수 있어야 한다.
   */
  async function submitProject(draft: SurveyProjectDraft, file: File | null, batch?: { index: number; total: number }) {
    const batched = batch !== undefined && batch.total > 1
    const last = batch === undefined || batch.index === batch.total - 1
    try {
      if (file) {
        const summary = await importMutation.mutateAsync({ file, draft })
        if (!batched) {
          showToast(
            `기준점 ${summary.totalRows}점, 조사 기록 ${summary.createdRecords}건을 불러왔습니다.`,
            'success',
          )
        }
      } else {
        await createProjectMutation.mutateAsync(draft)
      }
      if (batched && last) showToast(`프로젝트 ${batch.total}건을 등록했습니다.`, 'success')
    } catch (e) {
      // 파일이 거부된 사유(몇 행이 왜 잘못됐는지)는 서버 응답에만 있어 그대로 보여 준다
      showToast(e instanceof ApiError ? e.message : '프로젝트를 등록하지 못했습니다.', 'error')
      throw e
    }
  }

  function notifySurveySaveFailed() {
    showToast('조사 상태를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error')
  }

  function handleToggleSurvey(pointId: string) {
    if (!activeProjectId) return
    if (surveyedIds.has(pointId)) {
      cancelMutation.mutate({ projectId: activeProjectId, pointId }, { onError: notifySurveySaveFailed })
    } else {
      recordMutation.mutate({ projectId: activeProjectId, pointId, lost: false }, { onError: notifySurveySaveFailed })
    }
  }

  function handleToggleLost(pointId: string) {
    if (!activeProjectId) return
    // 미조사면 망실로 기록(서버 upsert), 망실이면 정상으로 정정
    recordMutation.mutate(
      { projectId: activeProjectId, pointId, lost: !lostIds.has(pointId) },
      { onError: notifySurveySaveFailed },
    )
  }

  /**
   * 화면에 떨어뜨린 파일은 언제나 프로젝트를 추가한다 — 화면에 적힌 안내와 벌어지는 일이 늘 같아야 한다.
   * 기준점 파일은 기준점 창 안에 놓아야 기준점으로 읽힌다.
   *
   * 창이 떠 있으면 그 창이 파일을 가로채므로(Modal) 여기까지 오지 않는다 — 무엇으로 읽을지는 열려 있는 창이 정한다.
   */
  function startImport(files: File[]) {
    setCarriedDraft(openDraftRef.current)
    openDraftRef.current = null
    setPendingFiles(files)
    setCreatingProject(true)
  }

  function closeProjectFlow() {
    setCreatingProject(false)
    setPendingFiles(null)
    setCarriedDraft(null)
    openDraftRef.current = null
  }

  function focusPoint(cp: ControlPoint) {
    setSelectedId(cp.id)
    setFocusNonce((n) => n + 1)
  }

  // 챗봇 액션 → 지도 상호작용(기준점 포커스 / 조사 프로젝트 선택)
  function handleChatAction(action: ChatAction) {
    if (action.type === 'focusPoint') {
      const cp = points.find((p) => p.pointNo === action.pointNo)
      if (cp) focusPoint(cp)
    } else {
      dispatch(setActiveProject(String(action.projectId)))
      setPanel({ key: 'project', minimized: false })
    }
  }

  const selected = points.find((p) => p.id === selectedId) ?? null
  // 조사 기록은 그 조사의 대상 점에만 남길 수 있다. 대상이 아니면 조사 상태와 기록 버튼을 내주지 않는다.
  const selectedIsTarget = selected !== null && targetIds !== null && targetIds.has(selected.id)
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null

  return (
    <div className={`contents ${theme === 'dark' ? 'dark' : 'theme-light'}`}>
    {/* 화면 어디에 파일을 떨어뜨려도 그 파일이 붙은 채로 조사 추가가 열린다 */}
    {/* min-w-app-min: 이보다 좁아지면 판끼리 겹치므로 더 줄이지 않고 잘라 낸다(가로로 밀어서 본다) */}
    <div className="app-bg relative flex h-full min-w-app-min flex-col text-ink" {...fileDrop.dropHandlers}>
      {fileDrop.dragging && <FileDropOverlay label="놓으면 프로젝트를 추가합니다" hint="CSV · XLSX" />}

      <ChatDockLayout width={utilityWidth} onDockWidthChange={setChatWidth} onAction={handleChatAction}>
      <div className="relative min-h-0 min-w-0 flex-1">
        <AppHeader
          tabs={[
            { key: 'project', label: '프로젝트', icon: <ProjectIcon />, active: openPanel === 'project', onClick: () => togglePanel('project') },
            { key: 'points', label: '기준점', icon: <PointIcon />, active: openPanel === 'points', onClick: () => togglePanel('points') },
          ]}
          onBrandWidthChange={setHeaderWidth}
          onUtilityWidthChange={setUtilityWidth}
          search={<PointSearchBar points={points} onSelect={focusPoint} />}
          user={profile}
          onOpenUserManagement={onOpenUserManagement}
        />

        <MapSidebar
          projects={projects}
          activeProjectId={activeProjectId}
          onChangeActive={(id) => dispatch(setActiveProject(id))}
          onCreate={() => setCreatingProject(true)}
          points={points}
          targetPoints={targetPoints}
          surveyedIds={surveyedIds}
          lostIds={lostIds}
          onFocusPoint={focusPoint}
          onToggleSurvey={handleToggleSurvey}
          onToggleLost={handleToggleLost}
          onStartAddPoint={startAddPoint}
          projectsLoading={projectsQuery.isPending}
          pointsLoading={pointsQuery.isPending}
          recordsLoading={activeProjectId !== null && recordsQuery.isPending}
          targetsLoading={activeProjectId !== null && targetsQuery.isPending}
          isAdmin={isAdmin}
          onOpenUserManagement={onOpenUserManagement}
          open={openPanel}
          onMinimize={() => panel && setPanel({ key: panel.key, minimized: true })}
          onClose={closePanel}
          width={headerWidth}
        />

        {/* 알림 띠 — 지도를 밀지 않고 헤더 아래에 겹쳐 둔다 */}
        <div className="pointer-events-none absolute inset-x-0 top-[76px] z-10 flex flex-col items-center gap-1.5 px-4">
          {!VWORLD_KEY && (
            <Banner tone="warn">
              VWorld API 키가 없어 배경지도를 OSM으로 대체합니다. <code>.env</code>에 <code>VITE_VWORLD_KEY</code>를 넣으면
              VWorld 배경지도·지적도가 표시됩니다.
            </Banner>
          )}
          {pointsQuery.isPending && <Banner tone="muted">기준점을 불러오는 중…</Banner>}
          {pointsQuery.isError && <Banner tone="danger">기준점을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</Banner>}
          {/* 대상을 못 읽으면 전체를 대신 그리지 않는다 — 대상이 아닌 점에 조사·망실을 기록할 수 있게 되기 때문 */}
          {targetsQuery.isError && (
            <Banner tone="danger">대상 기준점을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</Banner>
          )}
        </div>

        <div className="absolute inset-0">
            <ControlPointMap
              points={visiblePoints}
              addMode={picking}
              showCadastral={showCadastral}
              selectedId={selectedId}
              surveyMode={activeProjectId !== null}
              surveyedIds={surveyedIds}
              lostIds={lostIds}
              theme={theme}
              focusNonce={focusNonce}
              homeNonce={homeNonce}
              leftInset={mapLeftInset}
              rightInset={mapRightInset}
              onAddPoint={addPoint}
              onSelect={setSelectedId}
              onMapReady={setMapInstance}
            />

            {/* 커맨드 바 — 표시 설정과 읽을거리를 지도 아래 한 줄에 모은다.
                판은 이 줄 위에서 끝나므로 판이 열려도 자리를 옮기지 않는다.
                포인터 좌표·축척은 지도 인스턴스를 직접 구독해 페이지는 리렌더되지 않는다. */}
            <div className="pointer-events-none absolute inset-x-4 bottom-[18px] z-[15] flex justify-center">
              {/* 축척 막대는 배율에 따라 길이가 변한다. 대표 폭만큼의 빈 자리를 가운데 두고 바를 그 왼쪽 끝에 붙여
                  바 자신은 자리 계산에서 빠지게 한다 — 왼쪽 끝은 고정되고 오른쪽만 늘고 준다.
                  폭을 재서 맞추면 한 프레임 늦게 반영돼 축척이 바뀔 때마다 바가 떤다. */}
              <div className={`relative h-[34px] ${COMMAND_BAR_NOMINAL}`}>
                <div className="pointer-events-auto absolute left-0 top-0">
                  <MapCommandBar
                    map={mapInstance}
                    tmEpsg={tmEpsg}
                    showCadastral={showCadastral}
                    onToggleCadastral={() => setShowCadastral((v) => !v)}
                    theme={theme}
                    onToggleTheme={() => withoutTransition(() => dispatch(toggleTheme()))}
                    onResetView={() => setHomeNonce((n) => n + 1)}
                  />
                </div>
              </div>
            </div>

            {/* 접어 둔 판을 대신하는 칩 — 무엇을 보고 있는지 알리고, 누르면 판이 다시 펼쳐진다 */}
            {panel?.minimized && (
              <div className="absolute left-4 top-[76px] z-[15]" style={{ width: headerWidth || undefined }}>
                {panel.key === 'project' ? (
                  <MinimizedPanelChip
                    label="프로젝트"
                    value={activeProject?.name ?? '선택 중인 프로젝트 없음'}
                    trailing={activeProject ? { surveyed: surveyedIds.size, total: targetPoints.length } : undefined}
                    onOpen={() => setPanel({ key: 'project', minimized: false })}
                    onClose={closePanel}
                  />
                ) : (
                  <MinimizedPanelChip
                    label="기준점"
                    value="지도에 표시 중"
                    trailing={{ count: points.length }}
                    onOpen={() => setPanel({ key: 'points', minimized: false })}
                    onClose={closePanel}
                  />
                )}
              </div>
            )}

            {/* 위치 찍기 중 — 모달은 숨어 있으므로 지도 위에서 무엇을 해야 하는지 알려 준다 */}
            {picking && (
              <div className="absolute left-1/2 top-[76px] z-[25] flex -translate-x-1/2 items-center gap-3 rounded-pill border border-line-pill bg-pill py-2 pl-4 pr-2 text-[13px] text-ink shadow-pill">
                지도를 클릭해 위치를 지정하세요
                <button type="button" onClick={() => setPicking(false)} className="rounded-chip px-2.5 py-1 text-[12px] text-ink-3 transition-colors hover:bg-hover hover:text-ink">
                  취소
                </button>
              </div>
            )}

            {/* 상세 카드 — 지도 위 우측. 대화 판이 열리면 그 옆으로 비켜 선다 */}
            <div
              className="absolute top-[76px] z-[15]"
              style={{ right: PANEL_MARGIN + (chatWidth === 0 ? 0 : chatWidth + PANEL_MARGIN) }}
            >
            <ControlPointDetail
              point={selected}
              activeProjectName={selectedIsTarget ? (activeProject?.name ?? null) : null}
              surveyed={selected !== null && surveyedIds.has(selected.id)}
              lost={selected !== null && lostIds.has(selected.id)}
              onToggleSurvey={handleToggleSurvey}
              onClose={() => setSelectedId(null)}
              onToggleLost={handleToggleLost}
              onCopied={(ok) =>
                ok
                  ? showToast('클립보드로 복사되었습니다.', 'success')
                  : showToast('클립보드로 복사하지 못했습니다.', 'error')
              }
            />
            </div>
        </div>
      </div>
      </ChatDockLayout>

      {addOpen && (
        <AddControlPointModal
          defaultType={POINT_TYPES[0]}
          defaultEpsg={tmEpsg}
          picked={picked}
          existingOf={(name, type) => pointByNameType.get(`${type}|${name}`) ?? null}
          picking={picking}
          onPick={() => setPicking(true)}
          submitting={registerMutation.isPending}
          onSubmit={submitAddPoint}
          onImport={importPoints}
          onCancel={closeAddPoint}
        />
      )}

      {creatingProject && (
        <SurveyProjectFormModal
          title="프로젝트 추가"
          submitLabel="추가"
          author={profile ? `${profile.name} · ${profile.team} ${profile.position}` : ''}
          defaults={carriedDraft ?? undefined}
          initialFiles={pendingFiles}
          onDraftChange={(draft) => {
            openDraftRef.current = draft
          }}
          submitting={createProjectMutation.isPending || importMutation.isPending}
          onSubmit={submitProject}
          onNotice={(message) => showToast(message)}
          onCancel={closeProjectFlow}
        />
      )}

      {toast && (
        <Toast key={`toast-${toast.id}`} message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      )}
    </div>
    </div>
  )
}
