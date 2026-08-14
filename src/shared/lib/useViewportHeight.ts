import { useEffect, useState } from 'react'

/**
 * 화면 높이(px) — 시트가 위로 얼마나 열릴 수 있는지 재는 데 쓴다.
 *
 * <p>CSS 로 상한을 걸면(`max-h`) 끄는 동안의 높이를 화면이 스스로 잘라 주지만, 그 잘린 값을 코드가
 * 알 수 없어 손을 뗄 때 얼마로 확정할지 정하지 못한다. 그래서 높이를 값으로 들고 있는다.
 */
export function useViewportHeight(): number {
  const [height, setHeight] = useState(() => window.innerHeight)
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return height
}
