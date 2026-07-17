import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import XYZ from 'ol/source/XYZ'
import OSM from 'ol/source/OSM'
import TileWMS from 'ol/source/TileWMS'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat, toLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control/defaults'
import ScaleLine from 'ol/control/ScaleLine'
import { VWORLD_KEY, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/shared/config/map'
import { controlPointStyle } from '@/entities/control-point'
import type { ControlPoint } from '@/entities/control-point'

interface ControlPointMapProps {
  points: ControlPoint[]
  addMode: boolean
  showCadastral: boolean
  selectedId: string | null
  surveyMode: boolean
  surveyedIds: Set<string>
  onAddPoint: (lng: number, lat: number) => void
  onSelect: (id: string | null) => void
}

export function ControlPointMap(props: ControlPointMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const sourceRef = useRef<VectorSource | null>(null)
  const cadastralRef = useRef<TileLayer<TileWMS> | null>(null)

  // 지도는 1회만 생성하므로 최신 props/콜백을 ref 로 유지
  const addModeRef = useRef(props.addMode)
  const onAddPointRef = useRef(props.onAddPoint)
  const onSelectRef = useRef(props.onSelect)
  addModeRef.current = props.addMode
  onAddPointRef.current = props.onAddPoint
  onSelectRef.current = props.onSelect

  // 초기화 (마운트 시 1회)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const baseLayer = new TileLayer({
      source: VWORLD_KEY
        ? new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png` })
        : new OSM(),
    })

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

    const source = new VectorSource()
    sourceRef.current = source

    const map = new Map({
      target: container,
      controls: defaultControls().extend([new ScaleLine({ units: 'metric' })]),
      layers: [baseLayer, cadastralLayer, new VectorLayer({ source })],
      view: new View({ center: fromLonLat(DEFAULT_CENTER), zoom: DEFAULT_ZOOM }),
    })
    mapRef.current = map

    map.on('click', (evt) => {
      if (addModeRef.current) {
        const [lng, lat] = toLonLat(evt.coordinate)
        onAddPointRef.current(lng, lat)
        return
      }
      let hitId: string | null = null
      map.forEachFeatureAtPixel(evt.pixel, (f) => {
        hitId = (f.get('id') as string | undefined) ?? null
        return true
      })
      onSelectRef.current(hitId)
    })

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
      sourceRef.current = null
      cadastralRef.current = null
    }
  }, [])

  // 마커 갱신 (points / 선택 / 조사상태 변경 시)
  useEffect(() => {
    const source = sourceRef.current
    if (!source) return
    source.clear()
    for (const p of props.points) {
      const f = new Feature({ geometry: new Point(fromLonLat([p.lng, p.lat])) })
      f.set('id', p.id)
      const survey = !props.surveyMode ? 'none' : props.surveyedIds.has(p.id) ? 'done' : 'todo'
      f.setStyle(controlPointStyle(p, p.id === props.selectedId, survey))
      source.addFeature(f)
    }
  }, [props.points, props.selectedId, props.surveyMode, props.surveyedIds])

  // 지적도 레이어 토글
  useEffect(() => {
    cadastralRef.current?.setVisible(props.showCadastral)
  }, [props.showCadastral])

  // 선택된 점으로 이동
  useEffect(() => {
    if (!props.selectedId || !mapRef.current) return
    const p = props.points.find((x) => x.id === props.selectedId)
    if (!p) return
    mapRef.current.getView().animate({ center: fromLonLat([p.lng, p.lat]), duration: 300 })
  }, [props.selectedId])

  return <div ref={containerRef} className={`absolute inset-0 ${props.addMode ? 'cursor-crosshair' : ''}`} />
}
