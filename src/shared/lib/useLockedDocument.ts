import { useEffect } from 'react'

/** index.css 가 정의한다 — 문서를 화면에 못 박아 잡아 끌어도 밀리지 않게 한다 */
const LOCK = 'lock-scroll'

/**
 * 켜 두는 동안 문서를 못 굴리게 잠근다.
 *
 * <p>화면에 붙어 서 있는 것들(상단 헤더·아래 독·시트) 위에서 손가락을 끌면, 그 손짓은 잡을 것을 찾아
 * 문서까지 올라간다. 문서는 굴릴 것이 없어도 사파리에서 잡아 끌리며 화면째 밀려 올라가고, 그러면
 * 붙어 있어야 할 자리가 통째로 따라 움직인다.
 *
 * <p>화면 전체에 걸지 않고 부르는 화면에서만 건다 — 가로로 밀어서 봐야 하는 화면(사용자 관리)이 따로 있다.
 */
export function useLockedDocument(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    document.body.classList.add(LOCK)
    return () => document.body.classList.remove(LOCK)
  }, [enabled])
}
