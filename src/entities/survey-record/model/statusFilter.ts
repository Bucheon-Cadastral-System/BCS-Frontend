import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { SURVEY_STATUS_ORDER } from './status'
import type { SurveyStatus } from './status'

/**
 * 지도에 남길 갈래 — 여럿을 함께 고를 수 있다.
 *
 * <p>이 하나가 기준점 상태 표시의 켜짐이기도 하다. 고른 갈래가 하나라도 있으면 켜진 것이고, 비면 꺼진 것이다.
 * 켜짐을 따로 두면 「비었는데 켜짐」·「골라 두었는데 꺼짐」 같은, 화면으로는 설명할 수 없는 짝이 생긴다.
 *
 * <p>조사를 골라도 기본은 비워 둔다. 상태 뱃지는 종류 기호 위에 얹히므로, 위치와 종류를 확인하는 동안에는
 * 무슨 점인지 가린다. 상태는 그것을 볼 때 켠다.
 *
 * <p>갈래 어휘를 아는 자리라 조사기록 엔티티가 들고 있다.
 */
const statusFilterSlice = createSlice({
  name: 'statusFilter',
  initialState: [] as SurveyStatus[],
  reducers: {
    toggleStatusFilter(state, action: PayloadAction<SurveyStatus>) {
      const status = action.payload
      return state.includes(status) ? state.filter((s) => s !== status) : [...state, status]
    },
    /** 표시를 내리는 자리 — 갈래를 모두 놓으면 색도 함께 걷힌다 */
    clearStatusFilter() {
      return []
    },
    selectAllStatus() {
      return [...SURVEY_STATUS_ORDER]
    },
  },
})

/** 상태의 생김새는 선택자가 정한다 — 뿌리 상태 타입을 소비처가 알 필요가 없다 */
export const selectStatusFilter = (state: { statusFilter: SurveyStatus[] }) => state.statusFilter

export const { toggleStatusFilter, clearStatusFilter, selectAllStatus } = statusFilterSlice.actions
export const statusFilterReducer = statusFilterSlice.reducer
