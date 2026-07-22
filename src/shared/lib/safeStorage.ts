/** 저장소 접근이 차단된 환경(쿠키 전면 차단 등)에서도 앱이 죽지 않게 하는 localStorage 래퍼. */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch {
      // 저장 실패는 무시 — 상태는 메모리로만 유지된다
    }
  },
}
