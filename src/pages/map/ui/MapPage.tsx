import { useEffect, useMemo, useRef, useState } from 'react'
import { MapToolbar } from '@/widgets/map-toolbar'
import { ControlPointMap } from '@/widgets/control-point-map'
import { ControlPointDetail } from '@/widgets/control-point-detail'
import { MapSidebar, ActiveProjectChip } from '@/widgets/map-sidebar'
import { ClusterList } from '@/widgets/cluster-list'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Toast } from '@/shared/ui/Toast'
import { loadPoints, savePoints, createControlPoint, POINT_TYPES, SEED_DOGEUN_BUCHEON } from '@/entities/control-point'
import type { ControlPoint, PointType, MapTheme } from '@/entities/control-point'
import type { TmEpsg } from '@/shared/lib/crs'
import { controlPointsFromCsv } from '@/features/import-control-points'
import { VWORLD_KEY } from '@/shared/config/map'
import { loadProjects, saveProjects, createSurveyProject } from '@/entities/survey-project'
import type { SurveyProject } from '@/entities/survey-project'
import {
  loadRecords,
  saveRecords,
  toggleSurvey,
  toggleLost,
  isSurveyed,
  isLost,
  surveyedPointIds,
  lostPointIds,
  removeProjectRecords,
  removePointRecords,
} from '@/entities/survey-record'
import type { SurveyRecord } from '@/entities/survey-record'
import type { UserRole } from '@/entities/user'

interface MapPageProps {
  role: UserRole
  onOpenUserManagement: () => void
}

