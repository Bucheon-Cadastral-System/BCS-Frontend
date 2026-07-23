import { type ComponentPropsWithoutRef, useRef, useState } from 'react'

// 렌더된 표를 TSV(탭=열, 줄바꿈=행)로 직렬화 — Excel·구글시트가 셀로 받는다. 셀 안 줄바꿈·탭은 공백으로 평탄화
function tableToTsv(table: HTMLTableElement): string {
  return Array.from(table.rows)
    .map((row) =>
      Array.from(row.cells)
        .map((cell) => cell.innerText.replace(/\s+/g, ' ').trim())
        .join('\t'),
    )
    .join('\n')
}

/**
 * react-markdown의 <table> 대체 — 우상단 복사 버튼. 클릭 시 렌더된 표를 클립보드에 쓴다.
 * TSV(text/plain) + 표 HTML(text/html)을 함께 써서 Excel·시트는 서식 셀로, 일반 입력칸엔 TSV로 붙는다.
 */
export function CopyableTable({ children, node: _node, ...props }: ComponentPropsWithoutRef<'table'> & { node?: unknown }) {
  const tableRef = useRef<HTMLTableElement>(null)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const table = tableRef.current
    if (!table) return
    const tsv = tableToTsv(table)
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([tsv], { type: 'text/plain' }),
            'text/html': new Blob([table.outerHTML], { type: 'text/html' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(tsv)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 미지원·권한 거부 — 조용히 무시
    }
  }

  return (
    <div className="group/table relative">
      <button
        type="button"
        onClick={copy}
        aria-label="표 복사"
        title="표 복사 (Excel 붙여넣기)"
        className="absolute right-1 top-1 z-10 inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white/85 px-1.5 py-0.5 text-[11px] text-gray-500 backdrop-blur transition-opacity hover:text-gray-800 dark:border-gray-600 dark:bg-gray-900/80 dark:text-gray-300 dark:hover:text-gray-100 [@media(hover:hover)]:opacity-0 group-hover/table:opacity-100 focus-visible:opacity-100"
      >
        {copied ? '복사됨' : '복사'}
      </button>
      <table ref={tableRef} {...props}>
        {children}
      </table>
    </div>
  )
}
