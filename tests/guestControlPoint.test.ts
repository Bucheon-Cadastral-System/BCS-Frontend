import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PUBLIC_CONTROL_POINTS_PATH,
  publicControlPointPath,
  toGuestControlPoint,
} from '../src/pages/guest-map/model/guestControlPoint.ts'

test('공개 기준점 응답은 게스트 필드만 모델에 담는다', () => {
  const point = toGuestControlPoint({
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
})

test('게스트 API는 공개 목록과 관리번호 상세 경로만 만든다', () => {
  assert.equal(PUBLIC_CONTROL_POINTS_PATH, '/api/control-points/public')
  assert.equal(publicControlPointPath('41192D/1'), '/api/control-points/public/41192D%2F1')
})
