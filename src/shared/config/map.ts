const env = import.meta.env as Record<string, string | undefined>

/**
 * VWorld(브이월드) API 키. 프로젝트 루트 `.env` 에 `VITE_VWORLD_KEY=발급키`.
 * 키는 https://www.vworld.kr 발급 + 사용 도메인(개발 시 localhost) 등록 필요.
 * 없으면 배경지도는 OSM 으로 대체되고 지적도 레이어는 표시되지 않는다.
 */
export const VWORLD_KEY = env.VITE_VWORLD_KEY ?? ''

/**
 * 지도 기본 중심 — 부천 기준점 분포의 중앙 [경도, 위도] WGS84.
 * 부천시청(126.766)은 분포 서쪽 끝에 가까워 그 곳을 중심으로 잡으면 점들이 오른쪽으로 몰려 보인다.
 */
export const DEFAULT_CENTER: [number, number] = [126.7858, 37.4998]

/** 지도 기본 줌 */
export const DEFAULT_ZOOM = 13

