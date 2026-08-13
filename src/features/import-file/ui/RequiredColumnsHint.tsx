import { REQUIRED_COLUMNS } from '../model/readFile'

/**
 * 파일을 고르기 전에 읽는 안내 — 어떤 열이 있어야 하는지.
 *
 * <p>필수 열이 하나라도 없으면 서버는 행을 읽지 않고 파일째로 거부한다. 올리고 나서야 그 사실을 알면
 * 파일을 고쳐 다시 올리는 걸음이 한 번 더 든다. 고르는 자리에 미리 적어 그 걸음을 없앤다.
 */
export function RequiredColumnsHint() {
  return (
    <p className="break-keep text-[11px] leading-[1.6] text-ink-4">
      <span className="font-medium text-ink-3">필수 열</span> {REQUIRED_COLUMNS.join(' · ')}
    </p>
  )
}
