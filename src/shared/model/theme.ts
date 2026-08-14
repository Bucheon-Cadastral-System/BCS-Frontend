import { createSlice } from '@reduxjs/toolkit'
import { safeStorage } from '@/shared/lib/safeStorage'

/**
 * 배경 밝기 — 지도 배경지도와 화면 팔레트가 함께 따르는 값.
 *
 * <p>도메인 지식이 아니라 화면 설정이라 아래 계층에 둔다. 기준점 도식도 이 값으로 팔레트를 고르지만,
 * 그것은 도식이 밝기를 쓰는 것이지 밝기가 기준점의 속성인 것은 아니다.
 */
export type MapTheme = 'light' | 'dark'

// 저장값 검증: light/dark 이외 문자열이면 팔레트 조회가 undefined 가 되므로 명시 비교로 폴백
const initialState: MapTheme = safeStorage.get('bcs.theme') === 'dark' ? 'dark' : 'light'

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme(state): MapTheme {
      return state === 'light' ? 'dark' : 'light'
    },
  },
})

/** 상태의 생김새는 선택자가 정한다 — 뿌리 상태 타입을 아래 계층이 알 필요가 없다 */
export const selectTheme = (state: { theme: MapTheme }) => state.theme

export const { toggleTheme } = themeSlice.actions
export const themeReducer = themeSlice.reducer
