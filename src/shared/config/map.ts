const env = import.meta.env as Record<string, string | undefined>

/**
 * VWorld(브이월드) API 키. 프로젝트 루트 `.env` 에 `VITE_VWORLD_KEY=발급키`.
 * 키는 https://www.vworld.kr 발급 + 사용 도메인(개발 시 localhost) 등록 필요.
 * 없으면 배경지도는 OSM 으로 대체되고 지적도 레이어는 표시되지 않는다.
 */
export const VWORLD_KEY = env.VITE_VWORLD_KEY ?? ''

/** 지도 기본 중심 — 부천시청 [경도, 위도] WGS84 */
export const DEFAULT_CENTER: [number, number] = [126.766, 37.5035]

/** 지도 기본 줌 */
export const DEFAULT_ZOOM = 13

/** 가장 멀리 물러설 수 있는 줌 — 다루는 자료가 부천 안에 있어 그 밖까지 물러설 일이 없다 */
export const MIN_ZOOM = 11

