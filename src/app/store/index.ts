import { configureStore } from '@reduxjs/toolkit'
import { activeProjectReducer } from '@/entities/survey-project'
import { statusFilterReducer } from '@/entities/survey-record'
import { themeReducer, selectTheme } from '@/shared/model/theme'
import { safeStorage } from '@/shared/lib/safeStorage'
import { applyDocumentTheme } from '@/shared/lib/documentTheme'

/**
 * 전역 상태 조립 — 조각은 각자 자기 것을 아는 계층이 들고 있고, 여기서는 자리만 정한다.
 * 아래 계층이 이 파일을 수입하지 않게 두는 것이 규칙이다. 값을 읽고 쓰는 길은 조각이 내보내는 선택자와 액션이다.
 */
export const store = configureStore({
  reducer: {
    theme: themeReducer,
    activeProject: activeProjectReducer,
    statusFilter: statusFilterReducer,
  },
})

// 테마 영속 — 리듀서는 순수하게 두고 변경 구독으로 저장한다.
// 문서 뿌리에 적는 일도 여기서 함께 한다(index.html 이 첫 그림을 위해 미리 적어 둔 것을 이어받는다)
let prevTheme = selectTheme(store.getState())
applyDocumentTheme(prevTheme)
store.subscribe(() => {
  const theme = selectTheme(store.getState())
  if (theme !== prevTheme) {
    prevTheme = theme
    safeStorage.set('bcs.theme', theme)
    applyDocumentTheme(theme)
  }
})
