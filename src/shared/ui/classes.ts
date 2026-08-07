/**
 * 화면 공용 껍데기·버튼·입력칸 클래스.
 * 값은 청록 잉크 시안의 규격을 그대로 쓴다 — 화면마다 다시 적으면 어긋나므로 여기서만 정한다.
 */

/** 지도 위에 떠 있는 작은 알약(브랜드·검색·사용자·칩) */
export const PILL =
  'rounded-pill border border-line-pill bg-pill shadow-pill'

/** 지도 위에 떠 있는 판(좌측 목록·상세 카드·챗) */
export const PANEL =
  'rounded-pill border border-line bg-panel shadow-panel'

/** 화면 한가운데 서는 판(창·확인 대화상자·로그인 카드) — 판보다 한 겹 위라 더 짙고 더 깊은 그늘을 쓴다 */
export const MODAL_SHELL =
  'rounded-pill border border-line bg-panel-strong shadow-modal'

/** 무언가를 눌러 그 아래 펼쳐지는 작은 판(사용자 메뉴·검색 결과) */
export const POPOVER =
  'rounded-pop border border-line bg-panel-strong shadow-panel'

const BTN_BASE =
  'inline-flex h-[42px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-ctl border-[1.5px] px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-40'

/** 주 동작 — 청록 테두리에 옅은 청록 면 */
export const BTN_PRIMARY = `${BTN_BASE} border-teal-btn-edge bg-teal-wash text-teal-label hover:border-teal-text hover:bg-teal-wash-strong`
/** 보조 동작 — 테두리만 */
export const BTN_SECONDARY = `${BTN_BASE} border-line-btn bg-transparent text-ink-2 hover:bg-hover`
/** 되돌릴 수 없는 동작(취소·폐기·비활성화) */
export const BTN_DANGER = `${BTN_BASE} border-danger-edge bg-danger-wash text-danger hover:bg-danger-wash-strong`

const BTN_SM_BASE =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-ctl border-[1.5px] px-3 text-[12.5px] font-semibold transition-colors disabled:opacity-40'

/** 창 아래 버튼 — 같은 색 규칙에 크기만 작다 */
export const BTN_SM_PRIMARY = `${BTN_SM_BASE} border-teal-btn-edge bg-teal-wash text-teal-label hover:border-teal-text hover:bg-teal-wash-strong`
export const BTN_SM_SECONDARY = `${BTN_SM_BASE} border-line-btn bg-transparent text-ink-2 hover:bg-hover`
export const BTN_SM_DANGER = `${BTN_SM_BASE} border-danger-edge bg-danger-wash text-danger hover:bg-danger-wash-strong`

/**
 * 카드·목록 줄 안에 놓이는 작은 토글(조사 완료·망실).
 * 창 아래 버튼보다 한 단계 조용해야 해서 면을 채우고 테두리를 얇게 둔다. 크기는 놓이는 자리가 정한다.
 */
export const CHIP_BTN =
  'rounded-chip border border-line-btn bg-btn text-center font-medium text-ink-2 transition-colors hover:bg-hover'
export const CHIP_BTN_DANGER =
  'rounded-chip border border-danger-btn-edge bg-danger-wash text-center font-medium text-danger transition-colors hover:bg-danger-wash-strong'

/**
 * 판 머리말에 서는 아이콘 버튼(접기·닫기·수정·삭제).
 *
 * <p>글자 없이 뜻만 있는 자리라 평소에는 조용히 있다가 손을 올렸을 때만 색을 낸다.
 * 되돌릴 수 없는 쪽(닫기·삭제)만 붉게 물들어, 색 하나로 무거운 버튼과 가벼운 버튼이 갈린다.
 */
const ICON_BTN_BASE =
  'flex size-[26px] shrink-0 items-center justify-center rounded-chip text-ink-3 transition-colors'
export const ICON_BTN = `${ICON_BTN_BASE} hover:bg-hover hover:text-ink-2`
export const ICON_BTN_DANGER = `${ICON_BTN_BASE} hover:bg-danger-wash hover:text-danger`

/**
 * 판 머리말 — 제목이 왼쪽, 아이콘이 오른쪽. 머리말과 본문의 경계는 언제나 청록 두 겹 선이다
 * (창·좌측 판·대화 판이 모두 이 선을 쓴다). 세로 정렬은 제목이 한 줄인지 두 줄인지에 따라 쓰는 쪽이 정한다.
 */
export const PANEL_HEADER = 'flex shrink-0 gap-[7px] pb-[11px] pl-3.5 pr-2.5 pt-[13px]'
/** 머리말과 본문의 경계 — 머리말에 걸거나, 아래 칸에 border-t-2 border-t-teal 로 건다 */
export const PANEL_HEADER_RULE = 'border-b-2 border-b-teal'

/** 입력칸 */
export const FIELD =
  'h-[38px] w-full rounded-ctl border border-line-field bg-field px-3 text-[13px] text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-teal-edge'
/** 여러 줄 입력칸 */
export const FIELD_AREA =
  'w-full resize-none rounded-ctl border border-line-field bg-field px-3 py-2 text-[13px] leading-relaxed text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-teal-edge'
/** 고르는 칸 — 화살표는 select-chevron 이 그린다(오른쪽 여백 확보) */
export const FIELD_SELECT =
  'select-chevron h-[38px] w-full rounded-ctl border border-line-field bg-field pl-3 pr-9 text-[13px] text-ink outline-none transition-colors focus:border-teal-edge'
/**
 * 고쳐 쓸 수 없는 입력칸.
 * FIELD 에 색만 덧대지 않고 따로 적는다 — 같은 속성을 두 번 지정하면 어느 쪽이 이길지는 클래스를 적은 순서가 아니라
 * 만들어진 스타일시트의 순서가 정하므로, 토큰 이름이 바뀌면 조용히 뒤집힌다.
 */
export const FIELD_READONLY =
  'h-[38px] w-full cursor-default rounded-ctl border border-line-soft bg-soft px-3 text-[13px] text-ink-3 outline-none'

/** 목록 위에 얹는 작은 입력칸(검색·거르기) — 목록이 주인공이라 한 단계 낮춰 세운다. 너비는 쓰는 자리가 정한다 */
export const FIELD_SM =
  'h-[34px] rounded-ctl border border-line-field bg-field px-3 text-[12px] text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-teal-edge'
export const FIELD_SM_SELECT =
  'select-chevron h-[34px] rounded-ctl border border-line-field bg-field pl-3 pr-9 text-[12px] font-medium text-ink outline-none transition-colors focus:border-teal-edge'

/** 입력칸 위 라벨 */
export const FIELD_LABEL = 'mb-1.5 block text-[11px] font-medium tracking-[.08em] text-ink-3'

/** 고른 줄 왼쪽에 서는 청록 띠 — 줄 바깥으로 삐져나오지 않게 테두리가 아니라 안쪽 그림자로 그린다 */
export const ROW_ACCENT = 'shadow-[inset_3px_0_0_var(--color-teal)]'

/** 진행률 막대의 채움 — 왼쪽에서 오른쪽으로 밝아져 나아가는 방향이 보인다 */
export const PROGRESS_FILL = 'bg-[linear-gradient(90deg,var(--color-teal-edge),var(--color-teal-bright))]'
