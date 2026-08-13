import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { MapTheme } from '@/entities/control-point'
import type { SurveyStatus } from '@/entities/survey-record'
import { safeStorage } from '@/shared/lib/safeStorage'

/**
 * 화면 전역 UI 상태 — 지도 테마와 활성(조사 대상) 프로젝트, 조사 상태 표시.
 * 지도 상호작용 상태는 리렌더 빈도가 높아 로컬 상태로 둔다.
 */
interface UiState {
  theme: MapTheme
  activeProjectId: string | null
  /**
   * 조사 상태를 지도에 그릴지 — 끄면 종류만으로 그린다.
   *
   * <p>조사를 골라도 기본은 꺼 둔다. 상태 뱃지는 종류 기호 위에 얹히므로, 위치와 종류를 확인하는 동안에는
   * 무슨 점인지 가린다. 상태는 그 조사를 진행하는 동안 보는 값이라 볼 때 켠다.
   */
  surveyStatusVisible: boolean
  /** 지도와 목록에 남길 상태 — 비어 있으면 거르지 않는다. 여럿을 함께 고를 수 있다 */
  statusFilter: SurveyStatus[]
}

// 저장값 검증: light/dark 이외 문자열이면 팔레트 조회가 undefined가 되므로 명시 비교로 폴백
const initialState: UiState = {
  theme: safeStorage.get('bcs.theme') === 'dark' ? 'dark' : 'light',
  activeProjectId: null,
  surveyStatusVisible: false,
  statusFilter: [],
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
    /** 상태 표시를 끄면 고른 상태도 함께 푼다 — 보이지 않는 값으로 점이 빠지면 왜 없는지 알 길이 없다 */
    toggleSurveyStatus(state) {
      state.surveyStatusVisible = !state.surveyStatusVisible
      if (!state.surveyStatusVisible) state.statusFilter = []
    },
    toggleStatusFilter(state, action: PayloadAction<SurveyStatus>) {
      const status = action.payload
      state.statusFilter = state.statusFilter.includes(status)
        ? state.statusFilter.filter((s) => s !== status)
        : [...state.statusFilter, status]
    },
    clearStatusFilter(state) {
      state.statusFilter = []
    },
  },
})

export const { toggleTheme, setActiveProject, toggleSurveyStatus, toggleStatusFilter, clearStatusFilter } =
  uiSlice.actions
export const uiReducer = uiSlice.reducer
