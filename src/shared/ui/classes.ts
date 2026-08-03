/**
 * 화면 공용 껍데기·버튼·입력칸 클래스.
 * 값은 청록 잉크 시안의 규격을 그대로 쓴다 — 화면마다 다시 적으면 어긋나므로 여기서만 정한다.
 */

/** 지도 위에 떠 있는 작은 알약(브랜드·검색·사용자·칩) */
export const PILL =
  'rounded-pill border border-line-pill bg-pill shadow-pill backdrop-blur-[10px]'

/** 지도 위에 떠 있는 판(좌측 목록·상세 카드·챗) */
export const PANEL =
  'rounded-pill border border-line bg-panel shadow-panel backdrop-blur-[12px]'

const BTN_BASE =
  'inline-flex h-[42px] items-center justify-center gap-1.5 rounded-ctl border-[1.5px] px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-40'

/** 주 동작 — 청록 테두리에 옅은 청록 면 */
export const BTN_PRIMARY = `${BTN_BASE} border-teal-btn-edge bg-teal-wash text-teal-label hover:border-teal-text hover:bg-teal-wash-strong`
/** 보조 동작 — 테두리만 */
export const BTN_SECONDARY = `${BTN_BASE} border-line-btn bg-transparent text-ink-2 hover:bg-hover`
/** 되돌릴 수 없는 동작(취소·폐기·비활성화) */
export const BTN_DANGER = `${BTN_BASE} border-danger-edge bg-danger-wash text-danger hover:bg-danger-wash-strong`

const BTN_SM_BASE =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-ctl border-[1.5px] px-3 text-[12.5px] font-semibold transition-colors disabled:opacity-40'

/** 창 아래 버튼 — 같은 색 규칙에 크기만 작다 */
export const BTN_SM_PRIMARY = `${BTN_SM_BASE} border-teal-btn-edge bg-teal-wash text-teal-label hover:border-teal-text hover:bg-teal-wash-strong`
export const BTN_SM_SECONDARY = `${BTN_SM_BASE} border-line-btn bg-transparent text-ink-2 hover:bg-hover`
export const BTN_SM_DANGER = `${BTN_SM_BASE} border-danger-edge bg-danger-wash text-danger hover:bg-danger-wash-strong`

/** 지도 위 컨트롤(커맨드 바 안의 토글·줌) */
export const BTN_CTL =
  'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-ctl border border-line-btn px-2.5 text-[11.5px] font-medium text-ink-2 transition-colors hover:bg-hover disabled:opacity-40'
/** 켜져 있는 컨트롤 */
export const BTN_CTL_ON =
  'inline-flex h-[30px] items-center justify-center gap-1.5 rounded-ctl border border-teal-btn-edge bg-teal-wash-strong px-2.5 text-[11.5px] font-medium text-teal-text transition-colors'

/** 입력칸 */
export const FIELD =
  'h-[38px] w-full rounded-ctl border border-line-field bg-field px-3 text-[13px] text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-teal-edge'
/** 여러 줄 입력칸 */
export const FIELD_AREA =
  'w-full resize-none rounded-ctl border border-line-field bg-field px-3 py-2 text-[13px] leading-relaxed text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-teal-edge'
/** 고쳐 쓸 수 없는 입력칸 */
export const FIELD_READONLY = `${FIELD} cursor-default border-line-soft bg-soft text-ink-3`

/** 입력칸 위 라벨 */
export const FIELD_LABEL = 'mb-1.5 block text-[11px] font-medium tracking-[.08em] text-ink-4'
