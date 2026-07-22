import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { MapTheme } from '@/entities/control-point'

/** 화면 전역 UI 상태 — 지도 테마와 활성(조사 대상) 프로젝트. 지도 상호작용 상태는 리렌더 빈도가 높아 로컬 상태로 둔다. */
interface UiState {
  theme: MapTheme
  activeProjectId: string | null
}

// 저장값 검증: light/dark 이외 문자열이면 팔레트 조회가 undefined가 되므로 명시 비교로 폴백
const initialState: UiState = {
  theme: localStorage.getItem('bcs.theme') === 'dark' ? 'dark' : 'light',
  activeProjectId: null,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light'
    },
    setActiveProject(state, action: PayloadAction<string | null>) {
      state.activeProjectId = action.payload
    },
  },
})

export const { toggleTheme, setActiveProject } = uiSlice.actions
export const uiReducer = uiSlice.reducer