export function MapPage({ role, onOpenUserManagement }: MapPageProps) {
  const [points, setPoints] = useState<ControlPoint[]>(() => loadPoints())
  const [projects, setProjects] = useState<SurveyProject[]>(() => loadProjects())
  const [records, setRecords] = useState<SurveyRecord[]>(() => loadRecords())
  const [addMode, setAddMode] = useState(false)
  const [addType, setAddType] = useState<PointType>(POINT_TYPES[0])
  const tmEpsg: TmEpsg = 'EPSG:5186' // 부천 = 중부원점 고정
  const [showCadastral, setShowCadastral] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  // 저장값 검증: light/dark 이외 문자열이면 PALETTE[theme]가 undefined가 되므로 명시 비교로 폴백.
  const [theme, setTheme] = useState<MapTheme>(() => (localStorage.getItem('bcs.theme') === 'dark' ? 'dark' : 'light'))
  const [clusterPopup, setClusterPopup] = useState<{ points: ControlPoint[]; coord: number[]; x: number; y: number; w: number; h: number; id: number } | null>(null)
  const [focusNonce, setFocusNonce] = useState(0)
  const [mapLeftInset, setMapLeftInset] = useState(0) // 좌측 패널이 지도를 가리는 폭(포커스 센터링 보정). >0 = 패널 열림
  const [openProjectNonce, setOpenProjectNonce] = useState(0) // 활성 프로젝트 칩 → 프로젝트 패널 열기 신호
  const [confirm, setConfirm] = useState<{ message: string; detail?: string; onConfirm: () => void } | null>(null)
  const [toast, setToast] = useState<{ message: string; onUndo: () => void; id: number } | null>(null)
  const toastIdRef = useRef(0)
  const clusterIdRef = useRef(0)

  // localStorage 영속
  useEffect(() => { savePoints(points) }, [points])
  useEffect(() => { saveProjects(projects) }, [projects])
  useEffect(() => { saveRecords(records) }, [records])
  useEffect(() => { localStorage.setItem('bcs.theme', theme) }, [theme])

  const surveyedIds = useMemo(
    () => (activeProjectId ? new Set(surveyedPointIds(records, activeProjectId)) : new Set<string>()),
    [records, activeProjectId],
  )
  const lostIds = useMemo(
    () => (activeProjectId ? new Set(lostPointIds(records, activeProjectId)) : new Set<string>()),
    [records, activeProjectId],
  )

  // 프로젝트별 조사 완료 수 (조사 단위 완료 여부 표시용)
  const surveyedCountByProject = useMemo(() => {
    const m: Record<string, number> = {}
    for (const proj of projects) m[proj.id] = surveyedPointIds(records, proj.id).length
    return m
  }, [projects, records])

  // 삭제 확인 모달 + 복원 토스트 공통 헬퍼
  function askConfirm(message: string, onConfirm: () => void, detail?: string) {
    setConfirm({ message, detail, onConfirm })
  }
  function showUndoToast(message: string, onUndo: () => void) {
    setToast({ message, onUndo, id: ++toastIdRef.current })
  }

  function addPoint(lng: number, lat: number) {
    const fallback = `${addType}-${points.length + 1}`
    const input = window.prompt('기준점 이름을 입력하세요', fallback)
    if (input === null) return
    const name = input.trim() || fallback
    const p = createControlPoint({ type: addType, name, lng, lat, tmEpsg })
    setPoints((prev) => [...prev, p])
    setSelectedId(p.id)
  }

  function importCsv(file: File) {
    void file.text().then((text) => {
      const newPoints = controlPointsFromCsv(text, tmEpsg)
      if (newPoints.length === 0) {
        window.alert('불러올 좌표가 없습니다. (헤더에 위도/경도 컬럼이 필요합니다)')
        return
      }
      setPoints((prev) => [...prev, ...newPoints])
    })
  }

  function handleToggleLost(pointId: string) {
    if (!activeProjectId) return
    setRecords((prev) => toggleLost(prev, activeProjectId, pointId))
  }

  function deletePoint(id: string) {
    const point = points.find((p) => p.id === id)
    if (!point) return
    const removedRecords = records.filter((r) => r.pointId === id)
    askConfirm(
      '정말 삭제하시겠습니까?',
      () => {
        setPoints((prev) => prev.filter((p) => p.id !== id))
        setRecords((prev) => removePointRecords(prev, id))
        setSelectedId((cur) => (cur === id ? null : cur))
        showUndoToast('기준점을 삭제했습니다', () => {
          setPoints((prev) => [...prev, point])
          setRecords((prev) => [...prev, ...removedRecords])
        })
      },
      point.name,
    )
  }

  function clearAll() {
    if (points.length === 0) return
    const prevPoints = points
    const prevRecords = records
    askConfirm(
      '정말 삭제하시겠습니까?',
      () => {
        setPoints([])
        setRecords([])
        setSelectedId(null)
        showUndoToast('전체 삭제했습니다', () => {
          // 토스트 기간에 추가/가져온 데이터 보존 → 덮어쓰지 말고 현재 상태에 병합
          setPoints((cur) => [...cur, ...prevPoints])
          setRecords((cur) => [...cur, ...prevRecords])
        })
      },
      `기준점 ${points.length}개와 조사기록이 모두 삭제됩니다`,
    )
  }

  function loadSeed() {
    setPoints(SEED_DOGEUN_BUCHEON) // 임시: 부천 도근점 시드 로드(기존 점 대체)
    setSelectedId(null)
  }

  function createProject(name: string) {
    const project = createSurveyProject(name)
    setProjects((prev) => [...prev, project])
    setActiveProjectId(project.id)
  }

  function deleteActiveProject() {
    if (!activeProjectId) return
    const pid = activeProjectId
    const project = projects.find((p) => p.id === pid)
    if (!project) return
    const removedRecords = records.filter((r) => r.projectId === pid)
    askConfirm(
      '정말 삭제하시겠습니까?',
      () => {
        setRecords((prev) => removeProjectRecords(prev, pid))
        setProjects((prev) => prev.filter((p) => p.id !== pid))
        setActiveProjectId((cur) => (cur === pid ? null : cur))
        showUndoToast('조사 프로젝트를 삭제했습니다', () => {
          setProjects((prev) => [...prev, project])
          setRecords((prev) => [...prev, ...removedRecords])
          setActiveProjectId(pid)
        })
      },
      `${project.name} · 조사기록 ${removedRecords.length}건`,
    )
  }

  function handleToggleSurvey(pointId: string) {
    if (!activeProjectId) return
    setRecords((prev) => toggleSurvey(prev, activeProjectId, pointId))
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
        onClearAll={clearAll}
        onLoadSeed={loadSeed}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      />

      <div className="flex min-h-0 flex-1">
        <MapSidebar
          projects={projects}
          activeProjectId={activeProjectId}
          onChangeActive={setActiveProjectId}
          onCreate={createProject}
          onDeleteActive={deleteActiveProject}
          surveyedCount={surveyedIds.size}
          totalCount={points.length}
          points={points}
          surveyedIds={surveyedIds}
          lostIds={lostIds}
          onFocusPoint={focusPoint}
          onToggleSurvey={handleToggleSurvey}
          onToggleLost={handleToggleLost}
          surveyedCountByProject={surveyedCountByProject}
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
              surveyed={selected !== null && activeProjectId !== null && isSurveyed(records, activeProjectId, selected.id)}
              lost={selected !== null && activeProjectId !== null && isLost(records, activeProjectId, selected.id)}
              onToggleSurvey={handleToggleSurvey}
              onClose={() => setSelectedId(null)}
              onToggleLost={handleToggleLost}
              onDelete={deletePoint}
            />
          </div>
        </div>
      </div>
    </div>

    {confirm && (
      <ConfirmDialog
        message={confirm.message}
        detail={confirm.detail}
        onConfirm={() => { confirm.onConfirm(); setConfirm(null) }}
        onCancel={() => setConfirm(null)}
      />
    )}
    {toast && (
      <Toast
        key={toast.id}
        message={toast.message}
        actionLabel="복원하기"
        onAction={toast.onUndo}
        onDismiss={() => setToast(null)}
      />
    )}
    </div>
  )
}
