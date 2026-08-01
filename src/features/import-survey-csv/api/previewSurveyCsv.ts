import { http } from '@/shared/api/http'

/** 대상지 파일을 등록하지 않고 읽어만 본 결과. */
export interface SurveyCsvPreview {
  totalRows: number
  /** 파일의 열 이름 → 읽어 들인 항목 */
  recognizedColumns: Record<string, string>
  /** 뜻을 해석하지 않고 값만 보관하는 열 — 버리지 않고 조사 대상에 그대로 저장된다 */
  extraColumns: string[]
  errors: { row: number; message: string }[]
}

/**
 * 확정 전에 파일만 읽어 본다.
 * 진행률은 전송 구간만 실제 값이다 — 서버가 파싱하는 시간은 알 수 없어 100%는 응답이 왔을 때다.
 */
export async function previewSurveyCsv(file: File, onUploaded?: (percent: number) => void): Promise<SurveyCsvPreview> {
  const form = new FormData()
  form.append('file', file)

  const res = await http.post<SurveyCsvPreview>('/api/imports/survey-csv/preview', form, {
    onUploadProgress: (e) => {
      if (!onUploaded || !e.total) return
      onUploaded(Math.round((e.loaded / e.total) * 100))
    },
  })
  return res.data
}
