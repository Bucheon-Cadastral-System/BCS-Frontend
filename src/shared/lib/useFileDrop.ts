import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'

/** 끌고 오는 것이 파일일 때만 반응한다 — 글자·요소를 끌 때는 안내가 뜨지 않게 */
const carriesFile = (e: DragEvent) => e.dataTransfer.types.includes('Files')

/**
 * 영역에 파일을 떨어뜨려 받는다. 반환한 핸들러를 받을 요소에 펼쳐 놓고, dragging 이면 안내를 덮어 그린다.
 * 중첩해서 쓸 수 있다 — 안쪽(모달)이 이벤트를 멈추므로 바깥(화면) 안내가 함께 뜨지 않는다.
 */
export function useFileDrop(onFile: (file: File) => void) {
  const [dragging, setDragging] = useState(false)
  const onFileRef = useRef(onFile)
  useEffect(() => {
    onFileRef.current = onFile
  })

  const dropHandlers = {
    onDragOver: (e: DragEvent) => {
      if (!carriesFile(e)) return
      e.preventDefault() // 막지 않으면 브라우저가 그 파일을 열어 앱을 벗어난다
      e.stopPropagation()
      setDragging(true)
    },
    // 자식 위를 지날 때도 leave 가 오므로 영역 밖으로 나간 경우만 해제한다
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
    },
    onDrop: (e: DragEvent) => {
      if (!carriesFile(e)) return
      e.preventDefault()
      e.stopPropagation()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onFileRef.current(file)
    },
  }

  return { dragging, dropHandlers }
}
