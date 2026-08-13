import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { clearStatusFilter, selectAllStatus, setActiveProject, showSurveyStatus, toggleStatusFilter, toggleTheme } from '@/app/store'
import { AppHeader, PointIcon, ProjectIcon } from '@/widgets/app-header'
import { ControlPointMap } from '@/widgets/control-point-map'
import { ControlPointDetail } from '@/widgets/control-point-detail'
import { MapSidebar, MinimizedPanelChip } from '@/widgets/map-sidebar'
import type { PanelKey } from '@/shared/model/panel'
import { PointSearchBar } from '@/widgets/point-search'
import { MapCommandBar } from '@/widgets/map-command-bar'
import { MapLayerPicker } from '@/widgets/map-layer-picker'
import { SurveyStatusFilter } from '@/widgets/survey-status-filter'
import type OlMap from 'ol/Map'
import { ChatDockLayout } from '@/widgets/chatbot'
import type { ChatAction } from '@/widgets/chatbot'
import { POINT_TYPES, fetchControlPointUsage, useControlPointsQuery, useDeleteControlPointMutation, useLastSurveysQuery, useRegisterControlPointMutation, useUpdateControlPointMutation } from '@/entities/control-point'
import type { ControlPoint } from '@/entities/control-point'
import { useCreateSurveyProjectMutation, useDeleteSurveyProjectMutation, useSurveyProjectsQuery, useSurveyTargetsQuery, useUpdateSurveyProjectMutation } from '@/entities/survey-project'
import type { SurveyProject, SurveyProjectDraft } from '@/entities/survey-project'
import { deriveSurveyStatus, useCancelSurveyMutation, useRecordSurveyMutation, useSurveyRecordsQuery } from '@/entities/survey-record'
import type { SurveyResult } from '@/entities/survey-record'
import { useImportControlPoints, useImportSurveyCsv } from '@/features/import-file'
import { ControlPointFileModal, ControlPointFormModal } from '@/widgets/add-control-point'
import type { ControlPointFormValues } from '@/widgets/add-control-point'
import { SurveyProjectCreateModal, SurveyProjectEditModal, SurveyProjectFileModal } from '@/widgets/survey-project-form'
import { ApiError } from '@/shared/api/http'
import { CHIP_BTN_DANGER } from '@/shared/ui/classes'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Toast } from '@/shared/ui/Toast'
import { FileDropOverlay } from '@/shared/ui/FileDropOverlay'
import { useFileDrop } from '@/shared/lib/useFileDrop'
import type { ToastTone } from '@/shared/ui/Toast'
import { withoutTransition } from '@/shared/lib/instantChange'
import { josa } from '@/shared/lib/josa'
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
/** 아무것도 보이지 않을 때의 고정 집합 — 참조가 바뀌면 지도 레이어가 헛되이 재스타일된다 */
const EMPTY_ID_SET: ReadonlySet<string> = new Set()
/** 조사 표시를 걷을 때 지도에 넘기는 고정 빈 맵(기준점 탭. 선택은 유지하되 뱃지는 숨긴다) */
const EMPTY_RESULT_MAP: ReadonlyMap<string, SurveyResult> = new Map()
/**
 * 판이 화면 가장자리에서 떨어진 거리 — 상세 카드가 대화 판 옆으로 비켜 서는 계산에 쓴다.
 * 판·헤더·커맨드 바는 이 값을 유틸리티(`left-4`·`right-4`·`inset-x-4` = 16px)로 두므로 함께 움직여야 한다.
 * 클래스 이름은 문자열이라 이 상수에서 만들 수 없어 값을 두 벌로 둔다.
 */
