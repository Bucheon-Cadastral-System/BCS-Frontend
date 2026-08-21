import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks'
import { selectTheme, toggleTheme } from '@/shared/model/theme'
import { AppHeader, PointIcon, ProjectIcon } from '@/widgets/app-header'
import { ControlPointMap } from '@/widgets/control-point-map'
import { ControlPointDetail } from '@/widgets/control-point-detail'
import { MapSidebar, MinimizedPanelChip } from '@/widgets/map-sidebar'
import type { RefreshScope } from '@/widgets/map-sidebar'
import type { PanelKey } from '@/shared/model/panel'
import { PointSearchBar } from '@/widgets/point-search'
import { MapCommandBar } from '@/widgets/map-command-bar'
import { MapLayerPicker, CADASTRAL_MIN_SCALE, CADASTRAL_SWATCH, DISTRICT_SWATCH } from '@/widgets/map-layer-picker'
import { MapCompass } from '@/widgets/map-compass'
import { MobileBottomNav } from '@/widgets/mobile-bottom-nav'
import { MobileSummaryChip } from '@/widgets/mobile-summary-chip'
import { SurveyStatusFilter } from '@/widgets/survey-status-filter'
import type OlMap from 'ol/Map'
import { ChatDockLayout } from '@/widgets/chatbot'
import type { ChatAction } from '@/widgets/chatbot'
import { POINT_TYPES, fetchControlPointUsage, useControlPointsQuery, useDeleteControlPointMutation, useLastSurveyQuery, useLastSurveysQuery, useRegisterControlPointMutation, useUpdateControlPointMutation } from '@/entities/control-point'
import type { ControlPoint, MappableControlPoint } from '@/entities/control-point'
import { exportSurveyProjectApi, selectActiveProjectId, setActiveProject, useCreateSurveyProjectMutation, useDeleteSurveyProjectMutation, useSurveyProjectsQuery, useSurveyTargetsQuery, useUpdateSurveyProjectMutation } from '@/entities/survey-project'
import type { SurveyProject, SurveyProjectDraft } from '@/entities/survey-project'
import { clearStatusFilter, countSurveyStatus, deriveSurveyStatus, selectAllStatus, selectStatusFilter, surveyStatusFromLabel, toggleStatusFilter, useCancelSurveyMutation, useRecordSurveyMutation, useSurveyRecordsQuery } from '@/entities/survey-record'
import type { SurveyResult } from '@/entities/survey-record'
import { useImportControlPoints, useImportSurveyCsv } from '@/features/import-file'
import { ControlPointFileModal, ControlPointFormModal } from '@/widgets/add-control-point'
import type { ControlPointFormValues } from '@/widgets/add-control-point'
import { SurveyProjectCreateModal, SurveyProjectEditModal, SurveyProjectFileModal } from '@/widgets/survey-project-form'
import { ApiError } from '@/shared/api/http'
import { CHIP_BTN_DANGER, PILL } from '@/shared/ui/classes'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Toast } from '@/shared/ui/Toast'
import { FileDropOverlay } from '@/shared/ui/FileDropOverlay'
import { useFileDrop } from '@/shared/lib/useFileDrop'
import { useNarrowScreen } from '@/shared/lib/useNarrowScreen'
import { useLockedDocument } from '@/shared/lib/useLockedDocument'
import { useViewportHeight } from '@/shared/lib/useViewportHeight'
import { LIST_SHEET_RATIO, useBottomSheet } from '@/shared/lib/useBottomSheet'
import { useCompassHeading } from '@/shared/lib/useCompassHeading'
import type { ToastTone } from '@/shared/ui/Toast'
import { withoutTransition } from '@/shared/lib/instantChange'
import { josa } from '@/shared/lib/josa'
import { wgs84ToTm } from '@/shared/lib/crs'
import type { TmEpsg } from '@/shared/lib/crs'
import { VWORLD_KEY } from '@/shared/config/map'
import { CONTROL_POINTS_KEY, LAST_SURVEYS_KEY, SURVEY_PROJECTS_KEY, SURVEY_TARGETS_KEY, surveyRecordsKey } from '@/shared/api/queryKeys'
import { PANEL_MARGIN } from '@/shared/ui/layout'
import { MapBanner } from '@/shared/ui/MapBanner'
import { Spinner } from '@/shared/ui/Spinner'
import { ThemeToggleButton } from '@/shared/ui/ThemeToggleButton'
import type { UserProfile } from '@/entities/user'

interface MapPageProps {
  /** 지금 로그인한 사용자 — 헤더 표시와 권한 판정에 함께 쓴다 */
  profile: UserProfile | null
  onOpenUserManagement: () => void
  /** 내 정보를 고친 뒤 — 프로필을 다시 받는다 */
  onProfileUpdated: () => void
}

/** 아무것도 그리지 않을 때 쓰는 고정 배열 — 렌더마다 새 배열을 만들면 지도 소스가 매번 재구성된다 */
const EMPTY_POINTS: ControlPoint[] = []
/** 아무것도 보이지 않을 때의 고정 집합 — 참조가 바뀌면 지도 레이어가 헛되이 재스타일된다 */
const EMPTY_ID_SET: ReadonlySet<string> = new Set()
/** 조사 표시를 걷을 때 지도에 넘기는 고정 빈 맵(기준점 탭. 선택은 유지하되 뱃지는 숨긴다) */
const EMPTY_RESULT_MAP: ReadonlyMap<string, SurveyResult> = new Map()

/** 커맨드 바의 대표 폭(축척이 보통 길이일 때) — 바의 왼쪽 끝을 붙여 둘 기준 자리다. 좁은 화면 값은 글자를 접은 폭 */
const COMMAND_BAR_NOMINAL = 'w-[676px] max-lg:w-[592px]'

/** 새로고침을 마쳤을 때의 알림 — 무엇을 받았는지 자리마다 말한다 */
const REFRESH_DONE = {
  project: '프로젝트 목록을 다시 불러왔습니다.',
  'project-detail': '프로젝트 정보를 다시 불러왔습니다.',
  points: '기준점 목록을 다시 불러왔습니다.',
} as const

