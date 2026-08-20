import { http } from '@/shared/api/http'
import { fileNameFromDisposition, saveBlob } from '@/shared/lib/download'
import type { SurveyProject, SurveyProjectDraft } from '../model/types'

interface ServerSurveyProject {
  id: number
  name: string
  startedOn: string
  endedOn: string | null
  note: string | null
  /** 목록(요약) 응답에만 실려 온다 — 생성·수정 응답에는 없다 */
  targetCount?: number
  surveyedCount?: number
  authorId?: number | null
  authorName?: string | null
}

function toSurveyProject(server: ServerSurveyProject): SurveyProject {
  return {
    id: String(server.id),
    name: server.name,
    startedOn: server.startedOn,
    endedOn: server.endedOn,
    note: server.note,
    targetCount: server.targetCount,
    surveyedCount: server.surveyedCount,
    authorId: server.authorId === null || server.authorId === undefined ? null : String(server.authorId),
    authorName: server.authorName,
  }
}

/**
 * 서버로 보내는 조사 프로젝트 값.
 * 작성자는 보내지 않는다 — 클라이언트가 지정하면 위조할 수 있으므로 서버가 인증된 사용자로 기록해야 한다.
 */
export function toSurveyProjectPayload(draft: SurveyProjectDraft) {
  return {
    name: draft.name,
    startedOn: draft.startedOn,
    endedOn: draft.endedOn,
    note: draft.note,
  }
}

export async function fetchSurveyProjects(): Promise<SurveyProject[]> {
  const res = await http.get<{ content: ServerSurveyProject[] }>('/api/survey-projects')
  return res.data.content.map(toSurveyProject)
}

/**
 * 직접 생성 — 프로젝트는 점을 지정해 조사 여부를 적는 단위라 대상 점을 함께 보낸다(서버가 1점 이상을 요구).
 * 생성과 대상 지정이 한 요청이라 중간에 실패해도 대상 없는 프로젝트가 남지 않는다.
 */
export async function createSurveyProjectApi(args: {
  draft: SurveyProjectDraft
  targetPointIds: string[]
}): Promise<SurveyProject> {
  const res = await http.post<ServerSurveyProject>('/api/survey-projects', {
    ...toSurveyProjectPayload(args.draft),
    targetPointIds: args.targetPointIds.map(Number),
  })
  return toSurveyProject(res.data)
}

/**
 * 수정 — 값과 함께 대상 전체를 다시 보낸다(부분 수정이 아니라 재지정, 서버가 1점 이상을 요구).
 * 대상에서 빠진 점의 조사 기록은 서버가 함께 지운다.
 */
export async function updateSurveyProjectApi(args: {
  id: string
  draft: SurveyProjectDraft
  targetPointIds: string[]
}): Promise<SurveyProject> {
  const res = await http.put<ServerSurveyProject>(`/api/survey-projects/${args.id}`, {
    ...toSurveyProjectPayload(args.draft),
    targetPointIds: args.targetPointIds.map(Number),
  })
  return toSurveyProject(res.data)
}

/** 삭제하면 대상 지정·조사 기록도 서버가 함께 지운다. */
export async function deleteSurveyProjectApi(id: string): Promise<void> {
  await http.delete(`/api/survey-projects/${id}`)
}

/** 그 조사의 대상 점 id — 지도·목록을 조사 대상으로만 좁히고 진행률의 분모로 쓴다. */
/**
 * 대상 기준점 내보내기 — 서버가 만든 파일을 받아 그대로 저장한다.
 *
 * <p>저장 이름은 서버가 조사명으로 지어 헤더에 실어 보낸다. 인증 요청이라 브라우저가 그 헤더를 스스로
 * 적용하지 않으므로 여기서 되읽어 붙인다.
 */
export async function exportSurveyProjectApi(project: SurveyProject): Promise<void> {
  const res = await http.get<Blob>(`/api/survey-projects/${project.id}/export`, { responseType: 'blob' })
  saveBlob(res.data, fileNameFromDisposition(res.headers['content-disposition'], `${project.name}.xlsx`))
}

export async function fetchSurveyTargets(projectId: string): Promise<string[]> {
  const res = await http.get<{ content: number[] }>(`/api/survey-projects/${projectId}/targets`)
  return res.data.content.map(String)
}
