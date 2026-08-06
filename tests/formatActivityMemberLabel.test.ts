import assert from 'node:assert/strict'
import test from 'node:test'
import { formatActivityMemberLabel } from '../src/pages/admin-users/model/formatActivityMemberLabel.ts'

test('이름과 ID를 함께 표시한다', () => {
  assert.equal(formatActivityMemberLabel(1, '황인우'), '황인우 #1')
})

test('이름 스냅샷이 없으면 ID만 표시한다', () => {
  assert.equal(formatActivityMemberLabel(1), '#1')
})

test('대상 회원 ID가 없으면 하이픈을 표시한다', () => {
  assert.equal(formatActivityMemberLabel(null, null), '-')
})
