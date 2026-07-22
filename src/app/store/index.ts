import { configureStore } from '@reduxjs/toolkit'
import { uiReducer } from './uiSlice'

export const store = configureStore({
  reducer: { ui: uiReducer },
})

// 테마 영속 — 리듀서는 순수하게 두고 변경 구독으로 저장한다
let prevTheme = store.getState().ui.theme
store.subscribe(() => {
  const theme = store.getState().ui.theme
  if (theme !== prevTheme) {
    prevTheme = theme
    localStorage.setItem('bcs.theme', theme)
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export { toggleTheme, setActiveProject } from './uiSlice'
