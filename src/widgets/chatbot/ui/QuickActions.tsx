// 자주 쓰는 질의 빠른실행 — 클릭 시 문구를 사용자 메시지로 전송해 도구 조회로 즉답한다.
// BCS는 라우터 없는 지도앱이라 ERP의 nav(페이지 이동) 종류는 없고 query만 둔다.
//
// 버튼에 적는 이름과 실제로 보내는 문구를 나눈다(ERP 빠른실행과 같은 규격) — 버튼은 짧은 명사구라야
// 여러 개가 한 줄에 서고, 모델에는 무엇을 묻는지 갖춘 문장이 가야 도구를 제대로 고른다.
//
// 어느 프로젝트인지 문구 안에서 정해지는 것만 둔다. 도구는 프로젝트 id 를 받아야 현황을 주므로,
// 「최근」·「진행 중」처럼 목록에서 고를 기준이 없으면 답이 나오지 않는다.
const QUICK_QUERIES: { label: string; prompt: string }[] = [
  { label: '기능 안내', prompt: '무엇을 도와줄 수 있는지 알려줘' },
  { label: '최근 프로젝트 현황', prompt: '가장 최근 프로젝트의 현황을 알려줘' },
  { label: '진행 중인 프로젝트', prompt: '진행 중인 프로젝트 목록을 보여줘' },
  { label: '기준점 최신 정보', prompt: '경기404의 최신 정보를 알려줘' },
]

/** 웰컴 아래와 마지막 답변 아래에만 두는 빠른 질의 버튼. onQuery로 문구를 사용자 메시지로 전송한다. */
export function QuickActions({ onQuery, disabled }: { onQuery: (text: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5 pl-8">
      {QUICK_QUERIES.map((query) => (
        <button
          key={query.label}
          type="button"
          disabled={disabled}
          onClick={() => onQuery(query.prompt)}
          className="inline-flex items-center gap-1 rounded-full border border-line-field bg-soft px-2.5 py-1 text-[12px] text-ink-3 transition-colors hover:border-teal-edge hover:bg-teal-wash hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-ink-4">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          {query.label}
        </button>
      ))}
    </div>
  )
}
