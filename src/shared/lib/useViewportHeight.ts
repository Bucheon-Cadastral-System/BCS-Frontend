import { useEffect, useState } from 'react'

/**
 * 화면 높이(px) — 시트가 위로 얼마나 열릴 수 있는지 재는 데 쓴다.
 *
 * <p>CSS 로 상한을 걸면(`max-h`) 끄는 동안의 높이를 화면이 스스로 잘라 주지만, 그 잘린 값을 코드가
 * 알 수 없어 손을 뗄 때 얼마로 확정할지 정하지 못한다. 그래서 높이를 값으로 들고 있는다.
 *
 * <p>보이는 만큼(visualViewport)이 아니라 배치의 높이(innerHeight)를 읽는다. 시트의 아래 변은 배치의
 * 아래 변에 붙어 있으므로, 자판이 올라온 만큼 높이만 줄이면 시트는 자판 뒤에 그대로 남은 채 위쪽만
 * 깎여 오히려 덜 보인다. 자판을 피하려면 높이가 아니라 아래 변을 자판 높이만큼 띄워야 하고, 그것은
 * 이 훅이 아니라 시트가 할 일이다. 주소창이 접히고 펴지는 것은 innerHeight 도 함께 따라간다.
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
