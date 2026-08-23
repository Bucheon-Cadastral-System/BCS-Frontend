/**
 * 서버가 만든 파일을 사용자 디스크에 저장한다.
 *
 * <p>인증이 필요한 경로라 주소를 그대로 열지 못하고 요청으로 받아 온다. 그러면 브라우저가 저장 절차를
 * 스스로 시작하지 않으므로, 받은 내용을 임시 주소로 만들어 눌린 셈 치고 내려받게 한다.
 */
export function saveBlob(content: Blob, fileName: string): void {
  const url = URL.createObjectURL(content)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // 같은 틱에서 해제하면 브라우저가 저장을 시작하기 전에 주소가 사라져 다운로드가 취소되는 경우가 있다
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * 응답 헤더에 적힌 저장 이름 — 위처럼 직접 저장하면 브라우저가 이 헤더를 적용하지 않아 여기서 다시 읽는다.
 * 한글 이름은 UTF-8 로 감싸 오고, 그 표기가 없는 응답만 따옴표 표기를 본다.
 */
export function fileNameFromDisposition(contentDisposition: string | undefined, fallback: string): string {
  const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const plain = contentDisposition?.match(/filename="([^"]+)"/i)?.[1]
  try {
    if (encoded !== undefined) return decodeURIComponent(encoded).normalize('NFC')
  } catch {
    return fallback
  }
  return (plain ?? fallback).normalize('NFC')
}
