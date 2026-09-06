import assert from 'node:assert/strict'
import test from 'node:test'
import { getAuthLandingPath } from '../src/app/authLanding.ts'

test('회원 정보 입력 전이면 메인 창의 회원가입 화면으로 이동한다', () => {
  assert.equal(getAuthLandingPath({ status: 'PENDING', profileCompleted: false }), '/signup')
})

test('회원 정보 입력을 마친 승인 대기 회원이면 대기 화면으로 이동한다', () => {
  assert.equal(getAuthLandingPath({ status: 'PENDING', profileCompleted: true }), '/waiting')
})

test('활성 회원이면 메인 화면으로 이동한다', () => {
  assert.equal(getAuthLandingPath({ status: 'ACTIVE', profileCompleted: true }), '/')
})

test('비활성 회원은 프로필 입력 여부와 관계없이 비활성 안내로 이동한다', () => {
  assert.equal(getAuthLandingPath({ status: 'INACTIVE', profileCompleted: false }), '/login?error=inactive')
})
