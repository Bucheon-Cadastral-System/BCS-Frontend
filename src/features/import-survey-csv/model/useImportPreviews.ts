import { useEffect, useState } from 'react'
import { ApiError } from '@/shared/api/http'
import { previewSurveyCsv } from '../api/previewSurveyCsv'
import type { SurveyCsvPreview } from '../api/previewSurveyCsv'

export type PreviewStatus =
  | { kind: 'waiting' }
  /** 전송 중 — percent 는 실제 전송량 */
  | { kind: 'uploading'; percent: number }
  /** 전송은 끝났고 서버가 읽는 중 — 남은 시간을 알 수 없어 퍼센트가 없다 */
  | { kind: 'reading' }
  | { kind: 'done'; preview: SurveyCsvPreview }
  | { kind: 'failed'; reason: string }

export interface PreviewEntry {
  file: File
  status: PreviewStatus
}

/**
 * 붙인 파일들을 차례로 읽어 본다.
 * 순차로 보내는 이유 — 확정(등록)이 순차여야 하므로(파일 간 같은 기준점이 겹칠 수 있다) 같은 순서로 보여 주면
 * 진행 표시와 실제 등록 순서가 어긋나지 않는다.
 */
export function useImportPreviews(files: File[]) {
  const [entries, setEntries] = useState<PreviewEntry[]>([])
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    // 개발 모드는 이 효과를 두 번 실행한다 — 첫 실행을 정리로 버리고 두 번째가 처음부터 다시 읽게 둔다.
    // "이미 시작했으면 건너뛴다"로 막으면 버려진 첫 실행만 남아 진행이 멈춘다.
    let cancelled = false
    const controller = new AbortController()

    // 읽는 중에 파일을 다시 붙일 수 있으므로 목록을 매번 새로 세운다
    setEntries(files.map((file) => ({ file, status: { kind: 'waiting' } })))
    setFinished(false)

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
          const preview = await previewSurveyCsv(file, {
            signal: controller.signal,
            onUploaded: (percent) =>
              update(index, percent < 100 ? { kind: 'uploading', percent } : { kind: 'reading' }),
          })
          update(index, { kind: 'done', preview })
        } catch (e) {
          update(index, { kind: 'failed', reason: e instanceof ApiError ? e.message : '파일을 읽지 못했습니다.' })
        }
      }
      if (!cancelled) setFinished(true)
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [files])

  return { entries, finished }
}
