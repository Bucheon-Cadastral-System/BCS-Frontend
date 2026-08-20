/**
 * 파일을 끌어 오는 동안 화면 전체를 덮는 안내.
 * 열려 있는 창보다 위(z)에 그려야 가려지지 않으므로 모달(z-50)보다 높은 층에 둔다.
 *
 * <p>받지 않는 자리(tone='reject')는 색과 도형만 갈린다 — 같은 자리에 같은 크기로 서야
 * 끌어 온 사람이 무엇이 달라졌는지 한눈에 읽는다.
 */
export function FileDropOverlay(props: { label?: string; hint?: string; tone?: 'accept' | 'reject' }) {
  const reject = props.tone === 'reject'
  return (
    // 배경을 충분히 가려야 안내가 읽힌다 — 지도·목록 위에 옅게 덮으면 글자가 묻힌다
    <div
      role={reject ? 'alert' : undefined}
      className={`pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 border-2 border-dashed bg-black/70 px-6 text-center backdrop-blur-md ${reject ? 'border-danger' : 'border-teal'}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`size-12 ${reject ? 'text-danger' : 'text-teal-text'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={reject ? 1.6 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {reject ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="m6.5 6.5 11 11" />
          </>
        ) : (
          <>
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
          </>
        )}
      </svg>
      <span className={`text-[15px] font-semibold drop-shadow ${reject ? 'text-white' : 'text-on-teal'}`}>
        {props.label ?? '놓으면 파일을 읽습니다'}
      </span>
      {props.hint && <span className={`text-[12px] ${reject ? 'text-white/70' : 'text-ink-3'}`}>{props.hint}</span>}
    </div>
  )
}
