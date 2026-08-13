import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { MapTheme } from '@/entities/control-point'
import { SURVEY_STATUS_ORDER } from '@/entities/survey-record'
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
   * 기준점 상태를 지도에 그릴지 — 끄면 종류만으로 그린다.
   *
   * <p>조사를 골라도 기본은 꺼 둔다. 상태 뱃지는 종류 기호 위에 얹히므로, 위치와 종류를 확인하는 동안에는
   * 무슨 점인지 가린다. 상태는 그것을 볼 때 켠다.
   */
  surveyStatusVisible: boolean
  /**
   * 지도와 목록에 남길 갈래 — 여럿을 함께 고를 수 있다.
   * 켜져 있는 동안에는 늘 하나 이상이다(마지막 하나를 끄면 표시가 함께 내려간다).
   */
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
    /**
     * 표시를 켠다. 이미 켜져 있으면 아무 일도 하지 않는다.
     *
     * <p>끄기는 여기에 두지 않는다. 켠 뒤 버튼을 다시 누르는 동작은 말풍선을 접는 일이고,
     * 표시를 내리는 일은 갈래를 모두 놓는 것(`clearStatusFilter`·마지막 하나 해제)으로 갈음한다.
     * 색을 입힌 지도를 넓게 보려고 접는 일이 잦은데, 접을 때마다 색까지 사라지면 다시 켜야 한다.
     *
     * <p>비어 있으면 다섯 갈래를 모두 채운다. 색은 입었는데 지도에 아무것도 남지 않는 화면을 만들지 않기 위해서다.
     * 놓아둔 갈래가 있으면 그대로 살린다. 잠시 걷었다가 다시 켜는 자리에서 고르던 것이 사라지면 매번 다시 골라야 한다.
     */
    showSurveyStatus(state) {
      state.surveyStatusVisible = true
      if (state.statusFilter.length === 0) state.statusFilter = [...SURVEY_STATUS_ORDER]
    },
    /** 마지막 하나를 마저 끄면 표시도 내린다. 아무 갈래도 없이 색만 켜져 있는 상태를 두지 않는다 */
    toggleStatusFilter(state, action: PayloadAction<SurveyStatus>) {
      const status = action.payload
      state.statusFilter = state.statusFilter.includes(status)
        ? state.statusFilter.filter((s) => s !== status)
        : [...state.statusFilter, status]
      if (state.statusFilter.length === 0) state.surveyStatusVisible = false
    },
    /** 표시를 내리는 유일한 자리 — 갈래를 모두 놓으면 색도 함께 걷힌다 */
    clearStatusFilter(state) {
      state.statusFilter = []
      state.surveyStatusVisible = false
    },
    selectAllStatus(state) {
      state.statusFilter = [...SURVEY_STATUS_ORDER]
      state.surveyStatusVisible = true
    },
  },
})

export const {
  toggleTheme,
  setActiveProject,
  showSurveyStatus,
  toggleStatusFilter,
  clearStatusFilter,
  selectAllStatus,
} = uiSlice.actions
export const uiReducer = uiSlice.reducer
