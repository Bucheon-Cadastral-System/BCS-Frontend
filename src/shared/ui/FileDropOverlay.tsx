/**
 * 파일을 끌어 오는 동안 화면 전체를 덮는 안내.
 * 열려 있는 창보다 위(z)에 그려야 가려지지 않으므로 모달(z-50)보다 높은 층에 둔다.
 */
export function FileDropOverlay(props: { label?: string }) {
  return (
    // 배경을 충분히 가려야 안내가 읽힌다 — 지도·목록 위에 옅게 덮으면 글자가 묻힌다
    <div className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-blue-400 bg-gray-900/70 backdrop-blur-md">
      <svg
        viewBox="0 0 24 24"
        className="size-12 text-blue-300"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
      <span className="text-[15px] font-semibold text-white drop-shadow">
        {props.label ?? '여기에 파일을 놓으세요'}
      </span>
    </div>
  )
}
