import { http } from '@/shared/api/http'
import type { TmEpsg } from '@/shared/lib/crs'
import type { ControlPoint, PointType } from '../model/types'
import { compareControlPoints } from '../model/types'

/** 서버 enum 표기 ↔ 프론트 표기 매핑 */
type ServerPointType = 'TRIANGULATION' | 'TRIANGULATION_AUX' | 'DOGEUN'
type ServerCrs = 'GRS80_WEST' | 'GRS80_CENTRAL' | 'GRS80_EAST' | 'GRS80_EAST_SEA' | 'BESSEL_CENTRAL'

const TYPE_FROM_SERVER: Record<ServerPointType, PointType> = {
  TRIANGULATION: '지적삼각점',
  TRIANGULATION_AUX: '지적삼각보조점',
  DOGEUN: '지적도근점',
}

const TYPE_TO_SERVER: Record<PointType, ServerPointType> = {
  지적삼각점: 'TRIANGULATION',
  지적삼각보조점: 'TRIANGULATION_AUX',
  지적도근점: 'DOGEUN',
}

const EPSG_FROM_CRS: Record<ServerCrs, TmEpsg> = {
  GRS80_WEST: 'EPSG:5185',
  GRS80_CENTRAL: 'EPSG:5186',
  GRS80_EAST: 'EPSG:5187',
  GRS80_EAST_SEA: 'EPSG:5188',
  BESSEL_CENTRAL: 'EPSG:5174',
}

const CRS_FROM_EPSG: Record<TmEpsg, ServerCrs> = {
  'EPSG:5185': 'GRS80_WEST',
  'EPSG:5186': 'GRS80_CENTRAL',
  'EPSG:5187': 'GRS80_EAST',
  'EPSG:5188': 'GRS80_EAST_SEA',
  'EPSG:5174': 'BESSEL_CENTRAL',
}

interface ServerControlPoint {
  id: number
  pointNo: string
  type: ServerPointType
  name: string
  crs: ServerCrs
  northing: number
  easting: number
  longitude: number
  latitude: number
}

/** 서버 응답 → 프론트 모델. */
function toControlPoint(server: ServerControlPoint): ControlPoint {
  return {
    id: String(server.id),
    pointNo: server.pointNo,
    type: TYPE_FROM_SERVER[server.type],
    name: server.name,
    lng: server.longitude,
    lat: server.latitude,
    northing: server.northing,
    easting: server.easting,
    tmEpsg: EPSG_FROM_CRS[server.crs],
  }
}

export async function fetchControlPoints(): Promise<ControlPoint[]> {
  const res = await http.get<{ content: ServerControlPoint[] }>('/api/control-points')
  // 들어오는 길목에서 기본 정렬(종류 → 이름)로 맞춘다 — 이 목록을 거르기만 하는
  // 소비처(상세 대상 목록·종류 드로어·대상 고르기·검색)가 전부 같은 순서를 물려받는다
  return res.data.content.map(toControlPoint).sort(compareControlPoints)
}

export interface RegisterControlPointArgs {
  pointNo: string
  type: PointType
  name: string
  /** 성과 좌표(권위값) — 경위도는 서버가 여기서 파생한다 */
  northing: number
  easting: number
  tmEpsg: TmEpsg
}

/** 등록 결과 — 임포트와 같은 규칙이라 신규만이 아니라 기존 점 갱신·재사용으로도 끝난다. */
export interface RegisterControlPointOutcome {
  point: ControlPoint
  created: boolean
  updated: boolean
  /** 부천 범위 밖 좌표 등 확인 요청 — 등록을 막지 않는다 */
  warning: string | null
}

export async function registerControlPoint(args: RegisterControlPointArgs): Promise<RegisterControlPointOutcome> {
  const res = await http.post<{
    point: ServerControlPoint
    created: boolean
    updated: boolean
    warning: string | null
  }>('/api/control-points', toPayload(args))
  return {
    point: toControlPoint(res.data.point),
    created: res.data.created,
    updated: res.data.updated,
    warning: res.data.warning ?? null,
  }
}

/** 수정 결과 — 경위도는 성과에서 재파생되고, 범위 밖 경고는 저장을 막지 않는다. */
export interface UpdateControlPointOutcome {
  point: ControlPoint
  warning: string | null
}

/** 수정 — 식별·성과만 보낸다. 소재지·설치·최종조사 항목은 서버가 기존 값을 유지한다. */
export async function updateControlPoint(
  args: RegisterControlPointArgs & { id: string },
): Promise<UpdateControlPointOutcome> {
  const res = await http.put<{ point: ServerControlPoint; warning: string | null }>(
    `/api/control-points/${args.id}`,
    toPayload(args),
  )
  return { point: toControlPoint(res.data.point), warning: res.data.warning ?? null }
}

/** 삭제 — 조사 프로젝트가 대상·기록으로 쓰는 점은 서버가 거부한다(409). */
export async function deleteControlPoint(id: string): Promise<void> {
  await http.delete(`/api/control-points/${id}`)
}

/** 조사 데이터가 참조 중인지 — 삭제 확인 창을 물음/불가로 갈라 여는 근거다. */
/** 이 점을 마지막으로 조사한 사람. 목록에 싣지 않고 점을 고른 뒤에만 읽는다. */
/** 기준점의 최종조사 요약 — 회차와 무관하게 마지막으로 조사한 결과다. 조사한 적이 없으면 세 칸이 비어 있다. */
export interface LastSurvey {
  /** 최종조사내용. 없으면 null */
  result: string | null
  /** 최종조사일(ISO 날짜). 없으면 null */
  surveyedOn: string | null
  /** 최종조사원 표시명. 시드 조사와 인증 전에 남긴 기록은 null */
  surveyorName: string | null
  /** 판정에 딸린 비고. 기타가 아니거나 시드 조사면 null */
  note: string | null
}

export async function fetchLastSurvey(id: string): Promise<LastSurvey> {
  const res = await http.get<LastSurvey>(`/api/control-points/${id}/last-survey`)
  return {
    result: res.data.result ?? null,
    surveyedOn: res.data.surveyedOn ?? null,
    surveyorName: res.data.surveyorName ?? null,
    note: res.data.note ?? null,
  }
}

export async function fetchControlPointUsage(id: string): Promise<boolean> {
  const res = await http.get<{ referenced: boolean }>(`/api/control-points/${id}/usage`)
  return res.data.referenced
}

function toPayload(args: RegisterControlPointArgs) {
  return {
    pointNo: args.pointNo,
    type: TYPE_TO_SERVER[args.type],
    name: args.name,
    crs: CRS_FROM_EPSG[args.tmEpsg],
    northing: args.northing,
    easting: args.easting,
  }
}
