import { useEffect, useMemo, useState } from 'react'
import { MapToolbar } from '@/widgets/map-toolbar'
import { ControlPointMap } from '@/widgets/control-point-map'
import { ControlPointDetail } from '@/widgets/control-point-detail'
import { SurveyProjectBar } from '@/widgets/survey-project-bar'
import { loadPoints, savePoints, createControlPoint, POINT_TYPES } from '@/entities/control-point'
import type { ControlPoint, PointType } from '@/entities/control-point'
import type { TmEpsg } from '@/shared/lib/crs'
import { controlPointsFromCsv } from '@/features/import-control-points'
import { VWORLD_KEY } from '@/shared/config/map'
import { loadProjects, saveProjects, createSurveyProject } from '@/entities/survey-project'
import type { SurveyProject } from '@/entities/survey-project'
import {
  loadRecords,
  saveRecords,
  toggleSurvey,
  isSurveyed,
  surveyedPointIds,
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
  const [tmEpsg, setTmEpsg] = useState<TmEpsg>('EPSG:5186')
  const [showCadastral, setShowCadastral] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  // localStorage 영속
  useEffect(() => { savePoints(points) }, [points])
  useEffect(() => { saveProjects(projects) }, [projects])
  useEffect(() => { saveRecords(records) }, [records])

  const surveyedIds = useMemo(
    () => (activeProjectId ? new Set(surveyedPointIds(records, activeProjectId)) : new Set<string>()),
    [records, activeProjectId],
  )

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

  function toggleLost(id: string) {
    setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, lost: !p.lost } : p)))
  }

  function deletePoint(id: string) {
    setPoints((prev) => prev.filter((p) => p.id !== id))
    setRecords((prev) => removePointRecords(prev, id))
    setSelectedId((cur) => (cur === id ? null : cur))
  }

  function clearAll() {
    if (points.length === 0) return
    if (window.confirm('저장된 기준점을 모두 삭제할까요? (조사기록도 함께 삭제됩니다)')) {
      setPoints([])
      setRecords([])
      setSelectedId(null)
    }
  }

  function createProject(name: string) {
    const project = createSurveyProject(name)
    setProjects((prev) => [...prev, project])
    setActiveProjectId(project.id)
  }

  function deleteActiveProject() {
    if (!activeProjectId) return
    if (!window.confirm('이 조사 프로젝트와 조사기록을 삭제할까요?')) return
    setRecords((prev) => removeProjectRecords(prev, activeProjectId))
    setProjects((prev) => prev.filter((p) => p.id !== activeProjectId))
    setActiveProjectId(null)
  }

  function handleToggleSurvey(pointId: string) {
    if (!activeProjectId) return
    setRecords((prev) => toggleSurvey(prev, activeProjectId, pointId))
  }

  const selected = points.find((p) => p.id === selectedId) ?? null
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null

  return (
    <div className="app">
      <MapToolbar
        addMode={addMode}
        onToggleAdd={() => setAddMode((v) => !v)}
        addType={addType}
        onChangeType={setAddType}
        tmEpsg={tmEpsg}
        onChangeEpsg={setTmEpsg}
        showCadastral={showCadastral}
        onToggleCadastral={() => setShowCadastral((v) => !v)}
        count={points.length}
        onImportCsv={importCsv}
        onClearAll={clearAll}
        isAdmin={role === 'ADMIN'}
        onOpenUserManagement={onOpenUserManagement}
      />

      <SurveyProjectBar
        projects={projects}
        activeProjectId={activeProjectId}
        onChangeActive={setActiveProjectId}
        onCreate={createProject}
        onDeleteActive={deleteActiveProject}
        surveyedCount={surveyedIds.size}
        totalCount={points.length}
      />

      {!VWORLD_KEY && (
        <div className="warn">
          VWorld API 키가 없어 배경지도를 OSM으로 대체합니다. <code>.env</code>에 <code>VITE_VWORLD_KEY</code>를 넣으면 VWorld 배경지도·지적도가 표시됩니다.
        </div>
      )}

      {addMode && (
        <div className="hint">
          지도를 클릭해 <b>{addType}</b> 추가 (원점: {tmEpsg})
        </div>
      )}

      <div className="body">
        <ControlPointMap
          points={points}
          addMode={addMode}
          showCadastral={showCadastral}
          selectedId={selectedId}
          surveyMode={activeProjectId !== null}
          surveyedIds={surveyedIds}
          onAddPoint={addPoint}
          onSelect={setSelectedId}
        />
        <ControlPointDetail
          point={selected}
          activeProjectName={activeProject?.name ?? null}
          surveyed={selected !== null && activeProjectId !== null && isSurveyed(records, activeProjectId, selected.id)}
          onToggleSurvey={handleToggleSurvey}
          onClose={() => setSelectedId(null)}
          onToggleLost={toggleLost}
          onDelete={deletePoint}
        />
      </div>
    </div>
  )
}