const PANEL_MARGIN = 16
/** 커맨드 바의 대표 폭(축척이 보통 길이일 때) — 바의 왼쪽 끝을 붙여 둘 기준 자리다. 좁은 화면 값은 글자를 접은 폭 */
const COMMAND_BAR_NOMINAL = 'w-[676px] max-lg:w-[592px]'

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
  const surveyStatusVisible = useAppSelector((state) => state.ui.surveyStatusVisible)
  const statusFilter = useAppSelector((state) => state.ui.statusFilter)

  const pointsQuery = useControlPointsQuery()
  const projectsQuery = useSurveyProjectsQuery()
  const recordsQuery = useSurveyRecordsQuery(activeProjectId)
  const targetsQuery = useSurveyTargetsQuery(activeProjectId)
  const registerMutation = useRegisterControlPointMutation()
  const updatePointMutation = useUpdateControlPointMutation()
  const deletePointMutation = useDeleteControlPointMutation()
  const createProjectMutation = useCreateSurveyProjectMutation()
  const updateProjectMutation = useUpdateSurveyProjectMutation()
  const deleteProjectMutation = useDeleteSurveyProjectMutation()
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
  // 법정동 경계는 꺼 둔 채로 시작한다 — 지적도 선 위에 또 선을 얹는 값이라 늘 켜 두면 지번 경계와 섞인다
  const [showDistrict, setShowDistrict] = useState(false)
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
  // 포커스는 언제나 화면 정중앙 — 판·카드가 가린 폭을 빼는 보정은 두지 않는다.
  // 점을 고르면 상세 카드가 늘 함께 떠서, 카드 폭을 빼면 어느 판이 열려 있느냐에 따라 점이 좌우로 쏠려 보인다.
  // 기준점 추가 — 직접 입력(add)과 파일 등록(file)은 입구에서 갈린 다른 창이다.
  // '지도에서 위치 찍기'는 직접 입력 안의 한 단계(찍는 동안만 모달을 숨긴다)
  const [pointModal, setPointModal] = useState<'add' | 'file' | null>(null)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<{ northing: number; easting: number; epsg: TmEpsg } | null>(null)
  // 수정·삭제할 기준점 — 값이 있으면 그 창이 떠 있다. '위치 찍기'는 추가·수정이 같은 상태를 나눠 쓴다
  const [editingPoint, setEditingPoint] = useState<ControlPoint | null>(null)
  const [deletingPoint, setDeletingPoint] = useState<ControlPoint | null>(null)
  const [pointDeleteError, setPointDeleteError] = useState<string | null>(null)
  // 참조 중이라 서버가 거부한 상태 — 물음이 아니라 '할 수 없음' 안내로 바뀌고 확정 버튼이 잠긴다
  const [pointDeleteBlocked, setPointDeleteBlocked] = useState(false)
  const deleteCheckPendingRef = useRef(false)
  // 조사 프로젝트 — 직접 생성(create, 대상 지정 포함)과 파일 등록(file)은 입구에서 갈린 다른 창이다
  const [projectModal, setProjectModal] = useState<'create' | 'file' | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  // 수정·삭제할 프로젝트 — 값이 있으면 그 창이 떠 있다
  const [editingProject, setEditingProject] = useState<SurveyProject | null>(null)
  const [deletingProject, setDeletingProject] = useState<SurveyProject | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // 수정 창의 시작값(현재 대상)과 기록 있는 점 — 수정은 드로어(펼침=활성)에서 열려 보통 캐시가 이미 데워져 있지만,
  // 활성 프로젝트와 같다는 가정에 기대지 않고 수정 대상의 id 로 따로 묻는다(키가 같으면 재요청 없이 캐시를 쓴다)
  const editTargetsQuery = useSurveyTargetsQuery(editingProject?.id ?? null)
  const editRecordsQuery = useSurveyRecordsQuery(editingProject?.id ?? null)
  const editRecordedIds = useMemo(
    () => new Set((editRecordsQuery.data ?? []).map((r) => r.pointId)),
    [editRecordsQuery.data],
  )
  // 시작값(대상)이나 기록을 못 불러오면 수정 창을 못 연다 — 빈 시작값이면 저장이 대상 전체 해제로 둔갑하고,
  // 기록 없이 열면 '기록이 함께 삭제됩니다' 경고가 빠진 채 저장할 수 있다
  const failEditOpen = useEffectEvent(() => {
    setEditingProject(null)
    showToast('프로젝트 정보를 불러오지 못해 수정 창을 열 수 없습니다. 잠시 후 다시 시도해 주세요.', 'error')
  })
  useEffect(() => {
    if (editingProject !== null && (editTargetsQuery.isError || editRecordsQuery.isError)) failEditOpen()
  }, [editingProject, editTargetsQuery.isError, editRecordsQuery.isError])
  // 결과 알림 — id를 key로 써서 같은 문구가 다시 떠도 애니·타이머가 재시작된다
  const [toast, setToast] = useState<{ id: number; message: string; tone: ToastTone } | null>(null)
  const toastIdRef = useRef(0)

  function showToast(message: string, tone: ToastTone = 'info') {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, message, tone })
  }
  const fileDrop = useFileDrop((files) => startImport(files))

  /**
   * 헤더 탭 — 같은 탭을 다시 누르면 접고(칩), 접힌 탭을 누르면 다시 편다. 닫기(선택 해제)는 판의 X 가 맡는다.
   * 탭을 오가도 고른 조사는 유지된다 — 기준점 탭은 전체를 보여 줄 뿐이고,
   * 대상 아닌 점의 기록은 화면(대상만 버튼 노출)과 서버(404)가 이미 막고 있어 선택을 놓을 이유가 없다.
   */
  function togglePanel(key: PanelKey) {
    if (panel?.key === key) {
      setPanel({ key, minimized: !panel.minimized })
      return
    }
    // 접어 둔 채 탭을 옮기면 접힌 채로 옮긴다 — 탭 전환이 접힘을 마음대로 펴면 접어 둔 뜻이 사라진다
    setPanel({ key, minimized: panel?.minimized ?? false })
  }

  /** 판을 끈다 — 고른 것도 함께 놓는다(조사 선택 해제) */
  function closePanel() {
    setPanel(null)
    dispatch(setActiveProject(null))
  }

  // 고른 점이 없어졌으면 선택을 푼다(마커 없는 상세가 남지 않게) — 보이는 집합에는 고른 점이 늘 실리므로 존재만 본다
  useEffect(() => {
    setSelectedId((cur) => (cur !== null && !points.some((p) => p.id === cur) ? null : cur))
  }, [points])

  /** 고른 조사의 눈으로 보는 중인지 — 값이 있으면 그 조사의 id 다. 기준점 탭은 전체를 보는 자리라 여기서 빠진다 */
  const projectView = activeProjectId !== null && panel?.key !== 'points' ? activeProjectId : null
  const screenedForRef = useRef<string | null>(null)

  /**
   * 조사 상세로 들어설 때, 그 조사의 대상이 아닌 선택은 놓는다.
   *
   * <p>기준점 탭에서 아무 점이나 고른 채 조사를 열면 그 점은 이 조사와 상관이 없다. 그대로 두면 상세 카드가
   * 남고 지도에도 대상 아닌 마커가 하나 함께 그려져, 이 조사가 맡은 범위가 어긋나 보인다.
   *
   * <p>들어설 때 한 번만 거른다. 보는 내내 걸러 두면 헤더 검색과 챗봇 안내가 조사를 열어 둔 채로 대상 밖의
   * 점을 가리킬 수 없다. 그 둘은 판을 열지 않고 점을 지목하므로 지목한 자리가 빈 채로 남는다.
   *
   * <p>대상 목록이 오기 전에는 판정하지 않는다. 도착 전에는 대상이 0건이라 고른 점이 대상이어도 놓아 버린다.
   *
   * <p>놓을 때 지도도 처음 자리로 되돌린다. 목록에서 고른 점은 지도를 그 점까지 당겨 놓으므로,
   * 선택만 놓으면 조사와 상관없는 자리에 아무것도 없는 화면이 남는다.
   */
  useEffect(() => {
    if (projectView === null) {
      screenedForRef.current = null // 나갔다 다시 들어오면 그때 한 번 더 거른다
      return
    }
    if (targetIds === null || screenedForRef.current === projectView) return
    screenedForRef.current = projectView
    if (selectedId === null || targetIds.has(selectedId)) return
    setSelectedId(null)
    setHomeNonce((n) => n + 1)
  }, [projectView, targetIds, selectedId])

  // 활성 프로젝트의 조사기록만 조회하므로 맵에 있으면 조사됨이고, 값이 그 점의 조사 결과다
  const resultById = useMemo(() => new Map(records.map((r) => [r.pointId, r.result])), [records])
  // 기타 비고는 상세 카드가 이어서 고칠 수 있어야 해서 결과와 함께 들고 있는다
  const noteById = useMemo(() => new Map(records.map((r) => [r.pointId, r.note])), [records])
  // 기준점 탭에서는 조사 표시를 걷는다 — 선택은 유지하되 상세 카드의 조사 상태는 선택 해제와 같은 모습이어야 한다
  const surveyVisible = activeProjectId !== null && panel?.key !== 'points'

  /**
   * 상태를 무엇으로 셀지 — 조사를 골라 그 회차를 보는 중이면 그 회차의 결과, 그 외에는 점의 최신 상태.
   *
   * <p>같은 점이라도 둘은 갈린다. 이번 회차에서 아직 안 본 점도 지난 회차에서는 정상이었을 수 있다.
   * 회차를 골라 진척을 보는 자리에서는 이번 회차의 결과여야 하고, 회차와 무관하게 지금 무엇이 망실인지
   * 보는 자리(기준점 탭·조사 미선택)에서는 마지막으로 조사한 결과여야 한다.
   */
  const statusFromProject = surveyVisible
  // 표시를 켠 동안에만 받아 온다 — 그리지 않을 표를 미리 받아 둘 만큼 작은 응답이 아니다.
  // 조사한 점만 담겨 오므로 응답 크기는 조사 진척만큼이다
  const lastSurveysQuery = useLastSurveysQuery(surveyStatusVisible && !statusFromProject)
  /** 지도가 칠하고 거를 때 보는 표 — 상태 표시를 꺼 두면 null 이라 마커에 판정이 얹히지 않는다 */
  const statusById = useMemo<ReadonlyMap<string, SurveyResult> | null>(() => {
    if (!surveyStatusVisible) return null
    return statusFromProject ? resultById : (lastSurveysQuery.data ?? EMPTY_RESULT_MAP)
  }, [surveyStatusVisible, statusFromProject, resultById, lastSurveysQuery.data])
  const statusFilterSet = useMemo(() => new Set(statusFilter), [statusFilter])

  /**
   * 지도에 보일 점 — 기본은 아무것도 보이지 않는다.
   * 기준점 탭을 열면 전체(null = 전부), 조사를 고르면 그 조사의 대상만.
   * 점 소스는 전체를 한 번만 들고 있으므로, 탭·조사 전환은 소스 재구성이 아니라 이 집합의 교체다.
   * 고른 점은 어느 경우에도 함께 보인다 — 헤더 검색·챗봇 안내는 패널을 열지 않고 점을 지목하므로,
   * 빼면 지목한 자리에 아무것도 나타나지 않는다.
   *
   * <p>상태를 고르면 그 판정의 점만 남긴다. 사이드바 목록도 같은 표와 같은 판정으로 좁아지므로,
   * 목록을 훑어도 지도에 없는 점은 나오지 않는다.
   */
  const visibleIds = useMemo<ReadonlySet<string> | null>(() => {
    // 탭·조사가 정하는 범위 — 기준점 탭은 전체(null), 조사를 고르면 그 대상, 그 밖에는 아무것도 아니다
    const scoped: ReadonlySet<string> | null =
      panel?.key === 'points' ? null : activeProjectId !== null && targetIds !== null ? targetIds : EMPTY_ID_SET
    const table = statusById
    if (table === null || statusFilterSet.size === 0) return withSelected(scoped)
    // 거를 때만 점을 훑는다 — 거르지 않는 동안에는 전체(null)를 그대로 넘겨 지도가 집합을 보지 않게 한다
    const kept = points.filter(
      (p) => (scoped === null || scoped.has(p.id)) && statusFilterSet.has(deriveSurveyStatus(table.get(p.id))),
    )
    return withSelected(new Set(kept.map((p) => p.id)))

    function withSelected(ids: ReadonlySet<string> | null): ReadonlySet<string> | null {
      if (ids === null || selectedId === null || ids.has(selectedId)) return ids
      const next = new Set(ids)
      next.add(selectedId)
      return next
    }
  }, [panel, activeProjectId, targetIds, selectedId, points, statusById, statusFilterSet])

  // 위치 찍기 중 지도 클릭 → 좌표만 모달로 돌려주고 다시 입력 화면으로. 찍은 값은 시작값일 뿐 실제 성과가 아니다.
  function addPoint(lng: number, lat: number) {
    const { x, y } = wgs84ToTm(lng, lat, tmEpsg)
    setPicked({ northing: y, easting: x, epsg: tmEpsg })
    setPicking(false)
  }

  function startAddPoint() {
    setEditingPoint(null) // 위치 찍기 중에도 다른 진입 버튼이 살아 있다 — 두 창이 겹쳐 뜨지 않게 서로를 밀어낸다
    setPicked(null)
    setPicking(false)
    setPointModal('add')
  }

  function closeAddPoint() {
    setPointModal(null)
    setPicking(false)
    setPicked(null)
  }

  function startEditPoint(point: ControlPoint) {
    setPointModal(null) // 위치 찍기 중에도 다른 진입 버튼이 살아 있다 — 두 창이 겹쳐 뜨지 않게 서로를 밀어낸다
    setPicked(null)
    setPicking(false)
    setEditingPoint(point)
  }

  function closeEditPoint() {
    setEditingPoint(null)
    setPicking(false)
    setPicked(null)
  }

  /** 프로젝트 흐름으로 들어갈 때 부른다 — 위치 찍기로 숨어 있던 기준점 창이 나중에 함께 떠오르지 않게 그 흐름을 접는다 */
  function closePointFlow() {
    setPointModal(null)
    setEditingPoint(null)
    setPicking(false)
    setPicked(null)
  }

  function submitEditPoint(values: ControlPointFormValues) {
    if (editingPoint === null) return
    updatePointMutation.mutate(
      // 창을 열 때 본 판 번호를 되보낸다 — 그사이 누가 먼저 고쳤으면 서버가 거절한다
      { ...values, id: editingPoint.id, version: editingPoint.version },
      {
        onSuccess: (outcome) => {
          closeEditPoint()
          setSelectedId(outcome.point.id)
          const done = '기준점을 수정했습니다.'
          // 부천 범위 밖 경고는 저장을 막지 않으므로 완료와 한 알림에 싣는다
          showToast(outcome.warning === null ? done : `${done} ${outcome.warning}`, outcome.warning === null ? 'success' : 'info')
        },
        onError: (e) =>
          showToast(
            e instanceof ApiError
            && (e.code === 'CONTROL_POINT_DUPLICATE'
              || e.code === 'CONTROL_POINT_NOT_FOUND'
              || e.code === 'CONTROL_POINT_MODIFIED')
              ? e.message
              : '기준점을 수정하지 못했습니다.',
            'error',
          ),
      },
    )
  }

  /**
   * 삭제 확인 열기 — 참조 여부를 먼저 물어 창을 물음/불가 중 맞는 쪽으로 연다.
   * 물었다가 거부당해 같은 창이 불가로 바뀌면 확인이 두 번 뜨는 것처럼 보인다.
   */
  async function startDeletePoint(p: ControlPoint) {
    // 응답을 기다리는 동안의 재클릭은 같은 조회만 되풀이한다 — 첫 조회가 창을 열 때까지 무시한다
    if (deleteCheckPendingRef.current) return
    deleteCheckPendingRef.current = true
    setPointDeleteError(null)
    try {
      setPointDeleteBlocked(await fetchControlPointUsage(p.id))
    } catch {
      // 참조 확인이 안 돼도 흐름은 연다 — 최종 판정은 삭제 요청에서 서버가 한다(아래 409 분기가 받는다)
      setPointDeleteBlocked(false)
    } finally {
      deleteCheckPendingRef.current = false
    }
    setDeletingPoint(p)
  }

  /** 삭제 확정 — 참조 여부는 창을 열 때 갈랐고, 그 사이 생긴 참조는 서버 409 가 최종적으로 막는다. */
  function confirmDeletePoint() {
    if (deletingPoint === null) return
    const target = deletingPoint
    deletePointMutation.mutate(target.id, {
      onSuccess: () => {
        setDeletingPoint(null)
        setSelectedId((cur) => (cur === target.id ? null : cur))
        // 위치 찍기로 숨어 있던 그 점의 수정 창이 남으면 없는 점을 고치게 된다 — 함께 접는다
        if (editingPoint !== null && editingPoint.id === target.id) closeEditPoint()
        showToast('기준점을 삭제했습니다.', 'success')
      },
      onError: (e) => {
        // 참조 중 거부는 다시 눌러도 같은 답이다 — 물음을 '할 수 없음' 안내로 바꾸고 확정을 잠근다
        if (e instanceof ApiError && e.code === 'CONTROL_POINT_IN_USE') {
          setPointDeleteBlocked(true)
          return
        }
        setPointDeleteError(
          e instanceof ApiError ? e.message : '기준점을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        )
      },
    })
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

  function submitAddPoint(values: ControlPointFormValues) {
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
   * 파일로 조사 한 건 등록 — 파일의 행이 그 조사의 대상이 된다.
   * 여러 건을 등록하는 중이면 건마다 알리지 않고 마지막에 한 번만 알린다.
   * 실패는 여기서 알리고 그대로 다시 던진다: 창이 그 건에 머물러 고쳐 보낼 수 있어야 한다.
   */
  async function importProject(draft: SurveyProjectDraft, file: File, batch?: { index: number; total: number }) {
    const batched = batch !== undefined && batch.total > 1
    const last = batch === undefined || batch.index === batch.total - 1
    try {
      const summary = await importMutation.mutateAsync({ file, draft })
      if (!batched) {
        showToast(
          `기준점 ${summary.totalRows}점, 조사 기록 ${summary.createdRecords}건을 불러왔습니다.`,
          'success',
        )
      }
      if (batched && last) showToast(`프로젝트 ${batch.total}건을 등록했습니다.`, 'success')
    } catch (e) {
      // 파일이 거부된 사유(몇 행이 왜 잘못됐는지)는 서버 응답에만 있어 그대로 보여 준다
      showToast(e instanceof ApiError ? e.message : '프로젝트를 등록하지 못했습니다.', 'error')
      throw e
    }
  }

  /** 직접 생성 — 성공하면 만든 조사를 바로 골라, 다음 할 일(대상 확인·조사 기록)로 이어지게 한다. */
  function createProject(draft: SurveyProjectDraft, targetPointIds: string[]) {
    createProjectMutation.mutate(
      { draft, targetPointIds },
      {
        onSuccess: (project) => {
          setProjectModal(null)
          dispatch(setActiveProject(project.id))
          setPanel({ key: 'project', minimized: false })
          showToast(`프로젝트를 등록했습니다. 대상 기준점 ${targetPointIds.length}점을 지정했습니다.`, 'success')
        },
        onError: (e) =>
          showToast(e instanceof ApiError ? e.message : '프로젝트를 등록하지 못했습니다.', 'error'),
      },
    )
  }

  function saveProjectEdit(draft: SurveyProjectDraft, targetPointIds: string[]) {
    if (editingProject === null) return
    updateProjectMutation.mutate(
      { id: editingProject.id, draft, targetPointIds },
      {
        onSuccess: () => {
          setEditingProject(null)
          showToast('프로젝트를 수정했습니다.', 'success')
        },
        onError: (e) =>
          showToast(e instanceof ApiError ? e.message : '프로젝트를 수정하지 못했습니다.', 'error'),
      },
    )
  }

  /** 삭제 확정 — 대상 지정·조사 기록이 함께 지워지므로 확인 창을 거쳐서만 온다. */
  function confirmDeleteProject() {
    if (deletingProject === null) return
    const target = deletingProject
    deleteProjectMutation.mutate(target.id, {
      onSuccess: () => {
        setDeletingProject(null)
        // 지운 조사를 보고 있었으면 선택을 놓는다 — 지도·판이 없는 조사를 가리키지 않게. 그 조사의 수정 창도 함께 접는다
        if (activeProjectId === target.id) dispatch(setActiveProject(null))
        if (editingProject !== null && editingProject.id === target.id) setEditingProject(null)
        showToast('프로젝트를 삭제했습니다.', 'success')
      },
      onError: (e) =>
        setDeleteError(e instanceof ApiError ? e.message : '프로젝트를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'),
    })
  }

  function notifySurveySaveFailed() {
    showToast('조사 상태를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error')
  }



  /** 상세 카드의 조사 기록 UI에서 결과 하나를 고르면 그대로 기록한다. 비고는 기타를 고를 때만 채워 온다. */
  // 완료·실패를 그대로 돌려준다 — 카드가 답을 기다리는 동안 다음 선택을 막고, 실패하면 고른 값을 놓는다
  async function handleRecordSurvey(pointId: string, result: SurveyResult, note: string | null) {
    if (!activeProjectId) return
    await recordMutation.mutateAsync({ projectId: activeProjectId, pointId, result, note }, { onError: notifySurveySaveFailed })
  }

  /** 상세 카드에서 미조사로 되돌리기. 기록 자체를 지운다. */
  async function handleCancelSurvey(pointId: string) {
    if (!activeProjectId) return
    await cancelMutation.mutateAsync({ projectId: activeProjectId, pointId }, { onError: notifySurveySaveFailed })
  }

  /**
   * 화면에 떨어뜨린 파일은 언제나 프로젝트를 추가한다 — 화면에 적힌 안내와 벌어지는 일이 늘 같아야 한다.
   * 기준점 파일은 기준점 창 안에 놓아야 기준점으로 읽힌다.
   *
   * 창이 떠 있으면 그 창이 파일을 가로채므로(Modal) 여기까지 오지 않는다 — 무엇으로 읽을지는 열려 있는 창이 정한다.
   */
  function startImport(files: File[]) {
    closePointFlow()
    setPendingFiles(files)
    setProjectModal('file')
  }

  function closeProjectFlow() {
    setProjectModal(null)
    setPendingFiles(null)
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
            // 접어 둔(칩) 상태도 그 판을 보는 중이다 — 탭 표시는 펼침 여부가 아니라 어느 판이 서 있는지를 따른다
            { key: 'project', label: '프로젝트', icon: <ProjectIcon />, active: panel?.key === 'project', onClick: () => togglePanel('project') },
            { key: 'points', label: '기준점', icon: <PointIcon />, active: panel?.key === 'points', onClick: () => togglePanel('points') },
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
          onCreate={() => {
            closePointFlow()
            setProjectModal('create')
          }}
          onImportProjects={() => {
            closePointFlow()
            setPendingFiles(null)
            setProjectModal('file')
          }}
          onEditProject={(p) => {
            closePointFlow()
            setEditingProject(p)
          }}
          onDeleteProject={(p) => {
            closePointFlow()
            setDeleteError(null)
            setDeletingProject(p)
          }}
          points={points}
          targetPoints={targetPoints}
          resultById={resultById}
          onFocusPoint={focusPoint}
          onStartAddPoint={startAddPoint}
          onImportPoints={() => {
            // 위치 찍기 중에도 이 버튼이 살아 있다 — 찍기 안내·좌표 수신이 파일 창과 겹치지 않게 흐름을 접는다
            closePointFlow()
            setPointModal('file')
          }}
          projectsLoading={projectsQuery.isPending}
          pointsLoading={pointsQuery.isPending}
          recordsLoading={activeProjectId !== null && recordsQuery.isPending}
          targetsLoading={activeProjectId !== null && targetsQuery.isPending}
          isAdmin={isAdmin}
          onOpenUserManagement={onOpenUserManagement}
          open={openPanel}
          minimized={panel?.minimized === true}
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
              points={points}
              visibleIds={visibleIds}
              addMode={picking}
              showCadastral={showCadastral}
              showDistrict={showDistrict}
              selectedId={selectedId}
              surveyMode={statusById !== null}
              resultById={statusById ?? EMPTY_RESULT_MAP}
              theme={theme}
              focusNonce={focusNonce}
              homeNonce={homeNonce}
              onAddPoint={addPoint}
              onSelect={setSelectedId}
              onMapReady={setMapInstance}
            />

            {/* 커맨드 바 — 표시 설정과 읽을거리를 지도 아래 한 줄에 모은다.
                판은 이 줄 위에서 끝나므로 판이 열려도 자리를 옮기지 않는다.
                포인터 좌표·축척은 지도 인스턴스를 직접 구독해 페이지는 리렌더되지 않는다.
                바에서 위로 열리는 말풍선은 창이 좁으면 왼쪽 판과 가로로 겹친다. 판(z-20)보다 위에 두어
                가려지지 않게 한다. 바 자신은 판이 비워 둔 아래 여백(--spacing-bar-clear) 안에 서므로 판을 덮지 않는다. */}
            <div className="pointer-events-none absolute inset-x-4 bottom-[18px] z-[21] flex justify-center">
              {/* 축척 막대는 배율에 따라 길이가 변한다. 대표 폭만큼의 빈 자리를 가운데 두고 바를 그 왼쪽 끝에 붙여
                  바 자신은 자리 계산에서 빠지게 한다 — 왼쪽 끝은 고정되고 오른쪽만 늘고 준다.
                  폭을 재서 맞추면 한 프레임 늦게 반영돼 축척이 바뀔 때마다 바가 떤다. */}
              <div className={`relative h-[34px] ${COMMAND_BAR_NOMINAL}`}>
                <div className="pointer-events-auto absolute left-0 top-0">
                  <MapCommandBar
                    map={mapInstance}
                    tmEpsg={tmEpsg}
                    layers={
                      <MapLayerPicker
                        layers={[
                          { key: 'cadastral', label: '지적도', on: showCadastral, onToggle: () => setShowCadastral((v) => !v) },
                          { key: 'district', label: '법정동 경계', on: showDistrict, onToggle: () => setShowDistrict((v) => !v) },
                        ]}
                      />
                    }
                    theme={theme}
                    onToggleTheme={() => withoutTransition(() => dispatch(toggleTheme()))}
                    surveyStatus={
                      <SurveyStatusFilter
                        visible={surveyStatusVisible}
                        onShow={() => dispatch(showSurveyStatus())}
                        selected={statusFilterSet}
                        onToggle={(status) => dispatch(toggleStatusFilter(status))}
                        onClear={() => dispatch(clearStatusFilter())}
                        onSelectAll={() => dispatch(selectAllStatus())}
                      />
                    }
                    onResetView={() => setHomeNonce((n) => n + 1)}
                  />
                </div>
              </div>
            </div>

            {/* 접어 둔 판을 대신하는 칩 — 무엇을 보고 있는지 알리고, 누르면 판이 다시 펼쳐진다.
                판이 칩 자리로 말려 올라오는 동안 칩은 panel-in 으로 내려앉아 접히는 흐름이 이어진다 */}
            {panel?.minimized && (
              <div key={panel.key} className="panel-in absolute left-4 top-[76px] z-[15]" style={{ width: headerWidth || undefined }}>
                {panel.key === 'project' ? (
                  <MinimizedPanelChip
                    label="프로젝트"
                    value={activeProject?.name ?? '선택 중인 프로젝트 없음'}
                    trailing={activeProject ? { surveyed: resultById.size, total: targetPoints.length } : undefined}
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
                {/* 찍기를 그만두는 취소 — 앱 전역 규격대로 빨강 */}
                <button type="button" onClick={() => setPicking(false)} className={`${CHIP_BTN_DANGER} px-2.5 py-1 text-[12px]`}>
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
              activeProjectName={surveyVisible && selectedIsTarget ? (activeProject?.name ?? null) : null}
              surveyorName={
                surveyVisible && selectedIsTarget && selected !== null
                  ? (records.find((r) => r.pointId === selected.id)?.surveyorName ?? null)
                  : null
              }
              surveyedAt={
                surveyVisible && selectedIsTarget && selected !== null
                  ? (records.find((r) => r.pointId === selected.id)?.surveyedAt ?? null)
                  : null
              }
              surveyResult={surveyVisible && selected !== null ? (resultById.get(selected.id) ?? null) : null}
              surveyNote={surveyVisible && selected !== null ? (noteById.get(selected.id) ?? null) : null}
              activeProjectId={surveyVisible && selectedIsTarget ? activeProjectId : null}
              onImageUploaded={() => showToast('기준점 사진을 등록했습니다.', 'success')}
              onImageFailed={(message) => showToast(message, 'error')}
              onRecordSurvey={handleRecordSurvey}
              onCancelSurvey={handleCancelSurvey}
              onClose={() => setSelectedId(null)}
              onEdit={startEditPoint}
              onDelete={(p) => void startDeletePoint(p)}
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

      {pointModal === 'add' && (
        <ControlPointFormModal
          title="기준점 추가"
          submitLabel="등록"
          defaultType={POINT_TYPES[0]}
          defaultEpsg={tmEpsg}
          picked={picked}
          existingOf={(name, type) => pointByNameType.get(`${type}|${name}`) ?? null}
          picking={picking}
          onPick={() => setPicking(true)}
          submitting={registerMutation.isPending}
          onSubmit={submitAddPoint}
          onCancel={closeAddPoint}
        />
      )}

      {editingPoint !== null && (
        <ControlPointFormModal
          key={editingPoint.id} // 다른 점으로 바뀌면 입력값도 그 점에서 새로 시작한다
          title="기준점 수정"
          submitLabel="저장"
          initial={{
            pointNo: editingPoint.pointNo,
            name: editingPoint.name,
            type: editingPoint.type,
            northing: editingPoint.northing,
            easting: editingPoint.easting,
            tmEpsg: editingPoint.tmEpsg,
          }}
          defaultType={editingPoint.type}
          defaultEpsg={editingPoint.tmEpsg}
          picked={picked}
          // 자기 자신은 충돌이 아니다 — 지금 수정 중인 점을 빼고 알린다
          existingOf={(name, type) => {
            const found = pointByNameType.get(`${type}|${name}`)
            return found !== undefined && found.id !== editingPoint.id ? found : null
          }}
          picking={picking}
          onPick={() => setPicking(true)}
          submitting={updatePointMutation.isPending}
          onSubmit={submitEditPoint}
          onCancel={closeEditPoint}
        />
      )}

      {deletingPoint !== null && (
        <ConfirmDialog
          // 창을 열기 전에 참조 여부를 갈랐다 — 삭제 가능이면 물음, 참조 중이면 확정이 잠긴 '할 수 없음' 안내
          message={
            pointDeleteBlocked
              ? `'${deletingPoint.name}'${josa(deletingPoint.name, '은', '는')} 삭제할 수 없습니다.`
              : `'${deletingPoint.name}'${josa(deletingPoint.name, '을', '를')} 삭제할까요?`
          }
          detail={pointDeleteBlocked ? '프로젝트에서 참조 중인 기준점입니다.' : '삭제한 항목은 되돌릴 수 없습니다.'}
          error={pointDeleteError ?? undefined}
          confirmLabel="삭제"
          cancelLabel={pointDeleteBlocked ? '닫기' : undefined}
          danger
          busy={deletePointMutation.isPending}
          busyLabel="삭제 중…"
          confirmDisabled={pointDeleteBlocked}
          onConfirm={confirmDeletePoint}
          onCancel={() => setDeletingPoint(null)}
        />
      )}

      {pointModal === 'file' && (
        <ControlPointFileModal onImport={importPoints} onCancel={() => setPointModal(null)} />
      )}

      {projectModal === 'file' && (
        <SurveyProjectFileModal
          author={profile ? `${profile.name} · ${profile.team} ${profile.position}` : ''}
          initialFiles={pendingFiles}
          submitting={importMutation.isPending}
          onSubmit={importProject}
          onNotice={(message) => showToast(message)}
          onCancel={closeProjectFlow}
        />
      )}

      {projectModal === 'create' && (
        <SurveyProjectCreateModal
          author={profile ? `${profile.name} · ${profile.team} ${profile.position}` : ''}
          points={points}
          submitting={createProjectMutation.isPending}
          onSubmit={createProject}
          onCancel={() => setProjectModal(null)}
        />
      )}

      {/* 시작값(현재 대상)과 기록이 오기 전에는 열지 않는다 — 빈 선택으로 열리면 저장이 대상 전체 해제가 되고,
          기록 없이 열리면 기록 삭제 경고가 빠진다 */}
      {editingProject !== null && editTargetsQuery.data !== undefined && editRecordsQuery.data !== undefined && (
        <SurveyProjectEditModal
          key={editingProject.id} // 다른 프로젝트로 바뀌면 입력값도 그 프로젝트에서 새로 시작한다
          project={editingProject}
          author={profile ? `${profile.name} · ${profile.team} ${profile.position}` : ''}
          points={points}
          initialTargetIds={editTargetsQuery.data}
          recordedPointIds={editRecordedIds}
          submitting={updateProjectMutation.isPending}
          onSubmit={saveProjectEdit}
          onCancel={() => setEditingProject(null)}
        />
      )}

      {deletingProject !== null && (
        <ConfirmDialog
          message={`'${deletingProject.name}' 프로젝트를 삭제할까요?`}
          detail="대상 지정과 조사 기록이 함께 삭제되며 되돌릴 수 없습니다."
          error={deleteError ?? undefined}
          confirmLabel="삭제"
          danger
          busy={deleteProjectMutation.isPending}
          busyLabel="삭제 중…"
          onConfirm={confirmDeleteProject}
          onCancel={() => setDeletingProject(null)}
        />
      )}

      {toast && (
        <Toast key={`toast-${toast.id}`} message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      )}
    </div>
    </div>
  )
}
