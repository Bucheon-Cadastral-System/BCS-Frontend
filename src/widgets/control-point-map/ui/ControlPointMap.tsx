import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import ImageLayer from 'ol/layer/Image'
import XYZ from 'ol/source/XYZ'
import OSM from 'ol/source/OSM'
import ImageWMS from 'ol/source/ImageWMS'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat, toLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control/defaults'
import type { FeatureLike } from 'ol/Feature'
import type { Style } from 'ol/style'
import { VWORLD_KEY, DEFAULT_CENTER, DEFAULT_ZOOM, MIN_ZOOM } from '@/shared/config/map'
import { controlPointStyle } from '@/entities/control-point'
import type { ControlPoint, MapTheme } from '@/entities/control-point'
import { deriveSurveyStatus } from '@/entities/survey-record'

/** 이 줌부터 점 이름을 그린다. 더 멀리서는 라벨끼리 겹쳐 읽을 수 없어 도식만 남긴다. */
const LABEL_MIN_ZOOM = 16
/**
 * 위 줌에 해당하는 EPSG:3857 해상도(m/px). 스타일 함수는 줌이 아니라 해상도를 받는다.
 * 해상도는 줌이 커질수록 작아지므로 '이 값 이하'가 곧 '이 줌 이상'이고, 같을 때(정확히 줌 16)도 포함한다.
 */
const LABEL_MAX_RESOLUTION = 156543.03392804097 / 2 ** LABEL_MIN_ZOOM

/** 목록에서 점을 고를 때 맞추는 줌. 배경 타일 네이티브 최대(라이트 19·다크 18)와 같은 눈높이. */
const FOCUS_ZOOM = 19

/**
 * 테마별 배경지도 소스 (VWorld Base/midnight, 키 없으면 OSM / CARTO dark).
 * ⚠️ VWorld 배경 타일 네이티브 최대 줌: **midnight=18, Base=19** (그 위 레벨은 타일이 없어 503).
 * maxZoom 을 반드시 지정 → 그 이상 줌에선 OL 이 마지막 레벨 타일을 확대(overzoom)해 화면을 채움.
 * 미지정 시 OL 기본 maxZoom(42)이라 존재하지 않는 상위 타일을 요청 → 503 → **부분 공백(까만 패치)** 렌더.
 * (리스트 클릭→z19 포커스가 midnight(캡18)에 착지해 화면 일부만 갱신되던 버그의 원인.)
 */
function makeBaseSource(theme: MapTheme): XYZ {
  if (theme === 'dark') {
    return VWORLD_KEY
      ? new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/midnight/{z}/{y}/{x}.png`, maxZoom: 18 })
      : new XYZ({ url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', attributions: '© OpenStreetMap, © CARTO', maxZoom: 20 })
  }
  return VWORLD_KEY
    ? new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png`, maxZoom: 19 })
    : new OSM()
}

/** 판이 가린 만큼 지도 중심을 옮길 거리 — 좌우가 가린 폭의 차이 절반이 보이는 자리의 중앙이다 */
function centerShift(leftInset: number, rightInset: number, resolution: number): number {
  return ((leftInset - rightInset) / 2) * resolution
}

interface ControlPointMapProps {
  /** 전체 기준점 — 소스는 이 목록을 한 번만 들고, 갱신 때는 바뀐 점만 손본다 */
  points: ControlPoint[]
  /** 보일 점 id — null 이면 전부. 탭·조사 전환은 소스 재구성이 아니라 이 집합의 교체다 */
  visibleIds: ReadonlySet<string> | null
  addMode: boolean
  showCadastral: boolean
  selectedId: string | null
  surveyMode: boolean
  surveyedIds: Set<string>
  lostIds: Set<string>
  theme: MapTheme
  focusNonce: number
  /** 처음 보던 자리로 되돌리라는 신호 — 값이 바뀔 때마다 한 번 움직인다(0 = 아직 누르지 않음) */
  homeNonce: number
  /** 좌·우 판이 지도를 가린 폭 — 점을 '가려지지 않은 자리'의 중앙에 세우는 데 쓴다 */
  leftInset: number
  rightInset: number
  onAddPoint: (lng: number, lat: number) => void
  onSelect: (id: string | null) => void
  /** 만들어진 지도 인스턴스 — 하단 상태 표시처럼 매 프레임 값이 바뀌는 UI가 직접 구독하도록 넘긴다 */
  onMapReady?: (map: Map | null) => void
}

