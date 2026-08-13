import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

/**
 * 지금 고른 조사 프로젝트 — 지도·판·상세가 모두 이 하나를 보고 무엇을 그릴지 정한다.
 * 프로젝트를 가리키는 값이라 그 엔티티가 들고 있고, 저장소 조립만 app 이 맡는다.
 */
const activeProjectSlice = createSlice({
  name: 'activeProject',
  initialState: null as string | null,
  reducers: {
    setActiveProject(_state, action: PayloadAction<string | null>) {
      return action.payload
    },
  },
})

/** 상태의 생김새는 선택자가 정한다 — 뿌리 상태 타입을 소비처가 알 필요가 없다 */
export const selectActiveProjectId = (state: { activeProject: string | null }) => state.activeProject

export const { setActiveProject } = activeProjectSlice.actions
export const activeProjectReducer = activeProjectSlice.reducer
