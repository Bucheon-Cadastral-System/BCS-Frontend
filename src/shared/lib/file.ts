/**
 * 파일명에서 확장자를 뺀 부분 — 업로드한 파일 이름을 기본값으로 쓸 때 사용한다.
 * macOS 는 파일명의 한글을 자모가 나뉜 형태(NFD)로 넘긴다. 그대로 입력 칸에 넣으면 글자는 같아 보여도
 * 지우기가 글자가 아니라 자모 단위로 동작하고, 저장한 뒤에는 같은 말로 검색해도 걸리지 않으므로
 * 결합된 형태(NFC)로 맞춰 둔다.
 */
export function fileBaseName(name: string): string {
  return name.replace(/\.[^.]+$/, '').normalize('NFC')
}
