// 자주 쓰는 질의 빠른실행 — 클릭 시 문구를 사용자 메시지로 전송해 도구 조회로 즉답한다.
// BCS는 라우터 없는 지도앱이라 ERP의 nav(페이지 이동) 종류는 없고 query만 둔다.
const QUICK_QUERIES = [
  '전체 지적기준점이 몇 개야?',
  '종류별 기준점 개수를 차트로 보여줘',
  '조사 프로젝트 목록을 보여줘',
  '진행 중인 조사 현황을 알려줘',
]

/** 웰컴 아래·답변 아래에 두는 빠른 질의 버튼. onQuery로 문구를 사용자 메시지로 전송한다. */
export function QuickActions({ onQuery }: { onQuery: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 pl-8">
      {QUICK_QUERIES.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onQuery(q)}
          className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[12px] text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:bg-blue-500/10 dark:hover:text-gray-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-gray-400">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          {q}
        </button>
      ))}
    </div>
  )
}
