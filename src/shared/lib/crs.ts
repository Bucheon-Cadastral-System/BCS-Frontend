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
] as const
export type TmEpsg = (typeof TM_ORIGINS)[number]['epsg']

proj4.defs('EPSG:5185', '+proj=tmerc +lat_0=38 +lon_0=125 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs')
proj4.defs('EPSG:5186', '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs')
proj4.defs('EPSG:5187', '+proj=tmerc +lat_0=38 +lon_0=129 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs')
proj4.defs('EPSG:5188', '+proj=tmerc +lat_0=38 +lon_0=131 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs')

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
