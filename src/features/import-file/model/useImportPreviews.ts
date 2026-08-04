import { useEffect, useState } from 'react'
import { ApiError } from '@/shared/api/http'
import { previewImportFile } from '../api/previewImportFile'
import type { ImportFilePreview, ImportPurpose } from '../api/previewImportFile'

export type PreviewStatus =
  | { kind: 'waiting' }
  /** 전송 중 — percent 는 실제 전송량 */
  | { kind: 'uploading'; percent: number }
  /** 전송은 끝났고 서버가 읽는 중 — 남은 시간을 알 수 없어 퍼센트가 없다 */
  | { kind: 'reading' }
  | { kind: 'done'; preview: ImportFilePreview }
  | { kind: 'failed'; reason: string }

export interface PreviewEntry {
  file: File
  status: PreviewStatus
}

/**
 * 붙인 파일들을 차례로 읽어 본다.
 * 순차로 보내는 이유 — 확정(등록)이 순차여야 하므로(파일 간 같은 기준점이 겹칠 수 있다) 같은 순서로 보여 주면
 * 진행 표시와 실제 등록 순서가 어긋나지 않는다.
 *
 * files 는 참조가 바뀔 때마다 처음부터 다시 읽으므로 안정된 배열을 넘겨야 한다.
 * 인라인 배열을 넘기면 렌더마다 서버로 다시 보낸다.
 */
export function useImportPreviews(files: File[], purpose: ImportPurpose) {
  const [entries, setEntries] = useState<PreviewEntry[]>([])
  // '끝났다'가 아니라 '무엇을 끝냈는지'를 기억한다.
  // 불리언으로 두면 새 파일을 붙인 직후 한 프레임 동안 이전 실행의 완료 신호가 그대로 참으로 읽혀,
  // 아직 시작도 안 한 목록을 다 읽은 것으로 보고 빈 결과를 넘긴다.
  const [finishedFor, setFinishedFor] = useState<File[] | null>(null)

  useEffect(() => {
    // 개발 모드는 이 효과를 두 번 실행한다 — 첫 실행을 정리로 버리고 두 번째가 처음부터 다시 읽게 둔다.
    // "이미 시작했으면 건너뛴다"로 막으면 버려진 첫 실행만 남아 진행이 멈춘다.
    let cancelled = false
    const controller = new AbortController()

    // 읽는 중에 파일을 다시 붙일 수 있으므로 목록을 매번 새로 세운다
    setEntries(files.map((file) => ({ file, status: { kind: 'waiting' } })))
    setFinishedFor(null)

    const update = (index: number, status: PreviewStatus) => {
      if (cancelled) return
      setEntries((cur) => cur.map((entry, i) => (i === index ? { ...entry, status } : entry)))
    }

    void (async () => {
      for (const [index, file] of files.entries()) {
        // 그만뒀으면 남은 파일은 보내지 않는다 — 창을 닫았는데 서버가 계속 읽고 있을 이유가 없다
        if (cancelled) return
        update(index, { kind: 'uploading', percent: 0 })
        try {
          const preview = await previewImportFile(file, purpose, {
            signal: controller.signal,
            onUploaded: (percent) =>
              update(index, percent < 100 ? { kind: 'uploading', percent } : { kind: 'reading' }),
          })
          update(index, { kind: 'done', preview })
        } catch (e) {
          update(index, { kind: 'failed', reason: e instanceof ApiError ? e.message : '파일을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.' })
        }
      }
      if (!cancelled) setFinishedFor(files)
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [files, purpose])

  // 지금 넘어온 목록을 끝냈을 때만 완료다 — 렌더 중에 비교하므로 이전 실행의 신호가 새 목록에 섞이지 않는다
  return { entries, finished: finishedFor === files }
}
