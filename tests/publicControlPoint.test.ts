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
    longitude: 126.794623,
    latitude: 37.506423,
    regionCode: '10300',
    regionName: '춘의동',
    address: '경기도 부천시 춘의동 102-16',
  })

  assert.deepEqual(point, {
    id: '1',
    pointNo: '41192D000001265',
    type: '지적도근점',
    name: '1465공',
    lng: 126.794623,
    lat: 37.506423,
    regionCode: '10300',
    regionName: '춘의동',
    address: '경기도 부천시 춘의동 102-16',
  })
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
