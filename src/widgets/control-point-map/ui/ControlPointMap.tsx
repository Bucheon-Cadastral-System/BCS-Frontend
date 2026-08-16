import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import ImageLayer from 'ol/layer/Image'
import XYZ from 'ol/source/XYZ'
import OSM from 'ol/source/OSM'
import ImageWMS from 'ol/source/ImageWMS'
import TileState from 'ol/TileState'
import type Tile from 'ol/Tile'
import VectorLayer from 'ol/layer/Vector'
import WebGLVectorLayer from 'ol/layer/WebGLVector'
import type Layer from 'ol/layer/Layer'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat, toLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control/defaults'
import type { FeatureLike } from 'ol/Feature'
import { Style } from 'ol/style'
import type { FlatStyleLike } from 'ol/style/flat'
import { VWORLD_KEY, DEFAULT_CENTER, DEFAULT_ZOOM, MIN_ZOOM } from '@/shared/config/map'
import { MARKER_ATLAS_CELL, controlPointLabelStyle, controlPointStyle, markerAtlasUrl, markerSymbolIndex } from '@/entities/control-point'
import type { MappableControlPoint, MapTheme } from '@/entities/control-point'
import { deriveSurveyStatus } from '@/entities/survey-record'
import type { SurveyResult } from '@/entities/survey-record'
import { makeLocationStyle } from './locationStyle'

/** 이 줌부터 점 이름을 그린다. 더 멀리서는 라벨끼리 겹쳐 읽을 수 없어 도식만 남긴다. */
const LABEL_MIN_ZOOM = 16
/**
 * 위 줌에 해당하는 EPSG:3857 해상도(m/px). 스타일 함수는 줌이 아니라 해상도를 받는다.
 * 해상도는 줌이 커질수록 작아지므로 '이 값 이하'가 곧 '이 줌 이상'이고, 같을 때(정확히 줌 16)도 포함한다.
 */
const LABEL_MAX_RESOLUTION = 156543.03392804097 / 2 ** LABEL_MIN_ZOOM

/** 한 번의 측위를 포기하는 시간(ms) — 이보다 오래 답이 없으면 실패로 보고 다시 건다 */
const LOCATE_TIMEOUT_MS = 30_000
/**
 * 측위가 실패한 뒤 다시 걸기까지 기다리는 시간(ms). 연이어 실패하면 다음 칸으로 늘리고, 한 번 잡으면 처음으로 돌아간다.
 * 마지막 칸에 이르면 그 간격으로 계속 다시 건다 — 기기가 자리를 내주기 시작하는 시점은 화면이 알 수 없다.
 */
const LOCATE_RETRY_MS = [3_000, 6_000, 12_000, 30_000, 60_000]

/** 목록에서 점을 고를 때 맞추는 줌. 배경 타일 네이티브 최대(라이트 19·다크 18)와 같은 눈높이. */
const FOCUS_ZOOM = 19

/**
 * 두 손가락으로 튼 뒤 이만큼 안쪽이면 북쪽에 붙인다(라디안, 5°).
 *
 * <p>OL 이 주는 기본 스냅을 끄고 직접 건다. 기본 스냅은 회전값을 놓을 때마다 걸려, 방향 맞추기로 도는
 * 동안 북쪽 언저리에서 화면이 잠깐 붙들렸다가 튀어나간다. 붙이는 것은 사람이 직접 튼 손짓에만 필요하다.
 */
const SNAP_TO_NORTH = (5 * Math.PI) / 180

/**
 * 지도를 그리는 픽셀 배율의 상한.
 *
 * <p>회전은 매 프레임 지도 전체를 다시 그린다 — 그 값은 화면 픽셀 수에 정비례한다(측정: 배율 1 → 14fps,
 * 2 → 7, 3 → 5. 점을 다 빼도 같았다). 요즘 휴대폰은 배율이 3이라 CSS 픽셀의 아홉 배를 매 프레임 다시 그리는데,
 * 2 로 묶으면 그리는 픽셀이 절반 이하가 된다. 선과 글자가 아주 조금 부드러워지는 대신 도는 화면이 붙는다.
 */
const MAX_PIXEL_RATIO = 2

/**
 * 배경지도가 함께 받아 두는 저해상도(윗단계) 타일의 단계 수.
 *
 * <p>먼 곳으로 한 번에 옮기면 그 자리의 타일은 하나도 받아 둔 것이 없어, 다 도착할 때까지 지도가 빈 채로
 * 남는다(측정: 줌 19 로 이동에 타일 58장). 윗단계 타일은 한 장이 넓은 자리를 덮어 두세 장이면 화면이 차므로,
 * 먼저 도착한 그것으로 흐릿하게나마 지도를 세워 두고 제 단계 타일이 오는 대로 또렷해진다.
 */
const BASE_PRELOAD = 2

/**
 * 이보다 멀리 옮길 때는 날아가지 않고 곧장 앉는다(화면 폭의 배수).
 *
 * <p>OL 은 날아가는 동안 타일을 거의 받지 않는다 — 프레임을 지키려고 한 프레임에 두 장까지만 새로 걸고,
 * 프레임이 밀리면 아예 걸지 않는다. 그래서 먼 거리를 날아가면 다 도착한 뒤에야 받기 시작해, 그 시간만큼
 * 빈 화면이 길어진다. 지나가는 자리의 타일까지 받아 두는 것도 곧 버릴 짐이다.
 *
 * <p>가까운 거리는 그대로 날아간다. 눈이 따라갈 수 있는 거리에서는 어디서 어디로 옮겨 갔는지가 보여야 한다.
 */
const JUMP_AFTER_SCREENS = 3

/**
 * 이보다 크게 눈높이가 달라질 때도 곧장 앉는다(줌 단계).
 *
 * <p>거리가 가까워도 단계가 멀면 사정은 같다 — 지나치는 단계마다 그 단계의 타일을 새로 걸고, 도착지 타일은
 * 다 내려앉은 뒤에야 받기 시작한다.
 */
const JUMP_AFTER_ZOOMS = 3

/**
 * 한 번에 걸어 두는 타일 요청 수(OL 기본 16).
 *
 * <p>먼 곳으로 옮기면 화면 한 장에 서른 장 안팎이 필요하다. 요청을 적게 걸어 두면 왕복 시간이 그대로
 * 줄줄이 더해진다. HTTP/2 면 한 연결에 여러 요청이 함께 실리고, 아니어도 브라우저가 여섯으로 묶으므로
 * 이 값을 올린다고 그 이상 몰리지는 않는다.
 */
const MAX_TILES_LOADING = 24

/**
 * 타일 한 장을 다시 받아 보는 횟수와 그 사이의 기다림(ms, 시도마다 곱해 늘린다).
 *
 * <p>OL 은 실패한 타일을 다시 받지 않는다 — 캐시에 '실패'로 남아 그 자리를 다시 지나가도 요청하지 않는다.
 */
const TILE_RETRIES = 3
const TILE_RETRY_MS = 400

