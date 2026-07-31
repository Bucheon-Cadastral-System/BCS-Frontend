/** 파일명에서 확장자를 뺀 부분 — 업로드한 파일 이름을 기본값으로 쓸 때 사용한다. */
export function fileBaseName(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}