export function ControlPointMap(props: ControlPointMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const rawSourceRef = useRef<VectorSource | null>(null)
  // 점 id → 피처 — 갱신을 통째 재구성이 아니라 diff 로 하기 위한 색인 (Map 이름은 ol/Map 이 차지해 globalThis 로 부른다)
  const featureByIdRef = useRef<globalThis.Map<string, Feature>>(new globalThis.Map())
  const pointLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const cadastralRef = useRef<ImageLayer<ImageWMS> | null>(null)
  const baseLayerRef = useRef<TileLayer<XYZ> | null>(null)
  const lastFocusNonceRef = useRef(props.focusNonce)

  // 지도는 1회만 생성 → 최신 props/콜백을 ref 로 유지
  const addModeRef = useRef(props.addMode)
  const onAddPointRef = useRef(props.onAddPoint)
  const onSelectRef = useRef(props.onSelect)
  const selectedIdRef = useRef(props.selectedId)
  const surveyModeRef = useRef(props.surveyMode)
  const surveyedIdsRef = useRef(props.surveyedIds)
  const lostIdsRef = useRef(props.lostIds)
  const themeRef = useRef(props.theme)
  const visibleIdsRef = useRef(props.visibleIds)
  const leftInsetRef = useRef(props.leftInset)
  const rightInsetRef = useRef(props.rightInset)
  const pointsRef = useRef(props.points)
  const focusNonceRef = useRef(props.focusNonce)
  const showCadastralRef = useRef(props.showCadastral)
  const onMapReadyRef = useRef(props.onMapReady)
  // 렌더 중 ref 대입은 순수하지 않음(버려지는 렌더가 미커밋 값을 남길 수 있음) → 커밋 후 effect에서 동기화.
  // OL 콜백/스타일은 커밋 뒤(비동기 상호작용·재렌더)에만 refs를 읽으므로, 이 effect를 먼저 선언해 항상 최신값을 보게 함.
  useEffect(() => {
    addModeRef.current = props.addMode
    onAddPointRef.current = props.onAddPoint
    onSelectRef.current = props.onSelect
    selectedIdRef.current = props.selectedId
    surveyModeRef.current = props.surveyMode
    surveyedIdsRef.current = props.surveyedIds
    lostIdsRef.current = props.lostIds
    themeRef.current = props.theme
    visibleIdsRef.current = props.visibleIds
    leftInsetRef.current = props.leftInset
    rightInsetRef.current = props.rightInset
    pointsRef.current = props.points
    focusNonceRef.current = props.focusNonce
    showCadastralRef.current = props.showCadastral
    onMapReadyRef.current = props.onMapReady
  })

  // 초기화 (마운트 시 1회)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const baseSource = makeBaseSource(themeRef.current)
    const baseLayer = new TileLayer({ source: baseSource })
    // 어느 테마의 배경인지 레이어에 적어 둔다 — 아래 교체 이펙트가 이미 그 테마면 아무것도 하지 않게
    baseLayer.set('theme', themeRef.current)
    baseLayerRef.current = baseLayer

    // 지적도 ImageWMS(뷰당 1 요청) — TileWMS(~20 요청)는 실패 시 연결 풀을 막아 배경 타일까지 굶김.
    // ★ DOMAIN 은 반드시 **순수 호스트**(window.location.hostname). origin(예: `http://localhost:5173` — 프로토콜+포트
    //   포함)을 보내면 VWorld WMS 가 503으로 거부해 지적도가 안 뜬다. hostname(`localhost` / 배포 `bcs.inwoohub.com`)이면 정상.
    //   (VWorld WMS 는 CORS 미지원이라 fetch 기반 로더는 못 씀 → OL 기본 <img> 로딩 사용.)
    const cadastralSource = new ImageWMS({
      url: 'https://api.vworld.kr/req/wms',
      ratio: 1,
      params: {
        KEY: VWORLD_KEY,
        DOMAIN: window.location.hostname,
        LAYERS: 'lt_c_landinfobasemap',
        STYLES: 'lt_c_landinfobasemap',
        FORMAT: 'image/png',
        TRANSPARENT: true,
      },
    })
    // VWORLD_KEY 없으면 지적도 WMS가 KEY='' 로 매 이동마다 실패 요청 → 아예 끔
    const cadastralLayer = new ImageLayer({ visible: Boolean(VWORLD_KEY) && showCadastralRef.current, source: cadastralSource })
    cadastralRef.current = cadastralLayer

    const rawSource = new VectorSource()
    rawSourceRef.current = rawSource

    // 점은 겹치더라도 하나씩 그대로 그린다. 이름은 가까이서 볼 때만 붙인다.
    // 소스는 전체 점을 들고 있고, 숨길 점은 스타일을 돌려주지 않아 그리기·클릭 판정에서 함께 빠진다.
    const layerStyle = (feature: FeatureLike, resolution: number): Style | undefined => {
      const cp = feature.get('cp') as ControlPoint
      const visible = visibleIdsRef.current
      if (visible !== null && !visible.has(cp.id)) return undefined
      const survey = surveyModeRef.current
        ? deriveSurveyStatus(cp.id, surveyedIdsRef.current, lostIdsRef.current)
        : 'none'
      return controlPointStyle(
        cp,
        cp.id === selectedIdRef.current,
        survey,
        themeRef.current,
        resolution <= LABEL_MAX_RESOLUTION,
      )
    }

    // declutter 는 라벨 겹침을 걸러 준다 — 도식은 declutterMode:'none'(markerStyle)이라 빠짐없이 그려진다
    const pointLayer = new VectorLayer({ source: rawSource, style: layerStyle, declutter: true })
    pointLayerRef.current = pointLayer

    const map = new Map({
      target: container,
      controls: defaultControls(), // 축척은 비율과 한 칩에 묶으려고 map-status-bar 가 직접 붙인다
      layers: [baseLayer, cadastralLayer, pointLayer],
      // maxZoom 20: 배경 타일 네이티브 최대(라이트 19·다크 18)를 크게 넘기면 확대 보정으로 흐려진다
      // minZoom: 부천 밖으로 한없이 물러서지 않게 막는다(shared/config/map)
      view: new View({ center: fromLonLat(DEFAULT_CENTER), zoom: DEFAULT_ZOOM, minZoom: MIN_ZOOM, maxZoom: 20 }),
    })
    mapRef.current = map
    onMapReadyRef.current?.(map)

    // 타일이 도착할 때마다 리렌더 → 큰 줌 점프(리스트 포커스 등) 후에도 축소상태 안 남고 즉시 갱신.
    // 이동·줌 중에는 타일이 수십 장 쏟아지므로 한 프레임에 한 번으로 모은다 — 요청만 모을 뿐 갱신 시점은 같다.
    let renderFrame = 0
    const rerender = () => {
      if (renderFrame !== 0) return
      renderFrame = requestAnimationFrame(() => {
        renderFrame = 0
        map.render()
      })
    }
    baseSource.on('tileloadend', rerender)
    cadastralSource.on('imageloadend', rerender)


    // 컨테이너 크기 변화(배너 토글·창 리사이즈·레이아웃) → OL 크기가 stale 되면 타일이 잘못 렌더됨(네모난 잔상).
    // 감지해서 updateSize 로 뷰포트 재계산 + 재렌더.
    const resizeObserver = new ResizeObserver(() => map.updateSize())
    resizeObserver.observe(container)

    map.on('click', (evt) => {
      if (addModeRef.current) {
        const [lng, lat] = toLonLat(evt.coordinate)
        onAddPointRef.current(lng, lat)
        return
      }
      // 점이 겹친 자리에서는 OL 이 위에 그려진 것 하나만 준다 — 겹친 나머지는 기준점 목록에서 찾는다
      let handled = false
      map.forEachFeatureAtPixel(evt.pixel, (f) => {
        const cp = f.get('cp') as ControlPoint | undefined
        if (!cp) return false
        onSelectRef.current(cp.id)
        handled = true
        return true
      })
      if (!handled) onSelectRef.current(null)
    })

    return () => {
      // 예약해 둔 프레임·리스너를 걷는다 — 남기면 떠난 지도에 마지막 타일이 렌더를 건다
      if (renderFrame !== 0) cancelAnimationFrame(renderFrame)
      baseSource.un('tileloadend', rerender)
      cadastralSource.un('imageloadend', rerender)
      resizeObserver.disconnect()
      map.setTarget(undefined)
      onMapReadyRef.current?.(null)
      mapRef.current = null
      rawSourceRef.current = null
      featureByIdRef.current = new globalThis.Map()
      pointLayerRef.current = null
      cadastralRef.current = null
      baseLayerRef.current = null
    }
  }, [])

  /**
   * points 변경 → 소스 diff 갱신.
   * 통째로 부수고 다시 만들면(clear+add) 재조회 때마다 수천 피처 생성·색인 재구축이 한 프레임에 몰린다.
   * 탭·조사 전환은 여기 오지 않는다 — 무엇을 보일지는 visibleIds 가 스타일로 거른다.
   */
  useEffect(() => {
    const source = rawSourceRef.current
    if (!source) return
    const byId = featureByIdRef.current
    let touched = false
    const nextIds = new Set(props.points.map((p) => p.id))
    for (const [id, feature] of byId) {
      if (!nextIds.has(id)) {
        source.removeFeature(feature)
        byId.delete(id)
      }
    }
    const added: Feature[] = []
    for (const p of props.points) {
      const existing = byId.get(p.id)
      if (existing === undefined) {
        const f = new Feature({ geometry: new Point(fromLonLat([p.lng, p.lat])) })
        f.set('id', p.id)
        f.set('cp', p)
        byId.set(p.id, f)
        added.push(f)
        continue
      }
      // 재조회는 같은 값이라도 새 객체를 준다 — 참조가 다르면 값만 옮겨 싣고, 좌표는 달라졌을 때만 옮긴다.
      // 옮겨 싣기는 무음(silent)으로 — 점마다 변경 이벤트를 내면 재조회 한 번에 수천 번 울린다. 아래에서 한 번만 알린다.
      if (existing.get('cp') !== p) {
        existing.set('cp', p, true)
        touched = true
        const geometry = existing.getGeometry() as Point
        const [x, y] = fromLonLat([p.lng, p.lat])
        const [cx, cy] = geometry.getCoordinates()
        if (cx !== x || cy !== y) geometry.setCoordinates([x, y])
      }
    }
    if (added.length > 0) source.addFeatures(added)
    if (touched) source.changed()
  }, [props.points])

  // 선택/조사상태/테마/보이는 집합 변경 → 점 레이어 재스타일(스타일 자체는 캐시가 받는다)
  useEffect(() => {
    pointLayerRef.current?.changed()
  }, [props.selectedId, props.surveyMode, props.surveyedIds, props.lostIds, props.theme, props.visibleIds])

  /**
   * 테마 변경 → 배경지도 교체.
   * 소스만 갈아 끼우면 새 타일이 도착할 때까지 지도가 빈 바탕으로 남아, 판·글자는 이미 바뀌었는데 지도만 비는 중간 화면이 보인다.
   * 그래서 새 배경을 **옛 배경 아래**에 미리 깔아 두고(위의 불투명한 옛 타일이 가린다), 다 받은 뒤 옛 배경을 걷어 한 번에 드러낸다.
   */
  useEffect(() => {
    const map = mapRef.current
    const previous = baseLayerRef.current
    if (!map || !previous || previous.get('theme') === props.theme) return

    const source = makeBaseSource(props.theme)
    source.on('tileloadend', () => map.render())
    const next = new TileLayer({ source })
    next.set('theme', props.theme)
    map.getLayers().insertAt(Math.max(map.getLayers().getArray().indexOf(previous), 0), next)
    baseLayerRef.current = next

    let settled = false
    const reveal = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      map.un('rendercomplete', reveal)
      map.removeLayer(previous)
      map.render()
    }
    // 한 프레임을 다 그린 시점에 걷는다. 타일을 몇 번에 나눠 받아도 그 사이에 걷히지 않는다.
    map.once('rendercomplete', reveal)
    // 화면이 그려지지 않는 상황(다른 탭 등)까지 옛 배경을 두지 않도록 상한을 둔다
    const timer = window.setTimeout(reveal, 1500)

    return () => reveal()
  }, [props.theme])

  // 지적도 레이어 토글 (VWORLD_KEY 없으면 항상 off)
  useEffect(() => {
    cadastralRef.current?.setVisible(Boolean(VWORLD_KEY) && props.showCadastral)
  }, [props.showCadastral])

  // 선택된 점으로 이동 (부드러운 팬). 단, 목록 포커스(focusNonce 변화)로 인한 선택이면
  // 여기서 팬하지 않는다 → 아래 focusNonce 이펙트가 zoom+pan 담당(팬+줌 이중 애니메이션 충돌=버벅임 방지).
  useEffect(() => {
    if (!props.selectedId || !mapRef.current) return
    if (focusNonceRef.current !== lastFocusNonceRef.current) return
    const p = pointsRef.current.find((x) => x.id === props.selectedId)
    if (!p) return
    const view = mapRef.current.getView()
    const res = view.getResolution() ?? 0
    const [cx, cy] = fromLonLat([p.lng, p.lat])
    view.animate({ center: [cx - centerShift(leftInsetRef.current, rightInsetRef.current, res), cy], duration: 300 })
  }, [props.selectedId])

  // 목록에서 포커스 → 확대 + 이동 (단일 애니메이션). ref 갱신은 위 selectedId 이펙트보다 뒤에 실행됨.
  useEffect(() => {
    lastFocusNonceRef.current = props.focusNonce
    const selectedId = selectedIdRef.current
    if (props.focusNonce === 0 || !mapRef.current || !selectedId) return
    const p = pointsRef.current.find((x) => x.id === selectedId)
    if (!p) return
    const view = mapRef.current.getView()
    const [cx, cy] = fromLonLat([p.lng, p.lat])
    const res = view.getResolutionForZoom(FOCUS_ZOOM)
    view.animate({
      center: [cx - centerShift(leftInsetRef.current, rightInsetRef.current, res), cy],
      zoom: FOCUS_ZOOM,
      duration: 450,
    })
  }, [props.focusNonce])

  // 처음 자리로 되돌리기 — 고른 점은 그대로 두고 눈높이만 되돌린다. 판이 가린 만큼 옮겨 '보이는 자리' 한가운데 오게 한다.
  useEffect(() => {
    if (props.homeNonce === 0 || !mapRef.current) return
    const view = mapRef.current.getView()
    const [cx, cy] = fromLonLat(DEFAULT_CENTER)
    const res = view.getResolutionForZoom(DEFAULT_ZOOM)
    view.animate({
      center: [cx - centerShift(leftInsetRef.current, rightInsetRef.current, res), cy],
      zoom: DEFAULT_ZOOM,
      duration: 450,
    })
  }, [props.homeNonce])

  // 판 열림/닫힘으로 가림 폭이 바뀌면, 선택된 점을 새 '보이는 자리 중앙'으로 다시 이동
  // (닫으면 지도 전체 중앙으로, 열면 가려지지 않은 자리 중앙으로)
  useEffect(() => {
    const selectedId = selectedIdRef.current
    if (!selectedId || !mapRef.current) return
    const p = pointsRef.current.find((x) => x.id === selectedId)
    if (!p) return
    const view = mapRef.current.getView()
    const res = view.getResolution() ?? 0
    const [cx, cy] = fromLonLat([p.lng, p.lat])
    view.animate({ center: [cx - centerShift(props.leftInset, props.rightInset, res), cy], duration: 200 })
  }, [props.leftInset, props.rightInset])

  return <div ref={containerRef} className={`absolute inset-0 ${props.addMode ? 'cursor-crosshair' : ''}`} />
}