/** 지도 위에 잠깐 뜨는 알림 띠 — 지도를 밀지 않도록 떠 있는 알약으로 둔다 */
/** 그 조사일이 이 회차 기간 안인지 — 끝나지 않은 회차는 시작일부터 뒤가 모두 그 안이다. 날짜 문자열은 사전순이 곧 시간순이다 */
function withinProject(project: SurveyProject | null, surveyedOn: string | null) {
  if (project === null || surveyedOn === null) return false
  return surveyedOn >= project.startedOn && (project.endedOn === null || surveyedOn <= project.endedOn)
}

export function MapPage({ profile, onOpenUserManagement, onProfileUpdated }: MapPageProps) {
  const isAdmin = profile?.role === 'ADMIN'
  const dispatch = useAppDispatch()
  const theme = useAppSelector(selectTheme)
  const activeProjectId = useAppSelector(selectActiveProjectId)
  const statusFilter = useAppSelector(selectStatusFilter)
  // 고른 갈래가 곧 켜짐이다 — 하나라도 걸려 있으면 켜진 것이고, 비면 꺼진 것이다
  const surveyStatusVisible = statusFilter.length > 0

  const queryClient = useQueryClient()
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
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null
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

  const narrow = useNarrowScreen()
  const viewportHeight = useViewportHeight()
  // 이 화면의 모든 자리는 화면에 붙어 서 있다 — 문서가 튕겨 밀리면 그 자리가 통째로 따라 올라간다
  useLockedDocument(narrow)
  const tmEpsg: TmEpsg = 'EPSG:5186' // 부천 = 중부원점 고정
  const [showCadastral, setShowCadastral] = useState(true)
  // 법정동 경계는 꺼 둔 채로 시작한다 — 지적도 선 위에 또 선을 얹는 값이라 늘 켜 두면 지번 경계와 섞인다
  const [showDistrict, setShowDistrict] = useState(false)
  const [mapInstance, setMapInstance] = useState<OlMap | null>(null) // 하단 상태 표시가 직접 구독한다
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /**
   * 상세를 닫을 때 되살릴 목록 시트 — 목록에서 골라 들어왔을 때만 값이 있다.
   *
   * <p>좁은 화면에서 목록과 상세는 겹쳐 서지 않고 갈아탄다. 갈아타고 왔으면 되돌아갈 자리가 있어야 하고,
   * 지도에서 곧장 고른 점은 되돌아갈 자리가 없다 — 그때 목록이 올라오면 열지 않은 것이 열린다.
   */
  const restorePanel = useRef<PanelKey | null>(null)
  const [focusNonce, setFocusNonce] = useState(0)
  /** 처음 자리로 되돌리라는 신호 — 얼마나 옮길지는 패널이 가린 폭을 아는 지도가 정한다 */
  const [homeNonce, setHomeNonce] = useState(0)
  /**
   * 기기가 향한 쪽 — 좁은 화면에서만 읽는다.
   *
   * <p>현재 위치 표시가 이 값을 따라 화살촉으로 서서 그쪽을 가리킨다. 켜고 끄는 자리는 두지 않는다.
   * 넓은 화면(책상 위 모니터)은 방향을 내주는 기기가 아니라 아예 읽지 않는다.
   */
  const compassHeading = useCompassHeading(narrow)
  /** 현재 위치 따라가기 — 좁은 화면 전용. 지도를 손으로 끌면 그 자리에서 풀린다 */
  const [following, setFollowing] = useState(false)
  /**
   * 좌측 패널 — 켜진 패널이 지도에 그릴 점도 정한다.
   * 접어 두면(minimized) 고른 것은 그대로 두고 패널만 칩으로 줄인다. 끄면 고른 것도 놓는다.
   */
  const [panel, setPanel] = useState<{ key: PanelKey; minimized: boolean } | null>(null)
  /** 지금 펴져 있는 패널 — 자리를 차지하는 것은 이것뿐이다(줄여 두면 없는 것으로 친다) */
  const openPanel = panel !== null && !panel.minimized ? panel.key : null
  /**
   * 지금 보고 있는 갈래 — 패널이 서 있는지와 다르다.
   *
   * <p>패널을 내려도 고른 프로젝트가 남아 있으면 지도는 그 회차의 판정을 계속 칠하므로 여전히 프로젝트를
   * 보는 중이다. 반대로 기준점 탭은 고른 것이 없어 내리면 그것으로 끝난다.
   *
   * <p>탭의 켜짐, 헤더 밑 요약 칩, 지도의 판정 표시가 모두 이 하나를 따른다. 셋이 각자 조건을 세우면
   * '칩은 프로젝트를 가리키는데 탭은 꺼져 있는' 어긋난 화면이 나온다.
   */
  const viewing: PanelKey | null = panel?.key ?? (activeProjectId === null ? null : 'project')
  // 헤더 알약 폭 — 그 아래 서는 프로젝트 칩과 좌측 패널이 같은 너비를 쓴다
  const [headerWidth, setHeaderWidth] = useState(0)
  // 헤더 우측 묶음(검색+사용자) 폭 — 그 아래 서는 대화 패널이 같은 너비를 쓴다
  const [utilityWidth, setUtilityWidth] = useState(0)
  // 대화 패널이 지도를 가리는 폭(닫혀 있으면 0)
  const [chatWidth, setChatWidth] = useState(0)
  // 포커스는 언제나 화면 정중앙 — 패널·카드가 가린 폭을 빼는 보정은 두지 않는다.
  // 점을 고르면 상세 카드가 늘 함께 떠서, 카드 폭을 빼면 어느 패널이 열려 있느냐에 따라 점이 좌우로 쏠려 보인다.
  // 기준점 추가 — 직접 입력(add)과 파일 등록(file)은 입구에서 갈린 다른 창이다.
  // '지도에서 위치 찍기'는 직접 입력 안의 한 단계(찍는 동안만 모달을 숨긴다)
  const [pointModal, setPointModal] = useState<'add' | 'file' | null>(null)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<{ northing: number; easting: number; epsg: TmEpsg } | null>(null)
  // 수정·삭제할 기준점 — 값이 있으면 그 창이 떠 있다. '위치 찍기'는 추가·수정이 같은 상태를 나눠 쓴다
  const [editingPoint, setEditingPoint] = useState<ControlPoint | null>(null)
  const [deletingPoint, setDeletingPoint] = useState<ControlPoint | null>(null)
  // 참조 중이라 서버가 거부한 상태 — 물음이 아니라 '할 수 없음' 안내로 바뀌고 확정 버튼이 잠긴다
  const [pointDeleteBlocked, setPointDeleteBlocked] = useState(false)
  const deleteCheckPendingRef = useRef(false)
  // 조사 프로젝트 — 직접 생성(create, 대상 지정 포함)과 파일 등록(file)은 입구에서 갈린 다른 창이다
  const [projectModal, setProjectModal] = useState<'create' | 'file' | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  // 수정·삭제할 프로젝트 — 값이 있으면 그 창이 떠 있다
  const [editingProject, setEditingProject] = useState<SurveyProject | null>(null)
  const [deletingProject, setDeletingProject] = useState<SurveyProject | null>(null)
  // 파일을 만드는 동안 버튼을 잠근다 — 점이 수천이면 서버가 표를 짓는 데 잠깐 걸린다
  const [exporting, setExporting] = useState(false)

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
   * 헤더 탭 — 같은 탭을 다시 누르면 접고(칩), 접힌 탭을 누르면 다시 편다. 닫기(선택 해제)는 패널의 X 가 맡는다.
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

  /**
   * 좁은 화면의 시트 여닫기 — 켜진 탭을 다시 누르면 내려가 지도만 남는다.
   *
   * <p>넓은 화면의 접기(칩)와 다르다. 좁은 화면에는 칩을 세울 자리가 없고, 시트를 아래로 끌어 내리는
   * 동작과 같은 결과여야 한다. 고른 조사는 그대로 두므로 조사 칩은 남는다.
   */
  function toggleSheet(key: PanelKey) {
    // 시트가 화면을 거의 덮으므로 목록과 상세가 함께 설 수 없다 — 목록을 올리면 상세는 내려간다
    setSelectedId(null)
    setPanel((current) => {
      // 같은 탭 — 줄여 둔 것은 다시 펴고, 펴져 있는 것은 내린다.
      // 넓은 화면의 탭이 접기/펴기만 오가는 것과 갈리는 대목이다. 좁은 화면은 시트 아래가 곧 지도라 내려갈 자리가 있다
      if (current?.key === key) return current.minimized ? { key, minimized: false } : null
      // 다른 탭 — 줄여 둔 채로 옮긴다. 줄여 두었다는 것은 지도를 보겠다는 뜻이라 탭을 옮겼다고 마음대로 펴지 않는다
      return { key, minimized: current?.minimized ?? false }
    })
  }

  /** 패널을 끈다 — 고른 것도 함께 놓는다(조사 선택 해제) */
  function closePanel() {
    setPanel(null)
    dispatch(setActiveProject(null))
  }

  /**
   * 좁은 화면에서 이번에 내려가는 시트가 '닫기'인지 — 닫기면 다 내려간 뒤 고른 조사도 놓는다.
   *
   * <p>내리는 길이 셋이다. 손으로 끌어내리기·시트 바깥 누르기는 지도를 보려고 잠깐 치우는 것이라 고른 것을
   * 그대로 두고, 머리말의 닫기(X)만 넓은 화면처럼 고른 것까지 놓는다.
   */
  const releaseOnSheetClose = useRef(false)
  // 다시 열렸으면 지난번 닫기 뜻은 지운다 — 닫는 도중에 되살린 시트를 나중에 끌어내렸을 때 엉뚱하게 조사가 풀린다
  useEffect(() => {
    if (openPanel !== null) releaseOnSheetClose.current = false
  }, [openPanel])

  // 고른 점이 없어졌으면 선택을 푼다(마커 없는 상세가 남지 않게) — 보이는 집합에는 고른 점이 늘 실리므로 존재만 본다
  useEffect(() => {
    setSelectedId((cur) => (cur !== null && !points.some((p) => p.id === cur) ? null : cur))
  }, [points])

  /** 고른 조사의 눈으로 보는 중인지 — 값이 있으면 그 조사의 id 다. 기준점 탭은 전체를 보는 자리라 여기서 빠진다 */
  const projectView = activeProjectId !== null && viewing !== 'points' ? activeProjectId : null
  const screenedForRef = useRef<string | null>(null)

  /**
   * 조사 상세로 들어설 때, 그 조사의 대상이 아닌 선택은 놓는다.
   *
   * <p>기준점 탭에서 아무 점이나 고른 채 조사를 열면 그 점은 이 조사와 상관이 없다. 그대로 두면 상세 카드가
   * 남고 지도에도 대상 아닌 마커가 하나 함께 그려져, 이 조사가 맡은 범위가 어긋나 보인다.
   *
   * <p>들어설 때 한 번만 거른다. 보는 내내 걸러 두면 헤더 검색과 챗봇 안내가 조사를 열어 둔 채로 대상 밖의
   * 점을 가리킬 수 없다. 그 둘은 패널을 열지 않고 점을 지목하므로 지목한 자리가 빈 채로 남는다.
   *
   * <p>대상 목록이 오기 전에는 판정하지 않는다. 도착 전에는 대상이 0건이라 고른 점이 대상이어도 놓아 버린다.
   *
   * <p>눈높이는 건드리지 않는다. 보던 자리를 옮기는 것은 사용자가 위치 초기화나 목록 선택으로 시킬 때뿐이다.
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
  }, [projectView, targetIds, selectedId])

  /**
   * 손으로 당기는 새로고침 — 패널이 실제로 쓰는 것만 다시 받는다.
   *
   * <p>자동 갱신은 언제 오는지 사람이 알 수 없다. 남이 무언가 올렸을 법한 순간에 직접 당길 자리가 하나 있으면
   * 그 불확실함이 사라진다. 받는 동안에는 잠가 둔다 — 겹쳐 누르면 같은 요청이 두 번 나가고, 눌렸는지도 알기 어렵다.
   */
  const [refreshing, setRefreshing] = useState<RefreshScope | null>(null)
  async function refresh(scope: RefreshScope) {
    if (refreshing !== null) return
    setRefreshing(scope)
    const keys =
      scope === 'points'
        ? [CONTROL_POINTS_KEY, LAST_SURVEYS_KEY]
        : scope === 'project'
          ? [SURVEY_PROJECTS_KEY]
          : [SURVEY_PROJECTS_KEY, SURVEY_TARGETS_KEY, ...(activeProjectId === null ? [] : [surveyRecordsKey(activeProjectId)])]
    try {
      await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      const failed = keys.some((queryKey) => queryClient.getQueryState(queryKey)?.status === 'error')
      if (failed) showToast('다시 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error')
      else showToast(REFRESH_DONE[scope], 'success')
    } finally {
      setRefreshing(null)
    }
  }

  /**
   * 좁은 화면에서 점을 고르면 목록 시트를 내린다.
   *
   * <p>상세 시트는 마커를 누르거나 목록에서 골라 올라온다. 그때 목록 시트가 남아 있으면 시트 두 장이
   * 겹쳐 서고, 아래 시트는 손이 닿지 않는 채로 화면만 가린다.
   *
   * <p>내리기만 하고 끄지는 않는다. 끄면 보고 있던 갈래(viewing)가 프로젝트로 되돌아간다 — 프로젝트를
   * 고른 채 기준점 탭에서 점을 골랐을 때, 탭이 프로젝트로 튀고 그 점이 회차의 대상이 아니면 방금 고른
   * 선택까지 함께 풀린다(아래 '대상 아닌 선택은 놓는다'가 그때 걸린다).
   */
  useEffect(() => {
    if (!narrow || selectedId === null) return
    setPanel((current) => (current === null || current.minimized ? current : { key: current.key, minimized: true }))
  }, [narrow, selectedId])

  // 활성 프로젝트의 조사기록만 조회하므로 맵에 있으면 조사됨이고, 값이 그 점의 조사 결과다
  const resultById = useMemo(() => new Map(records.map((r) => [r.pointId, r.result])), [records])
  /** 접힌 칩의 분포 막대 — 패널 내역과 같은 셈을 써야 접었다 폈을 때 값이 흔들리지 않는다 */
  const byStatus = useMemo(
    () => countSurveyStatus(resultById.values(), targetPoints.length),
    [resultById, targetPoints],
  )
  // 기타 비고는 상세 카드가 이어서 고칠 수 있어야 해서 결과와 함께 들고 있는다
  const noteById = useMemo(() => new Map(records.map((r) => [r.pointId, r.note])), [records])
  // 기준점 탭에서는 조사 표시를 걷는다 — 선택은 유지하되 상세 카드의 조사 상태는 선택 해제와 같은 모습이어야 한다
  const surveyVisible = activeProjectId !== null && viewing !== 'points'

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
  /**
   * 지도가 칠하고 거를 때 보는 표 — 상태 표시를 꺼 두면 null 이라 마커에 판정이 얹히지 않는다.
   *
   * <p>표가 도착하기 전에도 null 로 둔다. 빈 표를 내놓으면 모든 점이 미조사로 읽혀,
   * 정상·망실을 골라 둔 화면에서 점이 통째로 사라진다. 조회가 실패하면 그 화면이 그대로 남는다.
   */
  const statusById = useMemo<ReadonlyMap<string, SurveyResult> | null>(() => {
    if (!surveyStatusVisible) return null
    if (statusFromProject) return recordsQuery.data === undefined ? null : resultById
    return lastSurveysQuery.data ?? null
  }, [surveyStatusVisible, statusFromProject, recordsQuery.data, resultById, lastSurveysQuery.data])
  const statusFilterSet = useMemo(() => new Set(statusFilter), [statusFilter])

  /**
   * 목록이 뒤처졌다는 신호 — 방금 받아 온 그 점의 최종조사가 목록이 들고 있는 판정과 다르다.
   *
   * <p>점을 열면 최종조사는 언제나 다시 받으므로 이쪽이 참이다. 둘이 갈리면 목록 쪽이 낡은 것이라 다시 받는다.
   *
   * <p>회차를 보는 중에는 조건이 하나 더 붙는다. 목록이 그리는 값은 그 회차의 기록이고 최종조사는 회차와
   * 무관한 최신이라, 지난 회차에 망실로 남은 점이 이번 회차에서 조사불가인 것은 어긋남이 아니라 사실이다.
   * 그래서 최종조사일이 이 회차 기간 안일 때만 견준다.
   *
   * <p>같은 값을 두고는 한 번만 묻는다. 다시 받아도 그대로면 그것은 캐시가 아니라 서버의 상태이고,
   * 응답마다 다시 물으면 목록을 끝없이 다시 받는다.
   */
  const detailSurvey = useLastSurveyQuery(selectedId)
  const probedRef = useRef<string | null>(null)
  useEffect(() => {
    const detail = detailSurvey.data
    if (selectedId === null || detail === undefined) return
    const seen = surveyStatusFromLabel(detail.result)
    if (seen === null) return // 파일이 적어 온 표기 — 갈래로 읽을 수 없으면 견줄 수도 없다
    // 견줄 상대는 목록이 지금 그리는 값이다. 무엇을 그리는지는 statusById 가 고르는 규칙(statusFromProject)을 따른다
    if (statusFromProject && !withinProject(activeProject, detail.surveyedOn)) return
    const listed = statusFromProject
      ? recordsQuery.data === undefined ? null : deriveSurveyStatus(resultById.get(selectedId))
      : lastSurveysQuery.data === undefined ? null : deriveSurveyStatus(lastSurveysQuery.data.get(selectedId))
    if (listed === null || listed === seen) return
    const stamp = `${statusFromProject ? activeProjectId : '최신'}:${selectedId}:${seen}`
    if (probedRef.current === stamp) return
    probedRef.current = stamp
    if (statusFromProject) {
      void queryClient.invalidateQueries({ queryKey: surveyRecordsKey(activeProjectId as string) })
      void queryClient.invalidateQueries({ queryKey: SURVEY_PROJECTS_KEY })
    } else {
      void queryClient.invalidateQueries({ queryKey: LAST_SURVEYS_KEY })
    }
  }, [selectedId, activeProjectId, activeProject, statusFromProject, detailSurvey.data, recordsQuery.data, resultById, lastSurveysQuery.data, queryClient])

  /**
   * 지도에 보일 점 — 기본은 아무것도 보이지 않는다.
   * 기준점 탭을 열면 전체(null = 전부), 조사를 고르면 그 조사의 대상만.
   * 점 소스는 전체를 한 번만 들고 있으므로, 탭·조사 전환은 소스 재구성이 아니라 이 집합의 교체다.
   * 고른 점은 어느 경우에도 함께 보인다 — 헤더 검색·챗봇 안내는 패널을 열지 않고 점을 지목하므로,
   * 빼면 지목한 자리에 아무것도 나타나지 않는다.
   *
   * <p>상태를 고르면 그 판정의 점만 남긴다. 좁아지는 것은 지도뿐이고 패널 목록은 건드리지 않는다 —
   * 목록은 무엇이 있는지 세는 자리라, 필터를 따라가면 전체를 훑을 방법이 사라진다.
   */
  const visibleIds = useMemo<ReadonlySet<string> | null>(() => {
    // 보는 갈래가 정하는 범위 — 기준점은 전체(null), 프로젝트는 그 대상, 그 밖에는 아무것도 아니다
    const scoped: ReadonlySet<string> | null =
      viewing === 'points' ? null : activeProjectId !== null && targetIds !== null ? targetIds : EMPTY_ID_SET
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
  }, [viewing, activeProjectId, targetIds, selectedId, points, statusById, statusFilterSet])

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
      // 창을 열 때 본 버전를 되보낸다 — 그사이 누가 먼저 고쳤으면 서버가 거절한다
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
        showToast(e instanceof ApiError ? e.message : '기준점을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error')
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
  /** 대상 기준점 내보내기 — 만든 파일은 브라우저가 바로 저장한다. 남는 것이 없어 캐시를 건드리지 않는다 */
  async function exportProject(project: SurveyProject) {
    setExporting(true)
    try {
      await exportSurveyProjectApi(project)
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '파일을 내보내지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error')
    } finally {
      setExporting(false)
    }
  }

  function confirmDeleteProject() {
    if (deletingProject === null) return
    const target = deletingProject
    deleteProjectMutation.mutate(target.id, {
      onSuccess: () => {
        setDeletingProject(null)
        // 지운 조사를 보고 있었으면 선택을 놓는다 — 지도·패널이 없는 조사를 가리키지 않게. 그 조사의 수정 창도 함께 접는다
        if (activeProjectId === target.id) dispatch(setActiveProject(null))
        if (editingProject !== null && editingProject.id === target.id) setEditingProject(null)
        showToast('프로젝트를 삭제했습니다.', 'success')
      },
      onError: (e) =>
        showToast(e instanceof ApiError ? e.message : '프로젝트를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error'),
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

  function focusPoint(cp: MappableControlPoint, from: 'list' | 'map' = 'map') {
    // 목록이 실제로 서 있을 때 그 목록에서 고른 것만 되돌아갈 자리로 친다
    restorePanel.current = from === 'list' && narrow && panel !== null && !panel.minimized ? panel.key : null
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

  /**
   * 좁은 화면의 두 시트 — 목록(프로젝트·기준점)과 점 상세.
   *
   * <p>둘 다 안에 든 것이 다 보이는 높이까지 저절로 올라가고, 위로 끌면 화면을 다 덮는다. 내려서 닫거나
   * 시트 바깥을 누르면 지도만 남는다. 서 있는 동안에는 아래 내비를 시트가 덮는다 — 시트를 내리는 것이
   * 곧 내비로 돌아오는 길이라, 시트 위에 내비를 또 띄우면 같은 자리에 두 겹이 선다.
   *
   * <p>넓은 화면은 이 값을 읽지 않는다. 목록은 왼쪽에, 상세는 오른쪽에 카드로 선다.
   */
  const panelSheet = useBottomSheet({
    open: narrow && openPanel !== null,
    // 다 내려간 뒤에 끈다. 닫기(X)로 내린 것이면 고른 조사도 함께 놓는다 —
    // 내려가는 동안 미리 놓으면 상세 겹이 목록으로 되돌아가는 모습이 시트가 내려가는 위로 겹친다
    onClosed: () => {
      if (releaseOnSheetClose.current) {
        releaseOnSheetClose.current = false
        setPanel(null)
        dispatch(setActiveProject(null))
        return
      }
      // 내려간 것은 줄여 둔 것으로 친다 — 끌어내리기도 바깥 누르기도 '지도를 잠깐 보겠다'는 뜻이지
      // 이 갈래를 그만 보겠다는 뜻이 아니다. 탭의 켜짐과 요약 칩은 그대로 남는다.
      // 갈래를 끄는 길은 둘뿐이다. 켜진 탭을 다시 누르거나(그때는 이미 null 이라 여기서 할 일이 없다)
      // 머리말의 닫기(X)를 누르는 것(위에서 놓았다)
      setPanel((current) => (current === null ? null : { key: current.key, minimized: true }))
    },
    viewportHeight,
    contentKey: openPanel,
    ratio: LIST_SHEET_RATIO,
  })
  const detailSheet = useBottomSheet({
    open: narrow && selected !== null,
    onClosed: () => {
      setSelectedId(null)
      const key = restorePanel.current
      restorePanel.current = null
      if (key !== null) setPanel({ key, minimized: false })
    },
    viewportHeight,
    contentKey: selectedId,
    // 시안의 접힘 높이 — 조사 회차 밖의 점처럼 담을 것이 적어도 이보다 낮게 서지 않는다
    minHeight: 352,
  })
  // 조사 기록은 그 조사의 대상 점에만 남길 수 있다. 대상이 아니면 조사 상태와 기록 버튼을 내주지 않는다.
  const selectedIsTarget = selected !== null && targetIds !== null && targetIds.has(selected.id)

  return (
    <div className="contents">
    {/* 화면 어디에 파일을 떨어뜨려도 그 파일이 붙은 채로 조사 추가가 열린다 */}
    {/* min-w-app-min: 넓은 화면의 배치는 이보다 좁아지면 패널끼리 겹치므로 더 줄이지 않고 잘라 낸다(가로로 밀어서 본다).
        좁은 화면은 배치가 아예 달라 그 최소 폭을 풀어야 한다 — 남겨 두면 390px 화면에 1240px 짜리 화면이 담겨
        모든 자리가 화면 밖으로 밀린다 */}
    <div className="app-bg relative flex h-full min-w-app-min flex-col text-ink max-lg:min-w-0" {...fileDrop.dropHandlers}>
      {fileDrop.dragging && <FileDropOverlay label="프로젝트 파일 등록" hint="CSV · XLSX" />}

      <ChatDockLayout width={utilityWidth} onDockWidthChange={setChatWidth} onAction={handleChatAction}>
      <div className="relative min-h-0 min-w-0 flex-1">
        <AppHeader
          tabs={[
            // 접어 둔(칩) 상태도 그 패널을 보는 중이다 — 탭 표시는 펼침 여부가 아니라 어느 패널이 서 있는지를 따른다
            { key: 'project', label: '프로젝트', icon: <ProjectIcon />, active: panel?.key === 'project', onClick: () => togglePanel('project') },
            { key: 'points', label: '기준점', icon: <PointIcon />, active: panel?.key === 'points', onClick: () => togglePanel('points') },
          ]}
          onBrandWidthChange={setHeaderWidth}
          onUtilityWidthChange={setUtilityWidth}
          search={<PointSearchBar points={points} onSelect={focusPoint} />}
          user={profile}
          onOpenUserManagement={onOpenUserManagement}
          onProfileUpdated={onProfileUpdated}
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
            setDeletingProject(p)
          }}
          onExportProject={(p) => void exportProject(p)}
          exporting={exporting}
          points={points}
          targetPoints={targetPoints}
          resultById={resultById}
          onFocusPoint={(cp) => focusPoint(cp, 'list')}
          // 목록의 강조는 상세 카드·지도 마커와 같은 값을 따른다 — 목록이 제 강조를 따로 들면
          // 상세를 닫아도 줄이 강조된 채 남고, 줄을 눌러 놓아도 상세가 그대로 선다
          selectedPointId={selectedId}
          onDeselectPoint={() => setSelectedId(null)}
          onStartAddPoint={startAddPoint}
          onImportPoints={() => {
            // 위치 찍기 중에도 이 버튼이 살아 있다 — 찍기 안내·좌표 수신이 파일 창과 겹치지 않게 흐름을 접는다
            closePointFlow()
            setPointModal('file')
          }}
          onRefresh={(scope) => void refresh(scope)}
          refreshing={refreshing}
          projectsLoading={projectsQuery.isPending}
          pointsLoading={pointsQuery.isPending}
          recordsLoading={activeProjectId !== null && recordsQuery.isPending}
          targetsLoading={activeProjectId !== null && targetsQuery.isPending}
          isAdmin={isAdmin}
          onOpenUserManagement={onOpenUserManagement}
          open={openPanel}
          minimized={panel?.minimized === true}
          onMinimize={() => panel && setPanel({ key: panel.key, minimized: true })}
          // 좁은 화면에서도 닫기는 넓은 화면과 같은 뜻이다 — 고른 조사까지 놓아, 헤더 밑 요약 칩도 함께 걷힌다.
          // 다만 그 자리에서 사라지지 않고 시트가 다 내려간 뒤에 놓는다
          onClose={() => {
            if (!narrow) {
              closePanel()
              return
            }
            releaseOnSheetClose.current = true
            panelSheet.requestClose()
          }}
          width={headerWidth}
          sheet={narrow ? panelSheet.sheet : undefined}
        />

        {/* 알림 띠 — 지도를 밀지 않고 헤더 아래에 겹쳐 둔다 */}
        <div className="pointer-events-none absolute inset-x-0 top-[76px] z-10 flex flex-col items-center gap-1.5 px-4 max-lg:top-[110px] max-lg:px-3">
          {!VWORLD_KEY && (
            <MapBanner tone="warn">
              VWorld 배경지도 설정이 없어 OSM 배경지도로 표시합니다. 지적도와 법정동 경계는 표시되지 않습니다.
            </MapBanner>
          )}
          {pointsQuery.isPending && (
            <MapBanner tone="muted">
              <span className="flex items-center gap-1.5">
                <Spinner className="size-3" current />
                기준점을 불러오는 중
              </span>
            </MapBanner>
          )}
          {pointsQuery.isError && <MapBanner tone="danger">기준점을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</MapBanner>}
          {/* 대상을 못 읽으면 전체를 대신 그리지 않는다 — 대상이 아닌 점에 조사·망실을 기록할 수 있게 되기 때문 */}
          {targetsQuery.isError && (
            <MapBanner tone="danger">대상 기준점을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</MapBanner>
          )}
          {/* 상태 표를 못 읽으면 지도가 판정 없이 그려진다 — 켜 두었는데 색이 없는 화면을 설명 없이 두지 않는다 */}
          {lastSurveysQuery.isError && (
            <MapBanner tone="danger">기준점 상태를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</MapBanner>
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
              onSelect={(id) => {
                restorePanel.current = null
                setSelectedId(id)
              }}
              onMapReady={setMapInstance}
              onLocationError={(message) => showToast(message, 'error')}
              compassHeading={compassHeading}
              followLocation={narrow && following}
              // 따라가는 동안에는 바라보는 쪽이 화면 위로 온다 — 손에 들고 걷는 화면에서는 눈앞의 길과
              // 화면의 길이 같은 방향으로 놓여야 어디로 가는지가 그대로 읽힌다
              headingUp={narrow && following}
              onFollowEnd={() => setFollowing(false)}
            />

            {/* 커맨드 바 — 표시 설정과 읽을거리를 지도 아래 한 줄에 모은다.
                패널은 이 줄 위에서 끝나므로 패널이 열려도 자리를 옮기지 않는다.
                포인터 좌표·축척은 지도 인스턴스를 직접 구독해 페이지는 리렌더되지 않는다.
                바에서 위로 열리는 말풍선은 창이 좁으면 왼쪽 패널과 가로로 겹친다. 패널(z-20)보다 위에 두어
                가려지지 않게 한다. 바 자신은 패널이 비워 둔 아래 여백(--spacing-bar-clear) 안에 서므로 패널을 덮지 않는다. */}
            <div className="pointer-events-none absolute inset-x-4 bottom-[18px] z-[21] flex justify-center max-lg:hidden">
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
                          { key: 'cadastral', label: '지적도', note: `~1:${CADASTRAL_MIN_SCALE.toLocaleString('ko-KR')}`, on: showCadastral, onToggle: () => setShowCadastral((v) => !v), swatch: CADASTRAL_SWATCH },
                          { key: 'district', label: '법정동 경계', on: showDistrict, onToggle: () => setShowDistrict((v) => !v), swatch: DISTRICT_SWATCH },
                        ]}
                      />
                    }
                    theme={theme}
                    onToggleTheme={() => withoutTransition(() => dispatch(toggleTheme()))}
                    surveyStatus={
                      <SurveyStatusFilter
                        visible={surveyStatusVisible}
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

            {/* 요약 칩 — 좁은 화면에서는 헤더에 이름을 세울 자리가 없어 지도 위에 띄워 둔다.
                넓은 화면에서 접힌 패널을 대신하는 칩과 같은 자리다. 시트를 내리거나 줄여도 남아, 지금 무엇을
                깔고 보는지 알린다. 누르면 그 시트가 다시 올라온다.
                자리는 상단 헤더(10px + 46px) 아래 8px 이다.

                기준점 탭을 보는 동안에는 기준점 칩이 그 자리를 쓴다 — 그 탭에서는 조사 판정을 지도에서
                걷으므로(surveyVisible), 진행률을 그대로 두면 지도에 없는 값을 칩만 계속 말하게 된다 */}
            {viewing !== null && (
              <div className="absolute inset-x-[12px] top-[64px] z-[30] lg:hidden">
                {viewing === 'points' ? (
                  <MobileSummaryChip
                    label="기준점"
                    value="지도에 표시 중"
                    trailing={{ count: points.length }}
                    onOpen={() => setPanel({ key: 'points', minimized: false })}
                  />
                ) : (
                  <MobileSummaryChip
                    label="프로젝트"
                    value={activeProject?.name ?? '선택 중인 프로젝트 없음'}
                    trailing={activeProject === null ? undefined : { surveyed: resultById.size, total: targetPoints.length }}
                    onOpen={() => setPanel({ key: 'project', minimized: false })}
                  />
                )}
              </div>
            )}

            {/* 요약 칩이 서면 그만큼(38 + 8) 내려앉아 그 아래에 선다 */}
            <ThemeToggleButton
              dark={theme === 'dark'}
              onToggle={() => withoutTransition(() => dispatch(toggleTheme()))}
              className={`absolute left-[12px] z-[30] transition-[top] duration-200 lg:hidden ${viewing === null ? 'top-[64px]' : 'top-[110px]'}`}
            />

            {/* 접어 둔 패널을 대신하는 칩 — 무엇을 보고 있는지 알리고, 누르면 패널이 다시 펼쳐진다.
                패널이 칩 자리로 말려 올라오는 동안 칩은 panel-in 으로 내려앉아 접히는 흐름이 이어진다 */}
            {panel?.minimized && (
              <div key={panel.key} className="panel-in absolute left-4 top-[76px] z-[15] max-lg:hidden" style={{ width: headerWidth || undefined }}>
                {panel.key === 'project' ? (
                  <MinimizedPanelChip
                    label="프로젝트"
                    value={activeProject?.name ?? '선택 중인 프로젝트 없음'}
                    trailing={activeProject ? { countByStatus: byStatus, surveyed: resultById.size, total: targetPoints.length } : undefined}
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
              <div className={`absolute left-1/2 top-[76px] z-[25] flex -translate-x-1/2 items-center gap-3 py-2 pl-4 pr-2 text-[13px] text-ink ${PILL}`}>
                지도를 클릭해 위치를 지정하세요
                {/* 찍기를 그만두는 취소 — 앱 전역 규격대로 빨강 */}
                <button type="button" onClick={() => setPicking(false)} className={`${CHIP_BTN_DANGER} px-2.5 py-1 text-[12px]`}>
                  취소
                </button>
              </div>
            )}

            {/* 상세 카드 — 넓은 화면은 지도 위 우측(대화 패널이 열리면 그 옆으로 비켜 선다),
                좁은 화면은 아래에서 올라오는 시트다(높이는 detailSheet 가 정한다).
                오른쪽 자리는 변수로 넘겨 넓은 화면에서만 읽는다 — 인라인 값으로 두면 좁은 화면의 자리까지 덮는다 */}
            <div
              // 좁은 화면의 시트는 상단 줄(z-45)보다 위에 선다 — 화면을 다 덮었을 때 시트의 윗머리가
              // 검색 칸에 가려지면 손잡이를 잡으려다 검색 칸을 누르게 된다. 창(z-50)보다는 아래다
              className={`absolute z-[15] lg:top-[76px] lg:right-[var(--detail-right)] max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-auto max-lg:z-[46] max-lg:overflow-hidden ${detailSheet.sheet.className}`}
              style={{
                '--detail-right': `${PANEL_MARGIN + (chatWidth === 0 ? 0 : chatWidth + PANEL_MARGIN)}px`,
                ...detailSheet.sheet.style,
              } as CSSProperties}
            >
            <ControlPointDetail
              point={selected}
              activeProjectName={surveyVisible && selectedIsTarget ? (activeProject?.name ?? null) : null}
              surveyorId={
                surveyVisible && selectedIsTarget && selected !== null
                  ? (records.find((r) => r.pointId === selected.id)?.surveyorId ?? null)
                  : null
              }
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
              // 좁은 화면에서는 닫기도 시트를 내리는 것으로 한다 — 그 자리에서 사라지면 어디로 갔는지 알 수 없다
              onClose={() => (narrow ? detailSheet.requestClose() : setSelectedId(null))}
              sheet={narrow ? detailSheet.sheet : undefined}
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

        {/* 좁은 화면의 자리 이동 — 넓은 화면의 헤더 탭·사용자 알약이 여기로 내려온다 */}
        <div className="lg:hidden">
        <MobileBottomNav
          tabs={[
            // 시트를 줄이거나 내려도 보는 중인 갈래는 그대로다 — 켜짐은 요약 칩과 같은 값을 따른다
            { key: 'project', label: '프로젝트', icon: <ProjectIcon />, active: viewing === 'project', onClick: () => toggleSheet('project') },
            { key: 'points', label: '기준점', icon: <PointIcon />, active: viewing === 'points', onClick: () => toggleSheet('points') },
          ]}
          // 지도에 무엇을 얹을지 고르는 두 자리다 — 커맨드 바를 세우지 못하는 좁은 화면에서 여기로 내려온다.
          // 축척·좌표는 읽을 자리가 없어 넓은 화면에만 두고, 따라가기는 한 번 켜 두는 값이라 독 밖에 따로 선다
          controls={(
            <>
              <MapLayerPicker
                variant="dock"
                layers={[
                  { key: 'cadastral', label: '지적도', note: `~1:${CADASTRAL_MIN_SCALE.toLocaleString('ko-KR')}`, on: showCadastral, onToggle: () => setShowCadastral((v) => !v), swatch: CADASTRAL_SWATCH },
                  { key: 'district', label: '법정동 경계', on: showDistrict, onToggle: () => setShowDistrict((v) => !v), swatch: DISTRICT_SWATCH },
                ]}
              />
              <SurveyStatusFilter
                variant="dock"
                visible={surveyStatusVisible}
                selected={statusFilterSet}
                onToggle={(status) => dispatch(toggleStatusFilter(status))}
                onClear={() => dispatch(clearStatusFilter())}
                onSelectAll={() => dispatch(selectAllStatus())}
              />
            </>
          )}
        />

        {/* 따라가기 — 켜 두는 동안 현재 위치가 화면 가운데에 붙는다. 넓은 화면의 같은 자리는 '위치 초기화'
            (처음 보던 자리로)다. 손에 들고 걷는 화면에서는 돌아갈 자리가 처음 자리가 아니라 지금 내가 선 자리다.

            독 안에 두지 않는다. 독의 나머지는 눌러서 무언가를 여는 자리인데 이것만 켜 두는 값이고, 걸으면서
            엄지로 자주 누르는 자리라 손이 가장 먼저 닿는 오른쪽 아래에 크게 세운다.
            켜짐은 면을 갈아 끼우지 않고 색조를 덧칠해 알린다 — 알약 바탕을 갈면 지도가 비쳐 보인다(챗 버블과 같은 규격) */}
        <button
          type="button"
          onClick={() => setFollowing((v) => !v)}
          title="현재 위치 따라가기"
          aria-label="현재 위치 따라가기"
          aria-pressed={following}
          // 독보다 한 겹 아래에 둔다 — 독에서 위로 펴는 말풍선이 이 자리를 지나가므로, 같은 겹에 두면
          // 말풍선의 아래 모서리를 이 원이 덮는다
          className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+80px)] right-[12px] z-[29] flex size-[46px] items-center justify-center rounded-full border bg-pill shadow-pill transition-colors before:absolute before:inset-0 before:rounded-full before:bg-teal-wash before:transition-opacity ${
            following ? 'border-teal-btn-edge text-teal-text before:opacity-100' : 'border-line-pill text-ink-2 before:opacity-0'
          }`}
        >
          {/* 20px 다 — 테두리를 뺀 안쪽 44px 에서 남는 여백이 24px 라 좌우·위아래로 딱 12px 씩 갈린다.
              홀수(19px)로 두면 12.5px 이 되어 반 픽셀에 놓이고, 켜짐 색조가 덧칠되며 다시 그려질 때
              그 반 픽셀이 위아래 어느 쪽으로 붙느냐에 따라 아이콘이 한 칸씩 튀어 보인다 */}
          <svg viewBox="0 0 24 24" className="relative size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="7.5" />
            <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
          </svg>
        </button>
        </div>

        {/* 나침반 — 지도가 북쪽에서 틀어진 동안에만 선다. 누르면 되돌아간다.
            좁은 화면에서는 따라가기 위에, 넓은 화면에서는 대화 버블 위에 같은 규격의 원으로 세운다 —
            둘 다 지도 오른쪽 아래의 둥근 자리라, 방향을 되돌리는 일도 그 줄에 얹힌다.
            좁은 화면의 독(lg:hidden) 바깥에 두어야 넓은 화면에서도 함께 선다 */}
        <MapCompass
          map={mapInstance}
          // 방향 맞추기가 켜져 있는 동안에는 되돌릴 수 없다 — 눌러도 곧바로 다시 돌아간다
          paused={narrow && following}
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+136px)] right-[12px] z-[29] lg:absolute lg:bottom-[90px] lg:right-[29px]"
        />
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
          confirmLabel="삭제"
          cancelLabel={pointDeleteBlocked ? '닫기' : undefined}
          danger
          busy={deletePointMutation.isPending}
          busyLabel="삭제 중"
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
          confirmLabel="삭제"
          danger
          busy={deleteProjectMutation.isPending}
          busyLabel="삭제 중"
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