/**
 * 타일이 도착할 때 켜지는 시간(ms). 0 이면 바로 선다.
 *
 * <p>OL 기본값(0.25초)은 켜지는 동안 그 타일이 낀 화면을 계속 다시 그린다 — 한 화면 서른 장이면 그만큼의
 * 애니메이션이 프레임을 나눠 쓰고, 다 찬 것처럼 보이기까지도 그만큼 늦다.
 */
const TILE_FADE_MS = 0

/**
 * 실패한 타일을 다시 받아 오게 한다.
 *
 * <p>받는 중인 타일에는 손대지 않는다. OL 은 오류가 나면 그림을 1×1 빈 캔버스로 갈아 끼우는데(ImageTile),
 * 아직 살아 있는 요청을 밖에서 끊으면 그 교체가 새로 건 요청과 엇갈려 빈 타일이 그대로 굳는다.
 * 빈 타일은 '받아 둔 것'으로 쳐서 윗단계 타일로 덮이지도 않는다.
 *
 * @returns 시도를 다 쓴 타일을 한 번 더 걸어 보는 함수(지도를 움직일 때 부른다)
 */
function reviveTiles(source: XYZ): () => void {
  const tries = new WeakMap<Tile, number>()
  /** 세 번을 다 쓴 타일 — 다음 손짓에 한 번 더 해 본다. 너무 많이 쌓아 두지는 않는다 */
  let spent: Tile[] = []

  source.on('tileloaderror', (event) => {
    const tile = event.tile
    const count = (tries.get(tile) ?? 0) + 1
    tries.set(tile, count)
    if (count > TILE_RETRIES) {
      if (spent.length < 40) spent.push(tile)
      return
    }
    window.setTimeout(() => {
      // 그새 다른 길로 받아졌으면 그냥 둔다
      if (tile.getState() === TileState.ERROR) tile.load()
    }, TILE_RETRY_MS * count)
  })

  return () => {
    if (spent.length === 0) return
    const waiting = spent
    spent = []
    for (const tile of waiting) {
      tries.delete(tile)
      if (tile.getState() === TileState.ERROR) tile.load()
    }
  }
}

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
      ? new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/midnight/{z}/{y}/{x}.png`, maxZoom: 18, transition: TILE_FADE_MS })
      : new XYZ({ url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', attributions: '© OpenStreetMap, © CARTO', maxZoom: 20, transition: TILE_FADE_MS })
  }
  return VWORLD_KEY
    ? new XYZ({ url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png`, maxZoom: 19, transition: TILE_FADE_MS })
    : new OSM({ transition: TILE_FADE_MS })
}

/**
 * 방향 맞추기가 목표 각도를 따라잡는 데 걸리는 시간 상수(ms).
 *
 * <p>센서 값이 올 때마다 그 각도로 딱 놓으면 화면은 값이 온 순간에만 움직여 툭툭 끊긴다. 값은 목표로만 두고
 * 매 프레임 남은 각의 일부씩 좁히되, 좁히는 양을 프레임 간 시간차로 재 프레임이 밀려도 뒤처지지 않게 한다.
 * 따라붙지 못하고 남는 각은 대략 '도는 속도 × 이 시간'이다.
 */
const GLIDE_MS = 90

/**
 * 이보다 작은 어긋남은 맞춘 것으로 친다(라디안, 약 0.17°).
 *
 * <p>지자기 센서는 가만히 든 손에서도 1° 안팎을 떤다. 그 떨림까지 좇으면 서 있기만 해도 지도가 쉬지 않고
 * 다시 그려진다 — 배터리도 프레임도 거기서 샌다.
 */
const GLIDE_DONE = 0.003

/**
 * 도식은 WebGL 로 그린다 — 캔버스 벡터는 팬·줌 중 재실행(수천 drawImage×실행기 오버헤드)이 구조적 비용이라
 * 점이 떠 있는 동안 프레임을 상시 깎는다. WebGL 을 못 여는 환경(구형·가상 데스크톱)만 캔버스 경로로 그린다.
 */
const WEBGL_SUPPORTED = (() => {
  try {
    const probe = document.createElement('canvas')
    return probe.getContext('webgl2') !== null || probe.getContext('webgl') !== null
  } catch {
    return false
  }
})()

/**
 * 바라보는 쪽이 화면 위로 오도록 지도를 돌린다.
 *
 * <p>방위각은 북을 0 으로 시계방향으로 세고, 지도 회전은 그 반대다 — 동쪽(90°)을 보고 있으면 북쪽이 화면
 * 왼쪽으로 가야 하므로 지도를 반시계로 90° 돌린다.
 *
 * <p>한 바퀴를 넘어갈 때(359°→1°) 값이 껑충 뛰지 않게, 지금 각도에서 가장 가까운 같은 방향의 값을 고른다.
 * 그러지 않으면 되돌리기 애니메이션이 먼 길로 한 바퀴를 돌고, 회전값이 2π 근처에 머물러 '북쪽인데 틀어져 있다'가 된다.
 */
function rotationFor(headingDeg: number, current: number): number {
  const full = Math.PI * 2
  const raw = -(headingDeg * Math.PI) / 180
  return raw + Math.round((current - raw) / full) * full
}

/**
 * 고른 자리로 눈높이를 옮긴다 — 가까우면 날아가고, 멀면 곧장 앉는다.
 *
 * <p>어느 쪽이 나은지는 사람이 눈으로 따라갈 수 있는 거리인지가 가른다. 옆 골목이면 날아가는 편이
 * 어디서 어디로 옮겼는지를 알려 주고, 화면 몇 장 너머나 여섯 단계 위아래면 따라갈 수 있는 그림이 아니라
 * 그저 지도가 비어 있는 시간이 된다(JUMP_AFTER_SCREENS · JUMP_AFTER_ZOOMS).
 */
function travel(map: Map, center: [number, number], zoom: number) {
  const view = map.getView()
  const from = view.getCenter()
  const resolution = view.getResolution()
  const width = map.getSize()?.[0] ?? 0
  const span = resolution === undefined ? 0 : resolution * width
  const currentZoom = view.getZoom()
  const far = from === undefined || span === 0 || Math.hypot(center[0] - from[0], center[1] - from[1]) > span * JUMP_AFTER_SCREENS
  const steep = currentZoom === undefined || Math.abs(zoom - currentZoom) > JUMP_AFTER_ZOOMS
  if (far || steep) {
    view.setCenter(center)
    view.setZoom(zoom)
    return
  }
  view.animate({ center, zoom, duration: 450 })
}

