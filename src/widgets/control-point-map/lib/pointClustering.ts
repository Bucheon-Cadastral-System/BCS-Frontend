import Cluster from 'ol/source/Cluster'
import type VectorSource from 'ol/source/Vector'
import type { FeatureLike } from 'ol/Feature'
import { fromLonLat } from 'ol/proj'
import { boundingExtent } from 'ol/extent'
import type { Extent } from 'ol/extent'
import type { ControlPoint, ClusterInfo, PointType } from '@/entities/control-point'

/*
 * ─── 클러스터 provider 경계 (현재: OpenLayers Cluster / client-side) ───
 * 서버사이드(PostGIS 뷰포트 클러스터링)로 전환 시 이 파일만 교체하면 된다.
 * 지도 위젯/렌더링은 ClusterInfo 계약과 아래 함수 시그니처에만 의존.
 */

export const CLUSTER_DISTANCE = 44

/** 원본 점 소스를 클러스터 소스로 감싼다. (OL 구현) */
export function createClusterSource(source: VectorSource): Cluster {
  return new Cluster({ distance: CLUSTER_DISTANCE, minDistance: 24, source })
}

/** 클러스터 피처에서 멤버 기준점 배열 추출. (OL 구현: get('features')) */
export function clusterMembers(feature: FeatureLike): ControlPoint[] {
  const members = feature.get('features') as FeatureLike[] | undefined
  if (!members) return []
  return members.map((f) => f.get('cp') as ControlPoint)
}

/** 멤버들로 계약(ClusterInfo) 계산. 망실(프로젝트별)은 조사완료의 한 종류라 done 대신 lost로 집계. */
export function computeClusterInfo(
  members: ControlPoint[],
  surveyMode: boolean,
  surveyedIds: Set<string>,
  lostIds: Set<string>,
): ClusterInfo {
  const byType: Record<PointType, number> = { 지적삼각점: 0, 지적삼각보조점: 0, 지적도근점: 0 }
  let done = 0
  let todo = 0
  let lost = 0
  for (const cp of members) {
    byType[cp.type] += 1
    if (surveyMode && lostIds.has(cp.id)) lost += 1
    else if (surveyMode && surveyedIds.has(cp.id)) done += 1
    else todo += 1
  }
  return { count: members.length, byType, bySurvey: { done, todo, lost } }
}

/** 클러스터 클릭 줌인용 범위. */
export function membersExtent(members: ControlPoint[]): Extent {
  return boundingExtent(members.map((cp) => fromLonLat([cp.lng, cp.lat])))
}
