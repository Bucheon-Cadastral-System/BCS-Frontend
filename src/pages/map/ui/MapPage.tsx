import { useMemo, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { setActiveProject, toggleTheme } from '@/app/store'
import { MapToolbar } from '@/widgets/map-toolbar'
import { ControlPointMap } from '@/widgets/control-point-map'
import { ControlPointDetail } from '@/widgets/control-point-detail'
import { MapSidebar, ActiveProjectChip } from '@/widgets/map-sidebar'
import { PointSearchBar } from '@/widgets/point-search'
import { MapLayerControl } from '@/widgets/map-layer-control'
import { ClusterList } from '@/widgets/cluster-list'
import { ChatDockLayout } from '@/widgets/chatbot'
import type { ChatAction } from '@/widgets/chatbot'
import { POINT_TYPES, useControlPointsQuery, useRegisterControlPointMutation } from '@/entities/control-point'
import type { ControlPoint } from '@/entities/control-point'
import { useCreateSurveyProjectMutation, useSurveyProjectsQuery } from '@/entities/survey-project'
import type { SurveyProjectType } from '@/entities/survey-project'
import { useCancelSurveyMutation, useRecordSurveyMutation, useSurveyRecordsQuery } from '@/entities/survey-record'
import { useImportSurveyCsv } from '@/features/import-survey-csv'
import { AddControlPointModal } from '@/features/add-control-point'
import type { AddControlPointValues } from '@/features/add-control-point'
import { SurveyProjectFormModal } from '@/features/survey-project-form'
import { ApiError } from '@/shared/api/http'
import { Toast } from '@/shared/ui/Toast'
import type { ToastTone } from '@/shared/ui/Toast'
import { wgs84ToTm } from '@/shared/lib/crs'
import type { TmEpsg } from '@/shared/lib/crs'
import { VWORLD_KEY } from '@/shared/config/map'
import type { UserRole } from '@/entities/user'

interface MapPageProps {
  role: UserRole
  onOpenUserManagement: () => void
}

export function MapPage({ role, onOpenUserManagement }: MapPageProps) {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((state) => state.ui.theme)
  const activeProjectId = useAppSelector((state) => state.ui.activeProjectId)

  const pointsQuery = useControlPointsQuery()
  const projectsQuery = useSurveyProjectsQuery()
  const recordsQuery = useSurveyRecordsQuery(activeProjectId)
  const registerMutation = useRegisterControlPointMutation()
  const createProjectMutation = useCreateSurveyProjectMutation()
  const recordMutation = useRecordSurveyMutation()
  const cancelMutation = useCancelSurveyMutation()
  const importMutation = useImportSurveyCsv()

  // 쿼리 미도착(undefined) 기본값 — 참조가 렌더마다 바뀌면 지도 소스 재구성·리스트 메모가 깨져 useMemo로 고정
  const points = useMemo(() => pointsQuery.data ?? [], [pointsQuery.data])
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])
  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data])

  const tmEpsg: TmEpsg = 'EPSG:5186' // 부천 = 중부원점 고정
  const [showCadastral, setShowCadastral] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [clusterPopup, setClusterPopup] = useState<{ points: ControlPoint[]; coord: number[]; x: number; y: number; w: number; h: number; id: number } | null>(null)
  const [focusNonce, setFocusNonce] = useState(0)
  const [mapLeftInset, setMapLeftInset] = useState(0) // 좌측 패널이 지도를 가리는 폭(포커스 센터링 보정). >0 = 패널 열림
  const [openProjectNonce, setOpenProjectNonce] = useState(0) // 활성 프로젝트 칩 → 프로젝트 패널 열기 신호
  // 기준점 추가 — 모달이 주 경로이고, '지도에서 위치 찍기'는 그 안의 한 단계(찍는 동안만 모달을 숨긴다)
  const [addOpen, setAddOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<{ northing: number; easting: number; epsg: TmEpsg } | null>(null)
  // 입력 모달 — 업로드한 파일(CSV 임포트) / 새 조사 만들기
  const [importFile, setImportFile] = useState<File | null>(null)
  const [creatingProject, setCreatingProject] = useState(false)
  // 결과 알림 — id를 key로 써서 같은 문구가 다시 떠도 애니·타이머가 재시작된다
  const [toast, setToast] = useState<{ id: number; message: string; tone: ToastTone } | null>(null)
  const toastIdRef = useRef(0)

  function showToast(message: string, tone: ToastTone = 'info') {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, message, tone })
  }
  const clusterIdRef = useRef(0)

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

  function submitAddPoint(values: AddControlPointValues) {
    registerMutation.mutate(
      {
        pointNo: values.pointNo,
        type: values.type,
        name: values.name,
        lng: values.lng,
        lat: values.lat,
        tmX: values.easting,
        tmY: values.northing,
        tmEpsg: values.tmEpsg,
      },
      {
        onSuccess: (saved) => {
          closeAddPoint()
          setSelectedId(saved.id)
        },
        onError: (e) =>
          showToast(
            e instanceof ApiError && e.code === 'CONTROL_POINT_DUPLICATE'
              ? '이미 등록된 관리번호입니다.'
              : '기준점 등록에 실패했습니다.',
            'error',
          ),
      },
    )
  }

  function importCsv(file: File) {
    setImportFile(file)
  }

  function submitImport(file: File, name: string, type: SurveyProjectType) {
    importMutation.mutate(
      { file, name, type },
      {
        onSuccess: (summary) => {
          setImportFile(null)
          dispatch(setActiveProject(String(summary.projectId)))
          showToast(
            `기준점 ${summary.totalRows}점(신규 ${summary.newPoints} · 기존 ${summary.existingPoints} · 갱신 ${summary.updatedPoints}), 조사기록 ${summary.createdRecords}건을 불러왔습니다.`,
            'success',
          )
        },
        onError: (e) =>
          showToast(e instanceof ApiError ? `불러오기 실패: ${e.message}` : 'CSV 불러오기에 실패했습니다.', 'error'),
      },
    )
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

  function submitCreateProject(name: string, type: SurveyProjectType) {
    createProjectMutation.mutate(
      { name, type },
      {
        onSuccess: (project) => {
          setCreatingProject(false)
          dispatch(setActiveProject(project.id))
        },
        onError: () => showToast('조사 프로젝트 생성에 실패했습니다.', 'error'),
      },
    )
  }

  function focusPoint(cp: ControlPoint) {
    setSelectedId(cp.id)
    setClusterPopup(null)
    setFocusNonce((n) => n + 1)
  }

  // 챗봇 액션 → 지도 상호작용(기준점 포커스 / 조사 프로젝트 선택)
  function handleChatAction(action: ChatAction) {
    if (action.type === 'focusPoint') {
      const cp = points.find((p) => p.pointNo === action.pointNo)
      if (cp) focusPoint(cp)
    } else {
      dispatch(setActiveProject(String(action.projectId)))
      setOpenProjectNonce((n) => n + 1)
    }
  }

  const selected = points.find((p) => p.id === selectedId) ?? null
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null

  return (
    <div className={`contents ${theme === 'dark' ? 'dark' : ''}`}>
    <div className="flex h-full flex-col">
      <MapToolbar>
        <PointSearchBar points={points} onSelect={focusPoint} />
      </MapToolbar>

      <ChatDockLayout onAction={handleChatAction}>
      <div className="flex min-h-0 flex-1">
        <MapSidebar
          projects={projects}
          activeProjectId={activeProjectId}
          onChangeActive={(id) => dispatch(setActiveProject(id))}
          onCreate={() => setCreatingProject(true)}
          points={points}
          surveyedIds={surveyedIds}
          lostIds={lostIds}
          onFocusPoint={focusPoint}
          onToggleSurvey={handleToggleSurvey}
          onToggleLost={handleToggleLost}
          onImportCsv={importCsv}
          onStartAddPoint={startAddPoint}
          projectsLoading={projectsQuery.isPending}
          pointsLoading={pointsQuery.isPending}
          recordsLoading={activeProjectId !== null && recordsQuery.isPending}
          isAdmin={role === 'ADMIN'}
          onOpenUserManagement={onOpenUserManagement}
          onInsetChange={setMapLeftInset}
          openProjectSignal={openProjectNonce}
        />

        <div className="flex min-h-0 flex-1 flex-col">
          {!VWORLD_KEY && (
            <div className="bg-amber-100 px-3.5 py-1.5 text-[13px] text-amber-800 [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-px">
              VWorld API 키가 없어 배경지도를 OSM으로 대체합니다. <code>.env</code>에 <code>VITE_VWORLD_KEY</code>를 넣으면 VWorld 배경지도·지적도가 표시됩니다.
            </div>
          )}

          {pointsQuery.isPending && (
            <div className="bg-gray-100 px-3.5 py-1.5 text-[13px] text-gray-600">기준점을 불러오는 중…</div>
          )}
          {pointsQuery.isError && (
            <div className="bg-red-100 px-3.5 py-1.5 text-[13px] text-red-800">
              기준점을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </div>
          )}

          <div className="relative min-h-0 flex-1">
            <ControlPointMap
              points={points}
              addMode={picking}
              showCadastral={showCadastral}
              selectedId={selectedId}
              surveyMode={activeProjectId !== null}
              surveyedIds={surveyedIds}
              lostIds={lostIds}
              theme={theme}
              focusNonce={focusNonce}
              leftInset={mapLeftInset}
              clusterAnchor={clusterPopup?.coord ?? null}
              onAddPoint={addPoint}
              onSelect={(id) => { setSelectedId(id); setClusterPopup(null) }}
              onClusterClick={(members, coord, x, y, w, h) => { setSelectedId(null); setClusterPopup({ points: members, coord, x, y, w, h, id: ++clusterIdRef.current }) }}
              onClusterAnchorMove={(x, y) => setClusterPopup((cur) => (cur ? { ...cur, x, y } : cur))}
              onClusterAnchorOut={() => setClusterPopup(null)}
            />
            {/* 지도 표시 설정 — 줌·축척과 같은 좌하단 묶음 */}
            <MapLayerControl
              showCadastral={showCadastral}
              onToggleCadastral={() => setShowCadastral((v) => !v)}
              theme={theme}
              onToggleTheme={() => dispatch(toggleTheme())}
            />

            {/* 좌상단 상태 칩 — 조사 중인 프로젝트와 추가할 종류를 세로로 쌓는다 */}
            <div className="absolute left-3 top-3 z-[5] flex flex-col items-start gap-2">
              {activeProject && mapLeftInset === 0 && (
                <ActiveProjectChip
                  name={activeProject.name}
                  surveyed={surveyedIds.size}
                  total={points.length}
                  onOpen={() => setOpenProjectNonce((n) => n + 1)}
                />
              )}
            </div>

            {/* 위치 찍기 중 — 모달은 숨어 있으므로 지도 위에서 무엇을 해야 하는지 알려 준다 */}
            {picking && (
              <div className="absolute left-1/2 top-3 z-[5] flex -translate-x-1/2 items-center gap-3 rounded-full bg-gray-900/85 py-2 pl-4 pr-2 text-[13px] text-white shadow-lg backdrop-blur">
                지도를 클릭해 위치를 지정하세요
                <button
                  type="button"
                  onClick={() => setPicking(false)}
                  className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] hover:bg-white/20"
                >
                  취소
                </button>
              </div>
            )}

            <ClusterList
              popup={clusterPopup}
              surveyedIds={surveyedIds}
              lostIds={lostIds}
              surveyMode={activeProjectId !== null}
              onFocus={focusPoint}
              onClose={() => setClusterPopup(null)}
            />
            <ControlPointDetail
              point={selected}
              activeProjectName={activeProject?.name ?? null}
              surveyed={selected !== null && surveyedIds.has(selected.id)}
              lost={selected !== null && lostIds.has(selected.id)}
              onToggleSurvey={handleToggleSurvey}
              onClose={() => setSelectedId(null)}
              onToggleLost={handleToggleLost}
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
          picking={picking}
          onPick={() => setPicking(true)}
          submitting={registerMutation.isPending}
          onSubmit={submitAddPoint}
          onCancel={closeAddPoint}
        />
      )}

      {importFile && (
        <SurveyProjectFormModal
          title="대상지 CSV 불러오기"
          description={`${importFile.name} 파일로 조사 프로젝트를 만듭니다.`}
          submitLabel="불러오기"
          defaultName={importFile.name.replace(/\.csv$/i, '')}
          submitting={importMutation.isPending}
          onSubmit={({ name, type }) => submitImport(importFile, name, type)}
          onCancel={() => setImportFile(null)}
        />
      )}

      {creatingProject && (
        <SurveyProjectFormModal
          title="새 조사 만들기"
          submitLabel="만들기"
          submitting={createProjectMutation.isPending}
          onSubmit={({ name, type }) => submitCreateProject(name, type)}
          onCancel={() => setCreatingProject(false)}
        />
      )}

      {toast && (
        <Toast key={toast.id} message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      )}
    </div>
    </div>
  )
}