interface ControlPointMapProps {
  /** 전체 기준점 — 소스는 이 목록을 한 번만 들고, 갱신 때는 바뀐 점만 손본다 */
  points: MappableControlPoint[]
  /** 보일 점 id — null 이면 전부. 탭·조사 전환은 소스 재구성이 아니라 이 집합의 교체다 */
  visibleIds: ReadonlySet<string> | null
  addMode: boolean
  showCadastral: boolean
  /** 법정동 경계를 얹을지 — 지적도와 같은 VWorld WMS 의 다른 레이어다 */
  showDistrict: boolean
  selectedId: string | null
  surveyMode: boolean
  /** 점 id별 조사 결과. 맵에 없으면 미조사 */
  resultById: ReadonlyMap<string, SurveyResult>
  theme: MapTheme
  focusNonce: number
  /** 처음 보던 자리로 되돌리라는 신호 — 값이 바뀔 때마다 한 번 움직인다(0 = 아직 누르지 않음) */
  homeNonce: number
  onAddPoint: (lng: number, lat: number) => void
  onSelect: (id: string | null) => void
  /** 만들어진 지도 인스턴스 — 하단 상태 표시처럼 매 프레임 값이 바뀌는 UI가 직접 구독하도록 넘긴다 */
  onMapReady?: (map: Map | null) => void
  onLocationError?: (message: string) => void
  /**
   * 기기가 향한 방위각(도, 진북 0° 시계방향). 읽을 수 없으면 null.
   *
   * <p>주면 현재 위치 표시의 원 밖에 화살촉이 붙어 그쪽을 가리킨다. 위성이 주는 진행 방향(coords.heading)
   * 보다 이 값을 앞세운다 — 걸음을 멈추면 진행 방향은 사라지지만 기기가 향한 쪽은 그대로 남는다.
   */
  compassHeading?: number | null
  /** 현재 위치를 화면 가운데에 붙들고 따라간다 */
  followLocation?: boolean
  /**
   * 바라보는 쪽을 화면 위로 — 방위각(compassHeading)만큼 지도를 돌려 준다.
   *
   * <p>따라가기와 함께 켠다. 걸으면서 보는 화면에서는 '북쪽이 위'보다 '내가 보는 쪽이 위'가 읽기 쉽다 —
   * 눈앞의 길과 화면의 길이 같은 방향으로 놓이기 때문이다.
   */
  headingUp?: boolean
  /** 따라가기가 끊겼다 — 사용자가 지도를 직접 끌면 그 손을 이긴 채로 따라갈 수 없다 */
  onFollowEnd?: () => void
}

