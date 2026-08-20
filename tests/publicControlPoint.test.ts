import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PUBLIC_CONTROL_POINTS_PATH,
  publicControlPointPath,
  toPublicControlPoint,
} from '../src/entities/control-point/model/publicControlPoint.ts'

test('공개 기준점 응답은 게스트 허용 필드만 담는다', () => {
  const point = toPublicControlPoint({
    id: 1,
    pointNo: '41192D000001265',
    type: 'DOGEUN',
    name: '1465공',
    crs: 'GRS80_CENTRAL',
    northing: 545050.3812,
    easting: 183771.4437,
    longitude: 126.794623,
    latitude: 37.506423,
  })

  assert.deepEqual(point, {
    id: '1',
    pointNo: '41192D000001265',
    type: '지적도근점',
    name: '1465공',
    tmEpsg: 'EPSG:5186',
    northing: 545050.3812,
    easting: 183771.4437,
    lng: 126.794623,
    lat: 37.506423,
  })
  assert.equal('address' in point, false)
  assert.equal('regionName' in point, false)
  assert.equal('version' in point, false)
  assert.equal('installedDate' in point, false)
  assert.equal('lastSurvey' in point, false)
  assert.equal('project' in point, false)
  assert.equal('images' in point, false)
})

test('게스트 API는 공개 목록과 관리번호 상세 경로만 만든다', () => {
  assert.equal(PUBLIC_CONTROL_POINTS_PATH, '/api/control-points/public')
  assert.equal(publicControlPointPath('41192D/1'), '/api/control-points/public/41192D%2F1')
})
