/**
 * 기준점 추가 모드 토글 (헤더).
 * 아이콘 = 기준점 도식 + 우하단 초록 +. 켜면 지도 클릭이 기준점 추가 입력으로 이어진다.
 */
export function AddPointButton(props: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onToggle}
      aria-pressed={props.active}
      aria-label={props.active ? '기준점 추가 모드 끄기' : '기준점 추가 모드 켜기'}
      title={props.active ? '추가 모드 끄기' : '지도를 클릭해 기준점 추가'}
      className={`flex size-9 items-center justify-center rounded-lg border transition-colors ${
        props.active
          ? 'border-blue-400 bg-blue-600 text-white hover:bg-blue-500'
          : 'border-white/15 bg-white/5 text-gray-200 hover:bg-white/10'
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
        {/* 기준점 도식(크로스헤어 원) */}
        <g fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="10" cy="10" r="6" />
          <path d="M10 3v14M3 10h14" strokeWidth="1.2" />
        </g>
        {/* 우하단 추가(+) 배지 */}
        <circle cx="18" cy="18" r="5.5" fill="#16a34a" />
        <path d="M18 15.4v5.2M15.4 18h5.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  )
}
