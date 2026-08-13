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
    /**
     * 표시를 켠다 — 비어 있으면 다섯 갈래를 모두 채운다. 이미 고른 갈래가 있으면 아무 일도 하지 않는다.
     *
     * <p>모두 채우는 것은 색은 입었는데 지도에 아무것도 남지 않는 화면을 만들지 않기 위해서다.
     * 놓아둔 갈래가 있으면 그대로 살린다. 잠시 걷었다가 다시 켜는 자리에서 고르던 것이 사라지면 매번 다시 골라야 한다.
     *
     * <p>끄기는 여기에 두지 않는다. 켠 뒤 버튼을 다시 누르는 동작은 말풍선을 접는 일이고,
     * 표시를 내리는 일은 갈래를 모두 놓는 것(`clearStatusFilter`·마지막 하나 해제)으로 갈음한다.
     * 색을 입힌 지도를 넓게 보려고 접는 일이 잦은데, 접을 때마다 색까지 사라지면 다시 켜야 한다.
     */
    showSurveyStatus(state) {
      return state.length === 0 ? [...SURVEY_STATUS_ORDER] : state
    },
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

export const { showSurveyStatus, toggleStatusFilter, clearStatusFilter, selectAllStatus } = statusFilterSlice.actions
export const statusFilterReducer = statusFilterSlice.reducer
