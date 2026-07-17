import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import OSM from 'ol/source/OSM'
import TileWMS from 'ol/source/TileWMS'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat, toLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control/defaults'
import ScaleLine from 'ol/control/ScaleLine'
import AnimatedCluster from 'ol-ext/layer/AnimatedCluster'
import type { FeatureLike } from 'ol/Feature'
import type { Style } from 'ol/style'
import { VWORLD_KEY, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/shared/config/map'
import { controlPointStyle, clusterStyle } from '@/entities/control-point'
import type { ControlPoint, MapTheme } from '@/entities/control-point'
import { createClusterSource, clusterMembers, computeClusterInfo } from '../lib/pointClustering'

/** 테마별 배경지도 소스 (VWorld Base/midnight, 키 없으면 OSM / CARTO dark) */
function makeBaseSource(theme: MapTheme): XYZ {
  if (theme === 'dark') {
    return VWORLD_KEY
      ? new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/midnight/{z}/{y}/{x}.png` })
      : new XYZ({ url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', attributions: '© OpenStreetMap, © CARTO' })
  }
  return VWORLD_KEY
    ? new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png` })
    : new OSM()
}

interface ControlPointMapProps {
  points: ControlPoint[]
  addMode: boolean
  showCadastral: boolean
  selectedId: string | null
  surveyMode: boolean
  surveyedIds: Set<string>
  theme: MapTheme
  focusNonce: number
  onAddPoint: (lng: number, lat: number) => void
  onSelect: (id: string | null) => void
  onClusterClick: (members: ControlPoint[], x: number, y: number, w: number, h: number) => void
}

