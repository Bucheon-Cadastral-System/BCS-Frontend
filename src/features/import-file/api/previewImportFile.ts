import { http } from '@/shared/api/http'

/** 파일을 등록하지 않고 읽어만 본 결과. */
export interface ImportFilePreview {
  totalRows: number
  /** 파일의 열 이름 → 읽어 들인 항목 */
  recognizedColumns: Record<string, string>
  /** 뜻을 해석하지 않고 값만 보관하는 열 — 버리지 않고 조사 대상에 그대로 저장된다 */
  extraColumns: string[]
  errors: { row: number; message: string }[]
  /** 읽히기는 했으나 확인이 필요한 행(부천 범위 밖 등) — 등록을 막지 않는다 */
  warnings: { row: number; message: string }[]
  /** 이 서식에 있을 것으로 본 열 중 파일에 없는 것 — 등록을 막지 않고 확인만 요청한다 */
  missingColumns: string[]
  /** 다른 서식에만 있는 열 중 이 파일에 있는 것 — 마찬가지로 확인만 요청한다 */
  foreignColumns: string[]
  /** 점마다 등록하면 무엇이 벌어지는지 — 기준점 용도로 읽었을 때만 온다 */
  points?: PointPreview[]
}

/** 이 행이 등록되면 벌어지는 일 — 갱신은 기존 성과를 덮으므로 확정 전에 무엇이 바뀌는지 보여야 한다. */
export interface PointPreview {
  row: number
  pointNo: string
  type: string
  name: string
  crs: string
  northing: string
  easting: string
  longitude: string
  latitude: string
  action: 'NEW' | 'UPDATE' | 'UNCHANGED'
  /** 갱신될 항목 — 신규·그대로면 비어 있다 */
  changes: { field: string; before: string; after: string }[]
  /** 이 행에 대한 경고(부천 범위 밖 등) — 등록을 막지 않는다 */
  warning?: string | null
}

export const POINT_ACTION_LABEL: Record<PointPreview['action'], string> = {
  NEW: '신규',
  UPDATE: '갱신',
  UNCHANGED: '변경 없음',
}

/**
 * 무엇으로 쓸 파일인지 — 서식이 비슷해 서버가 용도를 알아야 그 서식에 맞게 읽고 확인 사항을 알린다.
 */
export type ImportPurpose = 'survey-csv' | 'control-points'

/**
 * 확정 전에 파일만 읽어 본다.
 * 진행률은 전송 구간만 실제 값이다 — 서버가 파싱하는 시간은 알 수 없어 100%는 응답이 왔을 때다.
 */
export async function previewImportFile(
  file: File,
  purpose: ImportPurpose,
  options: { onUploaded?: (percent: number) => void; signal?: AbortSignal } = {},
): Promise<ImportFilePreview> {
  const form = new FormData()
  form.append('file', file)

  const res = await http.post<ImportFilePreview>(`/api/imports/${purpose}/preview`, form, {
    signal: options.signal,
    onUploadProgress: (e) => {
      if (!options.onUploaded || !e.total) return
      options.onUploaded(Math.round((e.loaded / e.total) * 100))
    },
  })
  // 목록 칸이 비어 오면 빈 배열로 받는다 — 서버가 아직 그 필드를 주지 않아도 화면이 무너지지 않게
  return {
    ...res.data,
    errors: res.data.errors ?? [],
    warnings: res.data.warnings ?? [],
    extraColumns: res.data.extraColumns ?? [],
    missingColumns: res.data.missingColumns ?? [],
    foreignColumns: res.data.foreignColumns ?? [],
  }
}
