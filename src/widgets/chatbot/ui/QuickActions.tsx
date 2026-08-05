// 자주 쓰는 질의 빠른실행 — 클릭 시 문구를 사용자 메시지로 전송해 도구 조회로 즉답한다.
// BCS는 라우터 없는 지도앱이라 ERP의 nav(페이지 이동) 종류는 없고 query만 둔다.
const QUICK_QUERIES = [
  '전체 지적기준점이 몇 개야?',
  '종류별 기준점 개수를 차트로 보여줘',
  '프로젝트 목록을 보여줘',
  '진행 중인 프로젝트 현황을 알려줘',
]

/** 웰컴 아래·답변 아래에 두는 빠른 질의 버튼. onQuery로 문구를 사용자 메시지로 전송한다. */
export function QuickActions({ onQuery, disabled }: { onQuery: (text: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5 pl-8">
      {QUICK_QUERIES.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onQuery(q)}
          className="inline-flex items-center gap-1 rounded-full border border-line-field bg-soft px-2.5 py-1 text-[12px] text-ink-3 transition-colors hover:border-teal-edge hover:bg-teal-wash hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-ink-4">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          {q}
        </button>
      ))}
    </div>
  )
}