export function ControlPointMap(props: ControlPointMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const rawSourceRef = useRef<VectorSource | null>(null)
  // 점 id → 피처 — 갱신을 통째 재구성이 아니라 diff 로 하기 위한 색인 (Map 이름은 ol/Map 이 차지해 globalThis 로 부른다)
  const featureByIdRef = useRef<globalThis.Map<string, Feature>>(new globalThis.Map())
  const pointLayerRef = useRef<Layer | null>(null)
  const labelLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const cadastralRef = useRef<ImageLayer<ImageWMS> | null>(null)
  const districtRef = useRef<ImageLayer<ImageWMS> | null>(null)
  const locationLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const locationFeatureRef = useRef<Feature | null>(null)
  const locationStyleRef = useRef<ReturnType<typeof makeLocationStyle> | null>(null)
  /**
   * 테마별 배경지도 두 벌.
   *
   * <p>바꿀 때마다 새로 만들면 받아 둔 타일까지 함께 버려져, 되돌아올 때 화면 한 장을 통째로 다시 받는다
   * (측정: 다크→라이트→다크에 12장씩 두 번). 둘을 만들어 두고 보이고 감추기만 하면 되돌아오는 길은 공짜다.
   * 감춰 둔 배경은 그리지도, 받지도 않는다.
   */
  const baseLayersRef = useRef<Record<MapTheme, TileLayer<XYZ>> | null>(null)
  const lastFocusNonceRef = useRef(props.focusNonce)

  // 지도는 1회만 생성 → 최신 props/콜백을 ref 로 유지
  const addModeRef = useRef(props.addMode)
  const onAddPointRef = useRef(props.onAddPoint)
  const onSelectRef = useRef(props.onSelect)
  const selectedIdRef = useRef(props.selectedId)
  const surveyModeRef = useRef(props.surveyMode)
  const resultByIdRef = useRef(props.resultById)
  const themeRef = useRef(props.theme)
  const visibleIdsRef = useRef(props.visibleIds)
  const pointsRef = useRef(props.points)
  const focusNonceRef = useRef(props.focusNonce)
  const showCadastralRef = useRef(props.showCadastral)
  const showDistrictRef = useRef(props.showDistrict)
  const onMapReadyRef = useRef(props.onMapReady)
  const onLocationErrorRef = useRef(props.onLocationError)
  const compassRef = useRef(props.compassHeading ?? undefined)
  const followRef = useRef(props.followLocation === true)
  const headingUpRef = useRef(props.headingUp === true)
  const onFollowEndRef = useRef(props.onFollowEnd)
  /** 마지막으로 받은 현재 위치(지도 좌표) — 따라가기를 켠 순간 바로 그 자리로 옮기려고 들고 있는다 */
  const lastPositionRef = useRef<[number, number] | null>(null)
  /**
   * 위성이 마지막으로 준 진행 방향(도) — 나침반을 끌 때 되돌아갈 자리다.
   *
   * <p>나침반이 꺼지는 순간 방향을 그냥 지우면 다음 측위가 올 때까지 화살촉이 사라진다. 걷는 중이면
   * 방향은 이미 알고 있던 값이라 그 사이를 비워 둘 이유가 없다.
   */
  const courseRef = useRef<number | undefined>(undefined)
  /**
   * 이번 방향 맞추기에서 한 번이라도 맞췄는지.
   *
   * <p>처음 한 번만 부드럽게 돌리고 그 뒤로는 그대로 놓는다 — 걸음마다 애니메이션을 걸면 남은 것과 새것이
   * 겹쳐 출렁이고, 반대로 처음까지 그냥 놓으면 켜는 순간 화면이 툭 튄다.
   */
  const facedUpRef = useRef(false)
  /**
   * 아직 한 번도 맞추지 못한 방향 맞추기가 남아 있다.
   *
   * <p>따라가기를 켜면 두 박자로 움직인다 — 먼저 내 자리로 옮기고, 앉은 뒤에 방향을 맞춘다. 자리와 방향이
   * 한꺼번에 움직이면 화면이 어디로 갔는지 읽히기 전에 이미 돌아 있어, 켠 사람에게는 '방향부터 돈다'로 보인다.
   *
   * <p>켤 때 자리도 방향도 모를 수 있어 이 빚은 여러 자리에서 갚는다 — 옮기기가 끝날 때, 첫 측위가 올 때,
   * 나침반의 첫 값이 올 때. 갚은 쪽이 이 표시를 내린다.
   */
  const pendingFaceUpRef = useRef(false)
  /**
   * 자리로 옮겨 가는 중이다.
   *
   * <p>그동안에는 나침반이 새 값을 줘도 돌리지 않는다. 옮기는 중에 끼어들면 자리 애니메이션과 회전이 겹쳐
   * 서로의 값을 덮어쓰고(OL 은 애니메이션 갈래마다 제 값을 매 프레임 적어 넣는다), 무엇보다 두 박자가 무너진다.
   */
  const movingRef = useRef(false)
  /** 따라가는 중인 목표 각도(라디안)와 그 프레임 걸이 — 나침반이 새 값을 주면 목표만 갈아 끼운다 */
  const targetRotationRef = useRef(0)
  const glideRef = useRef<number | undefined>(undefined)
  // 렌더 중 ref 대입은 순수하지 않음(버려지는 렌더가 미커밋 값을 남길 수 있음) → 커밋 후 effect에서 동기화.
  // OL 콜백/스타일은 커밋 뒤(비동기 상호작용·재렌더)에만 refs를 읽으므로, 이 effect를 먼저 선언해 항상 최신값을 보게 함.
  useEffect(() => {
    addModeRef.current = props.addMode
    onAddPointRef.current = props.onAddPoint
    onSelectRef.current = props.onSelect
    selectedIdRef.current = props.selectedId
    surveyModeRef.current = props.surveyMode
    resultByIdRef.current = props.resultById
    themeRef.current = props.theme
    visibleIdsRef.current = props.visibleIds
    pointsRef.current = props.points
    focusNonceRef.current = props.focusNonce
    showCadastralRef.current = props.showCadastral
    showDistrictRef.current = props.showDistrict
    onMapReadyRef.current = props.onMapReady
    onLocationErrorRef.current = props.onLocationError
    onFollowEndRef.current = props.onFollowEnd
  })

  /** 따라붙기를 멈춘다 — 지금 각도에 그대로 선다 */
  function stopGlide() {
    if (glideRef.current === undefined) return
    cancelAnimationFrame(glideRef.current)
    glideRef.current = undefined
  }

  /**
   * 바라보는 쪽으로 지도를 돌린다 — 목표를 놓고 매 프레임 그쪽으로 좁혀 간다.
   *
   * <p>방향을 아직 못 읽었으면 표시(pendingFaceUpRef)를 그대로 둔 채 물러난다. 나침반의 첫 값이 도착하는
   * 쪽이든 옮기기가 끝나는 쪽이든, 둘 다 갖춰지는 순간에 다시 불린다.
   *
   * <p>OL 의 애니메이션(view.animate)을 쓰지 않는다. 그것은 가운데를 놓기만 해도(setCenter) 취소되어서,
   * 따라가기가 걸음마다 자리를 놓는 이 화면에서는 돌다 만 각도에 자꾸 멈춘다. 프레임마다 직접 놓으면
   * 자리와 방향이 서로를 끊지 않는다.
   */
  function alignUp() {
    const heading = compassRef.current
    if (heading === undefined) return
    const view = mapRef.current?.getView()
    if (view === undefined) return
    pendingFaceUpRef.current = false
    facedUpRef.current = true
    targetRotationRef.current = rotationFor(heading, view.getRotation())
    if (glideRef.current !== undefined) return // 이미 따라붙는 중이다 — 목표만 갈아 끼웠다
    let last: number | undefined
    const step = (now: number) => {
      const current = mapRef.current?.getView()
      if (current === undefined) {
        glideRef.current = undefined
        return
      }
      // 지난 프레임과의 시간차로 좁힌다 — 프레임이 밀린 만큼 더 크게 좁혀야 뒤처지지 않는다.
      // 첫 프레임은 시간차를 알 수 없어 한 프레임(16ms)으로 친다
      const elapsed = last === undefined ? 16 : Math.min(now - last, 200)
      last = now
      const gap = targetRotationRef.current - current.getRotation()
      if (Math.abs(gap) < GLIDE_DONE) {
        current.setRotation(targetRotationRef.current)
        glideRef.current = undefined
        return
      }
      current.setRotation(current.getRotation() + gap * (1 - Math.exp(-elapsed / GLIDE_MS)))
      glideRef.current = requestAnimationFrame(step)
    }
    glideRef.current = requestAnimationFrame(step)
  }

  // 화면을 떠날 때 걸어 둔 프레임을 거둔다
  useEffect(() => stopGlide, [])

  /**
   * 바라보는 쪽을 화면 위로 세운다.
   *
   * <p>따라가기와 함께 켜졌으면 여기서는 돌리지 않는다 — 아래 따라가기가 자리부터 옮긴 뒤에 돌린다.
   *
   * <p>이 효과는 따라가기 효과보다 먼저 선다 — headingUpRef 를 세워 두어야 뒤이어 서는 따라가기가
   * 방향 맞추기를 함께 예약한다.
   */
  const headingUp = props.headingUp === true
  useEffect(() => {
    headingUpRef.current = headingUp
    if (!headingUp) {
      facedUpRef.current = false
      pendingFaceUpRef.current = false
      movingRef.current = false
      // 끄면 돌던 것을 그 자리에 세운다 — 마지막 목표까지 마저 돌고 멈추면 끈 뒤에 도는 화면이 된다
      stopGlide()
      return
    }
    if (props.followLocation === true || lastPositionRef.current === null) return
    alignUp()
  }, [headingUp, props.followLocation])

  /**
   * 따라가기 — 켜 두는 동안 현재 위치가 늘 화면 가운데에 온다.
   *
   * <p>켠 순간에는 이미 받아 둔 자리로 부드럽게 옮기고, **다 옮긴 뒤에** 방향을 맞춘다(두 박자).
   * 한 번에 돌리면 화면이 어디로 옮겨 갔는지 읽히기 전에 이미 돌아 있어, 켠 사람 눈에는 방향부터 도는 것으로 보인다.
   * 그 뒤로는 자리가 올 때마다 가운데를 그 값으로 놓는다 — 매번 애니메이션을 걸면 걸음마다 남은 것과 새것이 겹쳐 출렁인다.
   *
   * <p>아직 자리를 모르면 예약만 걸어 둔다. 첫 측위가 도착하는 쪽(mark)이 자리를 놓고 나서 이어 돌린다.
   */
  const following = props.followLocation === true
  useEffect(() => {
    followRef.current = following
    if (!following) return
    if (headingUpRef.current) pendingFaceUpRef.current = true
    const map = mapRef.current
    const position = lastPositionRef.current
    if (map === null || position === null) return
    movingRef.current = true
    // 옮기는 동안에는 돌리지 않는다 — 프레임마다 각도를 놓는 따라붙기가 자리 애니메이션을 취소한다
    stopGlide()
    map.getView().animate({ center: position, duration: 320 }, (done) => {
      movingRef.current = false
      // 끊겼으면(측위가 가운데를 다시 놓았다) 그쪽이 이어받는다 — 빚은 그대로 남겨 둔다.
      // 다 앉았는데 방향을 아직 못 읽었으면 alignUp 이 그냥 물러나고, 나침반의 첫 값이 그 빚을 갚는다
      if (done && pendingFaceUpRef.current && headingUpRef.current) alignUp()
    })
  }, [following])

  // 나침반이 도는 동안에는 자리를 다시 받지 않아도 화살촉만 돌아야 한다
  const compassHeading = props.compassHeading ?? undefined
  useEffect(() => {
    compassRef.current = compassHeading
    // 자리를 잡은 뒤에만, 그리고 자리로 옮기는 중이 아닐 때만 돌린다 — 아직 모르는 자리 위에서 방향만 도는
    // 화면은 방향을 알리지 못하고, 옮기는 중에 끼어들면 자리 애니메이션과 회전이 서로의 값을 덮어쓴다.
    // 옮기는 중이라면 그쪽이 다 앉은 뒤에 이 값(compassRef)으로 돌린다
    if (
      compassHeading !== undefined
      && headingUpRef.current
      && !movingRef.current
      && lastPositionRef.current !== null
    ) {
      alignUp()
    }
    const feature = locationFeatureRef.current
    if (feature === null || feature.getGeometry() === undefined) return
    if (compassHeading === undefined) {
      // 나침반을 껐다 — 위성이 준 마지막 진행 방향으로 돌아간다. 그 값도 없으면 화살촉 없이 원만 선다
      feature.set('heading', courseRef.current)
      return
    }
    feature.set('heading', compassHeading)
  }, [compassHeading])

  // 초기화 (마운트 시 1회)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    /** 실패·정체된 타일을 다시 걸어 보는 함수들(테마별 소스마다 하나) */
    const sweeps: (() => void)[] = []
    const makeBaseLayer = (theme: MapTheme) => {
      const source = makeBaseSource(theme)
      sweeps.push(reviveTiles(source))
      const layer = new TileLayer({ source, preload: BASE_PRELOAD, visible: theme === themeRef.current })
      layer.set('theme', theme)
      return layer
    }
    const baseLayers: Record<MapTheme, TileLayer<XYZ>> = { dark: makeBaseLayer('dark'), light: makeBaseLayer('light') }
    baseLayersRef.current = baseLayers
    // 지금 쓰는 배경이 아래, 감춰 둔 배경이 그 위 — 바꿀 때 새 배경을 옛 배경 아래로 내려 깐다
    const baseLayer = baseLayers[themeRef.current]
    const spareLayer = baseLayers[themeRef.current === 'dark' ? 'light' : 'dark']

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

    // 법정동 경계 — 지적도와 같은 WMS·같은 키다. 지번을 부여하는 단위가 법정동이라
    // 지적공부의 토지 소재도, 기준점성과표의 소재지도 이 구역으로 적힌다(행정동은 지적 법령에 나오지 않는다).
    //
    // ★ 스타일은 기본값만 쓴다. SLD_BODY 로 선 색과 동 이름을 실어 보내면 VWorld 가 레이어를 통째로 비워 돌려준다.
    const districtSource = new ImageWMS({
      url: 'https://api.vworld.kr/req/wms',
      ratio: 1,
      params: {
        KEY: VWORLD_KEY,
        DOMAIN: window.location.hostname,
        LAYERS: 'lt_c_ademd',
        STYLES: 'lt_c_ademd',
        FORMAT: 'image/png',
        TRANSPARENT: true,
      },
    })
    const districtLayer = new ImageLayer({ visible: Boolean(VWORLD_KEY) && showDistrictRef.current, source: districtSource })
    districtRef.current = districtLayer

    const rawSource = new VectorSource()
    rawSourceRef.current = rawSource

    // 현재 위치는 기준점과 독립된 레이어로 관리해 기준점 필터·선택·조사 상태의 영향을 받지 않게 한다.
    // 도식은 locationStyle 이 맡는다 — 테마마다 값이 달라 스타일 함수째 ref 에 두고 갈아 끼운다.
    const locationSource = new VectorSource()
    const locationFeature = new Feature()
    locationSource.addFeature(locationFeature)
    locationFeatureRef.current = locationFeature
    locationStyleRef.current = makeLocationStyle(container)
    const locationLayer = new VectorLayer({
      source: locationSource,
      style: (feature) => locationStyleRef.current?.(feature),
    })
    locationLayerRef.current = locationLayer

    // 점은 겹치더라도 하나씩 그대로 그린다. 이름은 가까이서 볼 때만 붙인다.
    // 소스는 전체 점을 들고 있고, 숨길 점은 스타일을 돌려주지 않아 그리기·클릭 판정에서 함께 빠진다.
    const layerStyle = (feature: FeatureLike): Style | undefined => {
      const cp = feature.get('cp') as MappableControlPoint
      const visible = visibleIdsRef.current
      if (visible !== null && !visible.has(cp.id)) return undefined
      const survey = surveyModeRef.current
        ? deriveSurveyStatus(resultByIdRef.current.get(cp.id))
        : 'none'
      return controlPointStyle(cp, cp.id === selectedIdRef.current, survey, themeRef.current)
    }

    // 라벨은 가까이서만, 보이는 점에만 붙인다
    const labelStyle = (feature: FeatureLike, resolution: number): Style | undefined => {
      if (resolution > LABEL_MAX_RESOLUTION) return undefined
      const cp = feature.get('cp') as MappableControlPoint
      const visible = visibleIdsRef.current
      if (visible !== null && !visible.has(cp.id)) return undefined
      return controlPointLabelStyle(cp, themeRef.current)
    }

    // 라벨은 캔버스 레이어 — 줌 16 미만·비표시 점은 그릴 것이 없다.
    // 겹침 걸러내기(declutter)는 쓰지 않는다: 밀집 구간에서 라벨이 조용히 사라져 어느 점인지 클릭 없이 알 수 없게 되고,
    // 라벨은 줌 16 이상에서만 그려져 화면에 설 글자 수가 적어 겹침보다 누락이 실무에 더 해롭다
    const labelLayer = new VectorLayer({ source: rawSource, style: labelStyle })
    labelLayerRef.current = labelLayer

    // WebGL 을 못 여는 환경만 도식을 캔버스로 그린다 — 그리는 내용은 같고 빠르기만 다르다
    const canvasPointLayer = WEBGL_SUPPORTED ? null : new VectorLayer({ source: rawSource, style: layerStyle })
    if (canvasPointLayer !== null) pointLayerRef.current = canvasPointLayer

    const map = new Map({
      target: container,
      pixelRatio: Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO),
      maxTilesLoading: MAX_TILES_LOADING,
      controls: defaultControls(), // 축척은 비율과 한 칩에 묶으려고 map-status-bar 가 직접 붙인다
      layers: canvasPointLayer !== null
        ? [baseLayer, spareLayer, cadastralLayer, districtLayer, canvasPointLayer, labelLayer, locationLayer]
        : [baseLayer, spareLayer, cadastralLayer, districtLayer, labelLayer, locationLayer],
      // maxZoom 20: 배경 타일 네이티브 최대(라이트 19·다크 18)를 크게 넘기면 확대 보정으로 흐려진다
      // minZoom: 부천 밖으로 한없이 물러서지 않게 막는다(shared/config/map)
      // constrainRotation: 북쪽 스냅은 아래에서 직접 건다 — 기본값(true)은 회전값을 놓을 때마다 걸려
      // 방향 맞추기가 북쪽 언저리를 지날 때 화면을 붙들었다 놓는다
      view: new View({ center: fromLonLat(DEFAULT_CENTER), zoom: DEFAULT_ZOOM, minZoom: MIN_ZOOM, maxZoom: 20, constrainRotation: false }),
    })
    mapRef.current = map
    onMapReadyRef.current?.(map)

    /*
     * 북쪽 붙이기 — 사람이 직접 튼 손짓에만 건다.
     *
     * 두 손가락으로 조금 튼 뒤 놓으면 북쪽으로 정확히 맞춰 주는 편이 낫다. 손으로 5° 안쪽을 맞출 수는 없고,
     * 어중간하게 틀어진 지도는 읽는 내내 눈이 기운다. 반대로 방향 맞추기로 도는 동안에는 걸면 안 된다 —
     * 북쪽을 지날 때마다 화면이 잠깐 붙들렸다가 튀어나간다.
     *
     * 이번 움직임에 회전이 있었을 때만 본다. 그냥 밀거나 확대한 움직임까지 보면, 사용자가 일부러 조금
     * 틀어 둔 지도가 미는 것만으로 북쪽에 붙어 버린다.
     */
    let rotationAtStart = map.getView().getRotation()
    map.on('movestart', () => {
      rotationAtStart = map.getView().getRotation()
    })
    // 지도를 움직일 때마다, 포기해 둔 타일을 한 번씩 더 걸어 본다(reviveTiles)
    map.on('moveend', () => {
      for (const sweep of sweeps) sweep()
    })
    map.on('moveend', () => {
      if (headingUpRef.current) return
      const view = map.getView()
      const rotation = view.getRotation()
      if (rotation === rotationAtStart) return
      const full = Math.PI * 2
      const north = Math.round(rotation / full) * full
      if (rotation === north || Math.abs(rotation - north) > SNAP_TO_NORTH) return
      view.animate({ rotation: north, duration: 160 })
    })

    if (WEBGL_SUPPORTED) {
      // 아틀라스는 이미지 로드가 비동기라, 지도를 먼저 세우고 도식 레이어를 뒤따라 얹는다(라벨 레이어 아래 자리).
      // 어느 단계든 실패하면 캔버스 레이어로 대신 그린다 — 점이 조용히 사라진 화면을 남기지 않는다.
      //
      // 자리는 법정동 경계 바로 위다. 숫자로 박아 두면 아래 겹이 하나 늘 때마다 점이 그 겹 밑으로 내려간다.
      const pointLayerIndex = () => map.getLayers().getArray().indexOf(districtLayer) + 1
      const mountCanvasFallback = () => {
        if (mapRef.current !== map || pointLayerRef.current !== null) return
        const layer = new VectorLayer({ source: rawSource, style: layerStyle })
        map.getLayers().insertAt(pointLayerIndex(), layer)
        pointLayerRef.current = layer
      }
      markerAtlasUrl()
        .then((url) => {
          if (mapRef.current !== map) return // 그 사이 지도가 내려갔다
          const style: FlatStyleLike = [
            {
              // 숨긴 점은 그리기·클릭 판정에서 함께 빠진다 — 캔버스 경로의 '스타일 미반환'과 같은 역할
              filter: ['==', ['get', 'hidden'], 0],
              style: {
                'icon-src': url,
                'icon-size': [MARKER_ATLAS_CELL, MARKER_ATLAS_CELL],
                // 배열 값 표현식은 ['array', ...] 연산자로 만든다 — 리터럴 배열에 표현식을 끼우면 파서가 거부한다
                'icon-offset': ['array', ['*', ['get', 'sym'], MARKER_ATLAS_CELL], 0],
                'icon-offset-origin': 'top-left',
              },
            },
          ]
          const webglLayer = new WebGLVectorLayer({ source: rawSource, style })
          map.getLayers().insertAt(pointLayerIndex(), webglLayer)
          pointLayerRef.current = webglLayer
        })
        .catch((e: unknown) => {
          console.error('기준점 WebGL 레이어를 세우지 못해 캔버스로 그립니다.', e)
          mountCanvasFallback()
        })
    }

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
    // 배경은 두 벌이라 둘 다에 건다 — 감춰 둔 쪽은 타일을 받지 않으므로 값이 오지도 않는다
    for (const layer of Object.values(baseLayers)) layer.getSource()?.on('tileloadend', rerender)
    cadastralSource.on('imageloadend', rerender)


    // 컨테이너 크기 변화(배너 토글·창 리사이즈·레이아웃) → OL 크기가 stale 되면 타일이 잘못 렌더됨(네모난 잔상).
    // 감지해서 updateSize 로 뷰포트 재계산 + 재렌더.
    const resizeObserver = new ResizeObserver(() => map.updateSize())
    resizeObserver.observe(container)

    // 지도를 손으로 끄는 순간 따라가기를 놓는다 — 사용자가 옮긴 자리를 다음 측위가 도로 끌어가면
    // 화면이 손과 싸우는 것처럼 보인다. 다시 따라가려면 버튼을 한 번 더 누른다
    map.on('pointerdrag', () => {
      if (followRef.current) onFollowEndRef.current?.()
    })

    map.on('click', (evt) => {
      if (addModeRef.current) {
        const [lng, lat] = toLonLat(evt.coordinate)
        onAddPointRef.current(lng, lat)
        return
      }
      // 점이 겹친 자리에서는 OL 이 위에 그려진 것 하나만 준다 — 겹친 나머지는 기준점 목록에서 찾는다
      let handled = false
      map.forEachFeatureAtPixel(evt.pixel, (f) => {
        const cp = f.get('cp') as MappableControlPoint | undefined
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
      for (const layer of Object.values(baseLayers)) layer.getSource()?.un('tileloadend', rerender)
      cadastralSource.un('imageloadend', rerender)
      resizeObserver.disconnect()
      map.setTarget(undefined)
      onMapReadyRef.current?.(null)
      mapRef.current = null
      rawSourceRef.current = null
      featureByIdRef.current = new globalThis.Map()
      pointLayerRef.current = null
      labelLayerRef.current = null
      cadastralRef.current = null
      districtRef.current = null
      locationLayerRef.current = null
      locationFeatureRef.current = null
      locationStyleRef.current = null
      baseLayersRef.current = null
    }
  }, [])

  /** 이 점의 아틀라스 칸 — WebGL 레이어는 피처 속성이 곧 스타일 입력이다(캔버스 폴백은 스타일 함수가 refs 를 읽는다). */
  const symOf = (cp: MappableControlPoint): number =>
    markerSymbolIndex(
      cp.type,
      cp.id === selectedIdRef.current,
      surveyModeRef.current ? deriveSurveyStatus(resultByIdRef.current.get(cp.id)) : 'none',
      themeRef.current,
    )

  const hiddenOf = (id: string): number => {
    const visible = visibleIdsRef.current
    return visible !== null && !visible.has(id) ? 1 : 0
  }

  /**
   * points 변경 → 소스 diff 갱신.
   * 통째로 부수고 다시 만들면(clear+add) 재조회 때마다 수천 피처 생성·색인 재구축이 한 프레임에 몰린다.
   * 탭·조사 전환은 여기 오지 않는다 — 무엇을 보일지는 hidden 속성(WebGL)·스타일 미반환(캔버스)이 거른다.
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
        f.set('sym', symOf(p))
        f.set('hidden', hiddenOf(p.id))
        byId.set(p.id, f)
        added.push(f)
        continue
      }
      // 재조회는 같은 값이라도 새 객체를 준다 — 참조가 다르면 값만 옮겨 싣고, 좌표는 달라졌을 때만 옮긴다.
      // 옮겨 싣기는 무음(silent)으로 — 점마다 변경 이벤트를 내면 재조회 한 번에 수천 번 울린다. 아래에서 한 번만 알린다.
      if (existing.get('cp') !== p) {
        existing.set('cp', p, true)
        existing.set('sym', symOf(p), true)
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

  // 선택/조사상태/테마 변경 → 칸 번호(sym) 재계산. 값이 실제로 바뀐 점만 알린다 — 선택 전환은 두 점, 테마 전환은 전부다.
  useEffect(() => {
    let touched = false
    for (const feature of featureByIdRef.current.values()) {
      const next = symOf(feature.get('cp') as MappableControlPoint)
      if (feature.get('sym') !== next) {
        feature.set('sym', next, true)
        touched = true
      }
    }
    if (touched) rawSourceRef.current?.changed()
    pointLayerRef.current?.changed()
    labelLayerRef.current?.changed()
    // 현재 위치 도식도 토큰 값을 박아 둔 객체라 테마가 바뀌면 새로 만든다.
    // 테마 클래스는 이 요소의 조상에 붙으므로, 클래스가 갈린 뒤인 여기서 다시 읽어야 새 테마 값이 잡힌다
    const container = containerRef.current
    if (container !== null) {
      locationStyleRef.current = makeLocationStyle(container)
      locationLayerRef.current?.changed()
    }
  }, [props.selectedId, props.surveyMode, props.resultById, props.theme])

  // 보이는 집합 변경 → hidden 속성 갱신(탭·조사 전환이 소스 재구성 없이 여기서 끝난다)
  useEffect(() => {
    let touched = false
    for (const feature of featureByIdRef.current.values()) {
      const next = hiddenOf(feature.get('id') as string)
      if (feature.get('hidden') !== next) {
        feature.set('hidden', next, true)
        touched = true
      }
    }
    if (touched) rawSourceRef.current?.changed()
    pointLayerRef.current?.changed()
    labelLayerRef.current?.changed()
  }, [props.visibleIds])

  /**
   * 테마 변경 → 배경지도 교체.
   *
   * <p>보이는 배경을 그냥 바꾸면 새 타일이 도착할 때까지 지도가 빈 바탕으로 남아, 패널·글자는 이미 바뀌었는데
   * 지도만 비는 중간 화면이 보인다. 그래서 새 배경을 **옛 배경 아래**에 깔아 두고(위의 불투명한 옛 타일이 가린다),
   * 다 받은 뒤 옛 배경을 감춰 한 번에 드러낸다.
   *
   * <p>두 배경은 처음에 함께 만들어 두고 보이고 감추기만 한다 — 새로 만들면 받아 둔 타일이 함께 버려져
   * 되돌아올 때 화면 한 장을 통째로 다시 받는다.
   */
  useEffect(() => {
    const map = mapRef.current
    const layers = baseLayersRef.current
    if (!map || layers === null) return
    const next = layers[props.theme]
    const previous = layers[props.theme === 'dark' ? 'light' : 'dark']
    if (next.getVisible() && !previous.getVisible()) return

    // 새 배경을 맨 아래로 내려 옛 배경이 그 위를 덮게 한다
    const collection = map.getLayers()
    collection.remove(next)
    collection.insertAt(0, next)
    next.setVisible(true)

    let settled = false
    const reveal = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      map.un('rendercomplete', reveal)
      previous.setVisible(false)
      map.render()
    }
    // 한 프레임을 다 그린 시점에 걷는다. 타일을 몇 번에 나눠 받아도 그 사이에 걷히지 않는다.
    map.once('rendercomplete', reveal)
    // 화면이 그려지지 않는 상황(다른 탭 등)까지 옛 배경을 두지 않도록 상한을 둔다
    const timer = window.setTimeout(reveal, 1500)

    return () => reveal()
  }, [props.theme])

  // 지적도·법정동 경계 레이어 토글 (VWORLD_KEY 없으면 항상 off)
  useEffect(() => {
    cadastralRef.current?.setVisible(Boolean(VWORLD_KEY) && props.showCadastral)
  }, [props.showCadastral])

  useEffect(() => {
    districtRef.current?.setVisible(Boolean(VWORLD_KEY) && props.showDistrict)
  }, [props.showDistrict])

  /**
   * 현재 위치 — 화면이 서 있는 동안 늘 따라간다.
   *
   * <p>자리를 못 잡는다는 답(POSITION_UNAVAILABLE)은 끝이 아니라 한 번의 실패다. 애플은 이 오류를
   * 「지금은 못 구했다」는 뜻으로 규정하고 다음 값을 기다리라고 적어 두었는데, 브라우저는 그 뒤로 감시에
   * 값을 더 실어 주지 않는 경우가 있다. 그래서 실패하면 감시를 끊고 간격을 늘려 가며 계속 다시 건다.
   * 안내로 갈음하지 않는다 — 다시 걸지 않으면 그 화면에서는 위치가 영영 오지 않는다.
   *
   * <p>정밀 측위는 위성을 받는 기기에서만 건다. 맥·PC 는 무선 신호로만 자리를 잡아, 정밀을 요구하면
   * CoreLocation 이 kCLErrorLocationUnknown 으로 돌려주고 마는 일이 잦다. 손가락으로 짚는 기기에서만
   * 정밀을 켜고 나머지는 대략 측위로 받는다 — 지도에서 필요한 정확도는 어차피 그 이상이 아니다.
   *
   * <p>알리는 자리는 둘이다. 권한 거부는 즉시 알린다(사용자가 풀지 않으면 영영 오지 않는다).
   * 나머지는 처음부터 한 번도 못 잡은 채 재시도가 다 밀린 뒤에만 한 번 알리고, 그동안에도 다시 걸기는 멈추지 않는다.
   * 한 번이라도 자리를 잡았으면 지도에 점이 남아 있으므로 알리지 않는다.
   *
   * <p>다른 탭에 다녀오거나 권한이 허용으로 바뀌면 감시를 다시 건다. 잠들었다 깨어난 감시는 값을 더 내주지
   * 않는 브라우저가 있어, 그대로 두면 자리가 옛날 자리에 멈춘다. 거부도 여기서 풀린다 — 설정에서 허용으로
   * 되돌린 사람이 새로고침을 해야만 위치가 돌아오는 것은 화면이 그 상태를 굳혀 둔 탓이다.
   * 다시 걸기 전에 권한이 이미 허용인지 확인한다. 확인 없이 부르면 아직 정하지 않은 사람에게
   * 탭을 옮길 때마다 권한 창을 띄우게 된다.
   *
   * <p>사유 상수는 오류 객체에서 읽는다. 전역 `GeolocationPositionError` 를 참조하면 그 이름을 내주지 않는
   * 브라우저에서 콜백이 그 줄에서 멈춰 안내도 표시도 나오지 않는다.
   */
  useEffect(() => {
    const feature = locationFeatureRef.current
    if (feature === null) return
    const geolocation = navigator.geolocation
    if (!geolocation) {
      onLocationErrorRef.current?.('이 브라우저에서는 현재 위치를 사용할 수 없습니다.')
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: window.matchMedia('(pointer: coarse)').matches,
      maximumAge: 5_000,
      timeout: LOCATE_TIMEOUT_MS,
    }
    // 거부는 화면을 떠난 것과 구별해 둔다 — 허용으로 바뀌면 아래 resume 이 되살린다
    let denied = false
    let released = false
    let located = false
    let told = false
    let fails = 0
    let permission: PermissionStatus | null = null
    let watchId: number | undefined
    let retryId: number | undefined

    const drop = () => {
      if (watchId === undefined) return
      geolocation.clearWatch(watchId)
      watchId = undefined
    }
    const mark = ({ coords }: GeolocationPosition) => {
      const position = fromLonLat([coords.longitude, coords.latitude]) as [number, number]
      feature.setGeometry(new Point(position))
      lastPositionRef.current = position
      const view = followRef.current ? mapRef.current?.getView() : undefined
      if (view !== undefined) {
        view.setCenter(position)
        // 자리에 앉았다 — 미뤄 둔 방향 맞추기가 있으면 이제 돈다. 자리가 먼저, 방향이 나중이다.
        // (이 setCenter 가 켤 때의 옮기기를 끊었어도 마찬가지다. 끊겼다는 것은 이미 자리에 왔다는 뜻이다)
        if (pendingFaceUpRef.current && headingUpRef.current) alignUp()
      }
      const heading = coords.heading
      const moving = heading !== null && Number.isFinite(heading) ? heading : undefined
      // 서 있으면 위성은 방향을 주지 않는다 — 그때는 마지막으로 걷던 방향을 지우지 않고 그대로 둔다
      if (moving !== undefined) courseRef.current = moving
      feature.set('heading', compassRef.current ?? courseRef.current)
      located = true
      fails = 0
    }
    const fail = (error: GeolocationPositionError) => {
      if (released) return
      if (error.code === error.PERMISSION_DENIED) {
        denied = true
        drop()
        window.clearTimeout(retryId)
        onLocationErrorRef.current?.('위치 권한이 거부되어 현재 위치를 표시할 수 없습니다.')
        return
      }
      fails += 1
      if (!located && !told && fails >= LOCATE_RETRY_MS.length) {
        told = true
        onLocationErrorRef.current?.('기기가 현재 위치를 내주지 않습니다. 위치 서비스와 Wi-Fi 를 확인해 주세요.')
      }
      drop()
      retryId = window.setTimeout(start, LOCATE_RETRY_MS[Math.min(fails - 1, LOCATE_RETRY_MS.length - 1)])
    }
    const start = () => {
      if (released || denied || watchId !== undefined) return
      // 캐시된 값이라도 먼저 찍는다 — 새 측위를 기다리는 동안 자리를 비워 두지 않는다
      if (!located) {
        geolocation.getCurrentPosition(mark, () => undefined, { enableHighAccuracy: false, maximumAge: 600_000, timeout: 10_000 })
      }
      watchId = geolocation.watchPosition(mark, fail, options)
    }
    const resume = () => {
      if (released || document.visibilityState !== 'visible') return
      void navigator.permissions
        ?.query({ name: 'geolocation' })
        .then((status) => {
          if (released || status.state !== 'granted' || document.visibilityState !== 'visible') return
          denied = false
          window.clearTimeout(retryId)
          drop()
          start()
        })
        .catch(() => undefined)
    }

    start()
    document.addEventListener('visibilitychange', resume)
    // 권한은 이 화면 밖에서도 바뀐다 — 브라우저가 알려 주면 탭을 옮기지 않아도 그 자리에서 되살린다
    void navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((status) => {
        if (released) return
        permission = status
        status.addEventListener('change', resume)
      })
      .catch(() => undefined)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', resume)
      permission?.removeEventListener('change', resume)
      window.clearTimeout(retryId)
      drop()
    }
  }, [])

  // 선택된 점으로 이동 (부드러운 팬). 단, 목록 포커스(focusNonce 변화)로 인한 선택이면
  // 여기서 팬하지 않는다 → 아래 focusNonce 이펙트가 zoom+pan 담당(팬+줌 이중 애니메이션 충돌=버벅임 방지).
  useEffect(() => {
    if (!props.selectedId || !mapRef.current) return
    if (focusNonceRef.current !== lastFocusNonceRef.current) return
    const p = pointsRef.current.find((x) => x.id === props.selectedId)
    if (!p) return
    const view = mapRef.current.getView()
    const [cx, cy] = fromLonLat([p.lng, p.lat])
    // 언제나 화면 정중앙 — 패널·카드가 가린 폭을 빼는 보정은 두지 않는다(선택하면 카드가 늘 함께 떠 보정이 오히려 쏠림으로 보인다)
    view.animate({ center: [cx, cy], duration: 300 })
  }, [props.selectedId])

  // 목록에서 포커스 → 확대 + 이동 (단일 애니메이션). ref 갱신은 위 selectedId 이펙트보다 뒤에 실행됨.
  useEffect(() => {
    lastFocusNonceRef.current = props.focusNonce
    const selectedId = selectedIdRef.current
    if (props.focusNonce === 0 || !mapRef.current || !selectedId) return
    const p = pointsRef.current.find((x) => x.id === selectedId)
    if (!p) return
    // 멀거나 눈높이가 크게 달라지면 날아가지 않고 곧장 앉는다 — 날아가는 동안에는 타일을 거의 받지 못해
    // 도착하고 나서야 받기 시작한다(그만큼 빈 화면이 길어진다)
    travel(mapRef.current, fromLonLat([p.lng, p.lat]) as [number, number], FOCUS_ZOOM)
  }, [props.focusNonce])

  /**
   * 위치 초기화 — 고른 점은 그대로 두고 눈높이만 옮긴다.
   *
   * <p>현재 위치를 잡았으면 그 자리로 간다. 현장에서 누르는 사람이 찾는 자리는 부천 한가운데가 아니라 자기 자리다.
   * 아직 못 잡았으면 처음 보던 자리로 되돌린다.
   */
  useEffect(() => {
    if (props.homeNonce === 0 || !mapRef.current) return
    const here = locationFeatureRef.current?.getGeometry()
    if (here instanceof Point) {
      travel(mapRef.current, here.getCoordinates() as [number, number], FOCUS_ZOOM)
      return
    }
    travel(mapRef.current, fromLonLat(DEFAULT_CENTER) as [number, number], DEFAULT_ZOOM)
  }, [props.homeNonce])

  return <div ref={containerRef} className={`absolute inset-0 ${props.addMode ? 'cursor-crosshair' : ''}`} />
}
