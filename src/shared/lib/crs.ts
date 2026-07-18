import proj4 from 'proj4'

/**
 * 지적 TM 원점 좌표계 (GRS80, 세계측지계). 좌표계는 도메인 무관 인프라라 shared 에 둔다.
 * 공통: lat_0=38, x_0=200000, y_0=600000, GRS80. 원점별로 lon_0만 다름. 부천 = 중부원점(5186).
 */
export const TM_ORIGINS = [
  { epsg: 'EPSG:5185', label: '서부원점' },
  { epsg: 'EPSG:5186', label: '중부원점(부천)' },
  { epsg: 'EPSG:5187', label: '동부원점' },
  { epsg: 'EPSG:5188', label: '동해(울릉)원점' },
  // 구 동경측지계(Bessel, 2007년 이전). 임시 시드(부천 도근점 원본 5174 성과) 표시용. GRS80 아님.
  { epsg: 'EPSG:5174', label: '중부(구·동경측지계)' },
] as const
export type TmEpsg = (typeof TM_ORIGINS)[number]['epsg']

proj4.defs('EPSG:5185', '+proj=tmerc +lat_0=38 +lon_0=125 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs')
proj4.defs('EPSG:5186', '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs')
proj4.defs('EPSG:5187', '+proj=tmerc +lat_0=38 +lon_0=129 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs')
proj4.defs('EPSG:5188', '+proj=tmerc +lat_0=38 +lon_0=131 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs')
// 구 동경측지계 중부(Bessel). towgs84는 국내 표준 7-파라미터 근사(정밀 변환은 KGD2002 grid 필요) — 시드 lng/lat은 pyproj로 별도 계산됨.
proj4.defs('EPSG:5174', '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43')

/** WGS84(경위도) → TM 원점좌표(m) */
export function wgs84ToTm(lng: number, lat: number, epsg: TmEpsg): { x: number; y: number } {
  const r = proj4('EPSG:4326', epsg, [lng, lat]) as number[]
  return { x: r[0], y: r[1] }
}

/** TM 원점좌표(m) → WGS84(경위도) */
export function tmToWgs84(x: number, y: number, epsg: TmEpsg): { lng: number; lat: number } {
  const r = proj4(epsg, 'EPSG:4326', [x, y]) as number[]
  return { lng: r[0], lat: r[1] }
}
