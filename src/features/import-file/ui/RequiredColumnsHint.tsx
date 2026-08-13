import { REQUIRED_COLUMNS } from '../model/readFile'

/**
 * 파일을 고르기 전에 읽는 안내 — 어떤 열이 있어야 하는지.
 *
 * <p>필수 열이 하나라도 없으면 서버는 행을 읽지 않고 파일째로 거부한다. 올리고 나서야 그 사실을 알면
 * 파일을 고쳐 다시 올리는 걸음이 한 번 더 든다. 고르는 자리에 미리 적어 그 걸음을 없앤다.
 *
 * <p>순서가 상관없다는 것과 열을 더 붙여도 된다는 것을 함께 적는다. 두 가지 모두 담당자가
 * 양식을 손보기 전에 확인하려는 것이고, 적어 두지 않으면 열을 지우거나 순서를 맞추는 헛일을 한다.
 */
export function RequiredColumnsHint() {
  return (
    <div className="break-keep text-[11px] leading-[1.6] text-ink-4">
      <p>
        <span className="font-medium text-ink-3">필수 열</span> {REQUIRED_COLUMNS.join(' · ')}
      </p>
      <p className="mt-0.5">
        열 순서는 상관없고 다른 열을 더 붙여도 값 그대로 보관합니다. 최종조사내용·최종조사일자는 선택입니다.
      </p>
    </div>
  )
}
