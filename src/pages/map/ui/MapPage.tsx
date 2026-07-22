import { useMemo, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { setActiveProject, toggleTheme } from '@/app/store'
import { MapToolbar } from '@/widgets/map-toolbar'
import { ControlPointMap } from '@/widgets/control-point-map'
import { ControlPointDetail } from '@/widgets/control-point-detail'
import { MapSidebar, ActiveProjectChip } from '@/widgets/map-sidebar'
import { ClusterList } from '@/widgets/cluster-list'
import { POINT_TYPES, useControlPointsQuery, useRegisterControlPointMutation } from '@/entities/control-point'
import type { ControlPoint, PointType } from '@/entities/control-point'
import { useCreateSurveyProjectMutation, useSurveyProjectsQuery } from '@/entities/survey-project'
import { useCancelSurveyMutation, useRecordSurveyMutation, useSurveyRecordsQuery } from '@/entities/survey-record'
import { useImportExcavation } from '@/features/import-excavation'
import { ApiError } from '@/shared/api/http'
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
  const importMutation = useImportExcavation()

  // 쿼리 미도착(undefined) 기본값 — 참조가 렌더마다 바뀌면 지도 소스 재구성·리스트 메모가 깨져 useMemo로 고정
  const points = useMemo(() => pointsQuery.data ?? [], [pointsQuery.data])
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])
  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data])

  const [addMode, setAddMode] = useState(false)
  const [addType, setAddType] = useState<PointType>(POINT_TYPES[0])
  const tmEpsg: TmEpsg = 'EPSG:5186' // 부천 = 중부원점 고정
  const [showCadastral, setShowCadastral] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [clusterPopup, setClusterPopup] = useState<{ points: ControlPoint[]; coord: number[]; x: number; y: number; w: number; h: number; id: number } | null>(null)
  const [focusNonce, setFocusNonce] = useState(0)
  const [mapLeftInset, setMapLeftInset] = useState(0) // 좌측 패널이 지도를 가리는 폭(포커스 센터링 보정). >0 = 패널 열림
  const [openProjectNonce, setOpenProjectNonce] = useState(0) // 활성 프로젝트 칩 → 프로젝트 패널 열기 신호
  const clusterIdRef = useRef(0)

  // 활성 프로젝트의 조사기록만 조회하므로 레코드 존재=조사됨, lost=망실
  const surveyedIds = useMemo(() => new Set(records.map((r) => r.pointId)), [records])
  const lostIds = useMemo(() => new Set(records.filter((r) => r.lost).map((r) => r.pointId)), [records])

  function addPoint(lng: number, lat: number) {
    const pointNoInput = window.prompt('관리번호를 입력하세요 (예: 41192D000001265)')
    if (pointNoInput === null) return
    const pointNo = pointNoInput.trim()
    if (!pointNo) return

    const fallback = `${addType}-${points.length + 1}`
    const nameInput = window.prompt('기준점 이름을 입력하세요', fallback)
    if (nameInput === null) return
    const name = nameInput.trim() || fallback

    const { x, y } = wgs84ToTm(lng, lat, tmEpsg)
    registerMutation.mutate(
      { pointNo, type: addType, name, lng, lat, tmX: x, tmY: y, tmEpsg },
      {
        onSuccess: (saved) => setSelectedId(saved.id),
        onError: (e) =>
          window.alert(
            e instanceof ApiError && e.code === 'CONTROL_POINT_DUPLICATE'
              ? '이미 등록된 관리번호입니다.'
              : '기준점 등록에 실패했습니다.',
          ),
      },
    )
  }

  function importCsv(file: File) {
    const nameInput = window.prompt('조사 프로젝트 이름 (굴착협의 건명)', file.name.replace(/\.csv$/i, ''))
    if (nameInput === null) return
    const name = nameInput.trim()
    if (!name) return

    importMutation.mutate(
      { file, name },
      {
        onSuccess: (summary) => {
          dispatch(setActiveProject(String(summary.projectId)))
          window.alert(
            `기준점 ${summary.totalRows}점(신규 ${summary.newPoints} · 기존 ${summary.existingPoints}), 조사기록 ${summary.createdRecords}건을 불러왔습니다.`,
          )
        },
        onError: (e) =>
          window.alert(e instanceof ApiError ? `불러오기 실패: ${e.message}` : 'CSV 불러오기에 실패했습니다.'),
      },
    )
  }

  function notifySurveySaveFailed() {
    window.alert('조사 상태를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
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

  function createProject(name: string) {
    createProjectMutation.mutate(name, {
      onSuccess: (project) => dispatch(setActiveProject(project.id)),
      onError: () => window.alert('조사 프로젝트 생성에 실패했습니다.'),
    })
  }

  function focusPoint(cp: ControlPoint) {
    setSelectedId(cp.id)
    setClusterPopup(null)
    setFocusNonce((n) => n + 1)
  }

  const selected = points.find((p) => p.id === selectedId) ?? null
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null

  return (
    <div className={`contents ${theme === 'dark' ? 'dark' : ''}`}>
    <div className="flex h-full flex-col">
      <MapToolbar
        addMode={addMode}
        onToggleAdd={() => setAddMode((v) => !v)}
        addType={addType}
        onChangeType={setAddType}
        showCadastral={showCadastral}
        onToggleCadastral={() => setShowCadastral((v) => !v)}
        count={points.length}
        onImportCsv={importCsv}
        theme={theme}
        onToggleTheme={() => dispatch(toggleTheme())}
      />

      <div className="flex min-h-0 flex-1">
        <MapSidebar
          projects={projects}
          activeProjectId={activeProjectId}
          onChangeActive={(id) => dispatch(setActiveProject(id))}
          onCreate={createProject}
          points={points}
          surveyedIds={surveyedIds}
          lostIds={lostIds}
          onFocusPoint={focusPoint}
          onToggleSurvey={handleToggleSurvey}
          onToggleLost={handleToggleLost}
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

          {addMode && (
            <div className="bg-blue-100 px-3.5 py-1.5 text-[13px] text-blue-800">
              지도를 클릭해 <b>{addType}</b> 추가
            </div>
          )}

          <div className="relative min-h-0 flex-1">
            <ControlPointMap
              points={points}
              addMode={addMode}
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
            {activeProject && mapLeftInset === 0 && (
              <ActiveProjectChip
                name={activeProject.name}
                surveyed={surveyedIds.size}
                total={points.length}
                onOpen={() => setOpenProjectNonce((n) => n + 1)}
              />
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
    </div>
    </div>
  )
}
