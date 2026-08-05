import assert from 'node:assert/strict'
import test from 'node:test'
import { getOAuthLoginErrorMessage } from '../src/pages/login/model/oauthLoginError.ts'

test('OAuth2 인증 실패 안내를 반환한다', () => {
  assert.equal(
    getOAuthLoginErrorMessage('oauth2_authentication_failed'),
    '로그인 정보가 만료되었거나 인증에 실패했습니다. 다시 로그인해 주세요.',
  )
})

test('오류 코드가 없으면 안내를 표시하지 않는다', () => {
  assert.equal(getOAuthLoginErrorMessage(null), null)
})

test('알 수 없는 오류 코드에는 일반 안내를 반환한다', () => {
  assert.equal(getOAuthLoginErrorMessage('unknown'), '로그인에 실패했습니다. 다시 시도해 주세요.')
})
