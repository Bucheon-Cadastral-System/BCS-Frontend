/**
 * 받침 유무로 조사를 고른다 — '1234공'을/를, '가나'는/은 처럼 이름이 문장에 들어갈 때 쓴다.
 * 한글이 아니면 표기만으로 소리를 단정할 수 없어 받침형을 기본으로 한다(기준점명은 '…공'류가 대부분).
 */
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  if (word === '') return withBatchim
  const code = word.charCodeAt(word.length - 1)
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 > 0 ? withBatchim : withoutBatchim
  }
  // 숫자는 읽는 소리로 가른다 — 0(영)·1(일)·3(삼)·6(육)·7(칠)·8(팔)은 받침, 2(이)·4(사)·5(오)·9(구)는 없음
  const last = word[word.length - 1]
  if (last >= '0' && last <= '9') {
    return '2459'.includes(last) ? withoutBatchim : withBatchim
  }
  return withBatchim
}
