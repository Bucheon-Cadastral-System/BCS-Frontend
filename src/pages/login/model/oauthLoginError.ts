const OAUTH_LOGIN_ERROR_MESSAGE: Record<string, string> = {
  oauth2_authentication_failed: '로그인 정보가 만료되었거나 인증에 실패했습니다. 다시 로그인해 주세요.',
  oauth2_user_info_invalid: '카카오 사용자 정보를 불러오지 못했습니다. 다시 로그인해 주세요.',
  oauth2_provider_unsupported: '지원하지 않는 로그인 방식입니다.',
  oauth2_principal_invalid: '로그인 처리 중 오류가 발생했습니다. 다시 로그인해 주세요.',
}

export function getOAuthLoginErrorMessage(errorCode: string | null) {
  if (!errorCode) return null
  return OAUTH_LOGIN_ERROR_MESSAGE[errorCode] ?? '로그인에 실패했습니다. 다시 시도해 주세요.'
}