export function ControlPointMap(props: ControlPointMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const rawSourceRef = useRef<VectorSource | null>(null)
  const clusterLayerRef = useRef<AnimatedCluster | null>(null)
  const cadastralRef = useRef<TileLayer<TileWMS> | null>(null)
  const baseLayerRef = useRef<TileLayer<XYZ> | null>(null)

  // 지도는 1회만 생성 → 최신 props/콜백을 ref 로 유지
  const addModeRef = useRef(props.addMode)
  const onAddPointRef = useRef(props.onAddPoint)
  const onSelectRef = useRef(props.onSelect)
  const onClusterClickRef = useRef(props.onClusterClick)
  const selectedIdRef = useRef(props.selectedId)
  const surveyModeRef = useRef(props.surveyMode)
  const surveyedIdsRef = useRef(props.surveyedIds)
  const themeRef = useRef(props.theme)
  addModeRef.current = props.addMode
  onAddPointRef.current = props.onAddPoint
  onSelectRef.current = props.onSelect
  onClusterClickRef.current = props.onClusterClick
  selectedIdRef.current = props.selectedId
  surveyModeRef.current = props.surveyMode
  surveyedIdsRef.current = props.surveyedIds
  themeRef.current = props.theme

  // 초기화 (마운트 시 1회)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const baseLayer = new TileLayer({ source: makeBaseSource(props.theme) })
    baseLayerRef.current = baseLayer

    const cadastralLayer = new TileLayer({
      visible: props.showCadastral,
      source: new TileWMS({
        url: 'https://api.vworld.kr/req/wms',
        params: {
          KEY: VWORLD_KEY,
          DOMAIN: window.location.origin,
          LAYERS: 'lt_c_landinfobasemap',
          STYLES: 'lt_c_landinfobasemap',
          FORMAT: 'image/png',
          TRANSPARENT: true,
        },
      }),
    })
    cadastralRef.current = cadastralLayer

    const rawSource = new VectorSource()
    rawSourceRef.current = rawSource

    // 단일(1개)=기존 공식 도식 / 클러스터(2개+)=조사비율 도넛+개수 뱃지 (테마 반영)
    const layerStyle = (feature: FeatureLike): Style => {
      const members = clusterMembers(feature)
      if (members.length === 1) {
        const cp = members[0]
        const survey = !surveyModeRef.current ? 'none' : surveyedIdsRef.current.has(cp.id) ? 'done' : 'todo'
        return controlPointStyle(cp, cp.id === selectedIdRef.current, survey, themeRef.current)
      }
      return clusterStyle(computeClusterInfo(members, surveyModeRef.current, surveyedIdsRef.current), themeRef.current)
    }

    const clusterLayer = new AnimatedCluster({
      source: createClusterSource(rawSource),
      style: layerStyle,
      animationDuration: 100,
    })
    clusterLayerRef.current = clusterLayer

    const map = new Map({
      target: container,
      controls: defaultControls().extend([new ScaleLine({ units: 'metric' })]),
      layers: [baseLayer, cadastralLayer, clusterLayer],
      view: new View({ center: fromLonLat(DEFAULT_CENTER), zoom: DEFAULT_ZOOM }),
    })
    mapRef.current = map

    map.on('click', (evt) => {
      if (addModeRef.current) {
        const [lng, lat] = toLonLat(evt.coordinate)
        onAddPointRef.current(lng, lat)
        return
      }
      let handled = false
      map.forEachFeatureAtPixel(evt.pixel, (f) => {
        const members = clusterMembers(f)
        if (members.length === 0) return false
        if (members.length === 1) {
          onSelectRef.current(members[0].id)
        } else {
          // 클러스터 클릭 → 뱃지(클러스터 중심) 옆 리스트 팝오버 (클릭 지점 무관)
          const g = f.getGeometry()
          const center = g ? map.getPixelFromCoordinate((g as Point).getCoordinates()) : null
          const ax = center ? center[0] : evt.pixel[0]
          const ay = center ? center[1] : evt.pixel[1]
          const size = map.getSize() ?? [0, 0]
          onClusterClickRef.current(members, ax, ay, size[0], size[1])
        }
        handled = true
        return true
      })
      if (!handled) onSelectRef.current(null)
    })

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
      rawSourceRef.current = null
      clusterLayerRef.current = null
      cadastralRef.current = null
      baseLayerRef.current = null
    }
  }, [])

  // points 변경 → 원본 소스 재구성 (클러스터는 자동 갱신)
  useEffect(() => {
    const source = rawSourceRef.current
    if (!source) return
    source.clear()
    source.addFeatures(
      props.points.map((p) => {
        const f = new Feature({ geometry: new Point(fromLonLat([p.lng, p.lat])) })
        f.set('id', p.id)
        f.set('cp', p)
        return f
      }),
    )
  }, [props.points])

  // 선택/조사상태/테마 변경 → 클러스터 레이어 재스타일
  useEffect(() => {
    clusterLayerRef.current?.changed()
  }, [props.selectedId, props.surveyMode, props.surveyedIds, props.theme])

  // 테마 변경 → 배경지도 소스 교체
  useEffect(() => {
    baseLayerRef.current?.setSource(makeBaseSource(props.theme))
  }, [props.theme])

  // 지적도 레이어 토글
  useEffect(() => {
    cadastralRef.current?.setVisible(props.showCadastral)
  }, [props.showCadastral])

  // 선택된 점으로 이동 (부드러운 팬)
  useEffect(() => {
    if (!props.selectedId || !mapRef.current) return
    const p = props.points.find((x) => x.id === props.selectedId)
    if (!p) return
    mapRef.current.getView().animate({ center: fromLonLat([p.lng, p.lat]), duration: 300 })
  }, [props.selectedId])

  // 리스트에서 포커스 → 확대 + 이동
  useEffect(() => {
    if (props.focusNonce === 0 || !mapRef.current || !props.selectedId) return
    const p = props.points.find((x) => x.id === props.selectedId)
    if (!p) return
    mapRef.current.getView().animate({ center: fromLonLat([p.lng, p.lat]), zoom: 19, duration: 450 })
  }, [props.focusNonce])

  return <div ref={containerRef} className={`absolute inset-0 ${props.addMode ? 'cursor-crosshair' : ''}`} />
}
