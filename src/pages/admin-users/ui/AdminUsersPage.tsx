import { useCallback, useEffect, useRef, useState } from 'react'
import { changeAdminMember, getAdminActivities, getAdminMemberCounts, getAdminMembers, updateAdminMember, DISTRICTS, POSITIONS, TEAMS } from '@/entities/user'
import type { AdminActivity, AdminActivityType, AdminMemberAction, AdminMemberSortBy, ManagedUser, SortDirection, UserProfile, UserStatus } from '@/entities/user'
import { UserAvatar } from '@/entities/user'
import { ActivityIcon, AppHeader, UsersIcon } from '@/widgets/app-header'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { BTN_SM_SECONDARY, FIELD, FIELD_SELECT } from '@/shared/ui/classes'

interface AdminUsersPageProps {
  /** 지금 로그인한 관리자 — 헤더 표시에 쓴다 */
  profile: UserProfile | null
  onBack: () => void
}

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: '승인 대기',
  ACTIVE: '활성화',
  INACTIVE: '비활성화',
}

/** 상태별 색 — 승인 대기는 앰버, 사용 중은 청록, 비활성은 죽인 회색 */
const STATUS_TONE: Record<UserStatus, string> = {
  PENDING: 'bg-amber-wash text-amber',
  ACTIVE: 'bg-teal-wash-strong text-teal-text',
  INACTIVE: 'bg-soft text-ink-3',
}

/** 상세 패널 버튼 — 창 아래 버튼과 같은 규격 */
const PANEL_BTN = 'h-9 whitespace-nowrap rounded-ctl border-[1.5px] px-3 text-[12.5px] font-semibold transition-colors disabled:opacity-40'
const PANEL_BTN_NEUTRAL = `${PANEL_BTN} border-line-btn text-ink-2 hover:bg-hover`
const PANEL_BTN_PRIMARY = `${PANEL_BTN} border-teal-btn-edge bg-teal-wash text-teal-label hover:bg-teal-wash-strong`
const PANEL_BTN_DANGER = `${PANEL_BTN} border-danger-btn-edge bg-danger-wash text-danger hover:bg-danger-wash-strong`

type SortField = 'name' | 'email' | 'district' | 'team' | 'position' | 'role' | 'status'
type SearchField = 'name' | 'email' | 'phone'
const API_SORT_FIELD: Record<SortField, AdminMemberSortBy> = {
  name: 'name', email: 'email', district: 'district', team: 'team', position: 'position', role: 'memberRole', status: 'memberStatus',
}
const SEARCH_LABEL: Record<SearchField, string> = { name: '이름', email: '이메일', phone: '전화번호' }

/** 화면 안에서 갈라지는 두 자리 — 사용자 관리와 활동 로그는 같은 계층이다 */
type AdminTab = 'members' | 'activities'

/** 상세가 미끄러져 나가는 시간(ms) — 내용을 트리에서 빼는 시점이 이보다 빨라선 안 된다 */
const DETAIL_LEAVE_MS = 200

/**
 * 목록 열 — 이름·기본 너비·정렬 가능 여부를 한 곳에서 정한다.
 * 열 머리와 줄이 같은 배열을 돌기 때문에 폭을 바꿔도 두 줄이 어긋나지 않는다.
 */
type ColumnKey = SortField | 'department'
/** grow=넓게 쓰는 열(남은 자리를 나눠 갖는다), 나머지는 값 길이에 맞춘 고정 폭 */
type Column<K> = { key: K; label: string; width?: number; grow?: boolean }
const COLUMNS: (Column<ColumnKey> & { sortable: boolean })[] = [
  // 이름은 표식과 두세 글자면 충분하고, 이메일은 길어 잘리기 쉬우므로 남은 자리를 이메일이 갖는다
  { key: 'name', label: '이름', width: 150, sortable: true },
  { key: 'email', label: '이메일', grow: true, sortable: true },
  { key: 'district', label: '소속', width: 76, sortable: true },
  // 소속 과는 백엔드가 정렬을 지원하지 않는다
  { key: 'department', label: '소속 과', width: 96, sortable: false },
  { key: 'team', label: '소속 팀', width: 96, sortable: true },
  { key: 'position', label: '직위', width: 64, sortable: true },
  { key: 'role', label: '권한', width: 56, sortable: true },
  { key: 'status', label: '상태', width: 82, sortable: true },
]

/** 활동 로그 열 — 무엇을 했는지(내용)가 먼저 읽히고, 언제인지는 줄 끝에서 받는다 */
type ActivityColumnKey = 'createdAt' | 'activityType' | 'actor' | 'target' | 'message'
const ACTIVITY_COLUMNS: Column<ActivityColumnKey>[] = [
  { key: 'message', label: '내용', grow: true },
  { key: 'activityType', label: '유형', width: 108 },
  { key: 'actor', label: '관리자', width: 72 },
  { key: 'target', label: '대상 회원', width: 80 },
  { key: 'createdAt', label: '시각', width: 180 },
]

/** 열 한 칸의 자리 — 머리와 줄이 같은 규칙을 쓴다 */
function columnStyle<K>(column: Column<K>) {
  return {
    className: column.grow ? 'min-w-0 flex-1' : 'shrink-0',
    style: column.grow ? undefined : { width: column.width },
  }
}

/** 활동 유형 — 서버가 새 값을 보내면 원문을 그대로 보여 준다 */
const ACTIVITY_LABEL: Record<AdminActivityType, string> = {
  MEMBER_APPROVED: '가입 승인',
  MEMBER_REJECTED: '가입 거절',
  MEMBER_ACTIVATED: '활성화',
  MEMBER_DEACTIVATED: '비활성화',
  MEMBER_PROFILE_UPDATED: '정보 수정',
  MEMBER_PROMOTED_TO_ADMIN: '관리자 부여',
  MEMBER_DEMOTED_TO_USER: '권한 회수',
}

/** 확인 문구는 목표 상태만으로 정해지지 않는다 — 같은 ACTIVE라도 대기 중이면 승인, 비활성이면 재활성화다. */
function actionLabelOf(from: UserStatus, to: UserStatus): string {
  if (to === 'ACTIVE') return from === 'INACTIVE' ? '다시 활성화' : '승인'
  if (to === 'INACTIVE') return '비활성화'
  return '상태 변경'
}

function validateMemberDraft(member: ManagedUser): string | null {
  const name = member.name.trim()
  const email = member.email.trim()
  const department = member.department.trim()

  if (name.length < 2 || name.length > 20) return '이름은 2자 이상 20자 이하로 입력해 주세요.'
  if (!/^01[016789]\d{7,8}$/.test(member.phone)) return '전화번호는 하이픈 없이 올바른 휴대전화 번호로 입력해 주세요.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '올바른 이메일 주소를 입력해 주세요.'
  if (department.length > 50) return '소속 과는 50자 이하로 입력해 주세요.'
  return null
}

function isKnownValue(values: readonly string[], value: string): boolean {
  return values.includes(value)
}

function normalizeMemberDraft(member: ManagedUser): ManagedUser {
  return {
    ...member,
    name: member.name.trim(),
    phone: member.phone.replace(/\D/g, ''),
    email: member.email.trim(),
    department: member.department.trim(),
  }
}

export function AdminUsersPage({ profile, onBack }: AdminUsersPageProps) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activities, setActivities] = useState<AdminActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [activitiesError, setActivitiesError] = useState('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | UserStatus>('ALL')
  const [counts, setCounts] = useState<Record<'ALL' | UserStatus, number>>({ ALL: 0, PENDING: 0, ACTIVE: 0, INACTIVE: 0 })
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [searchField, setSearchField] = useState<SearchField>('name')
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({ field: 'name', direction: 'ASC' })
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [draft, setDraft] = useState<ManagedUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  // 상태 변경 실패는 확인 창 안에서 알린다 — 뒤쪽 배너에 띄우면 배경 딤에 가려 사용자가 이유를 볼 수 없다
  const [changeError, setChangeError] = useState('')
  const [pendingChange, setPendingChange] = useState<{ id: string; action: AdminMemberAction; status?: UserStatus; label: string } | null>(null)
  const memberRequestId = useRef(0)
  const [tab, setTab] = useState<AdminTab>('members')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loadActivities = useCallback(async (cursor?: string) => {
    setActivitiesLoading(true)
    setActivitiesError('')
    try {
      const result = await getAdminActivities(cursor)
      setActivities((current) => cursor ? [...current, ...result.content] : result.content)
      setNextCursor(result.nextCursor)
    } catch (e) {
      setActivitiesError(e instanceof Error ? e.message : '관리자 활동 로그를 불러오지 못했습니다.')
    } finally {
      setActivitiesLoading(false)
    }
  }, [])

  const loadMembers = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++memberRequestId.current
    setLoading(true)
    setError('')
    try {
      const keyword = debouncedQuery.trim()
      const result = await getAdminMembers({
        page,
        size: pageSize,
        sortBy: API_SORT_FIELD[sort.field],
        direction: sort.direction,
        ...(filter !== 'ALL' ? { memberStatus: filter } : {}),
        ...(keyword ? { [searchField]: keyword } : {}),
      }, signal)
      if (signal?.aborted || requestId !== memberRequestId.current) return
      if (result.totalPages > 0 && page >= result.totalPages) {
        setPage(result.totalPages - 1)
        return
      }
      setUsers(result.content)
      setTotalElements(result.totalElements)
      setTotalPages(result.totalPages)
    } catch (e) {
      if (signal?.aborted || requestId !== memberRequestId.current) return
      setError(e instanceof Error ? e.message : '관리자 정보를 불러오지 못했습니다.')
    } finally {
      if (!signal?.aborted && requestId === memberRequestId.current) setLoading(false)
    }
  }, [debouncedQuery, filter, page, pageSize, searchField, sort])

  const loadCounts = async () => {
    try { setCounts(await getAdminMemberCounts()) } catch (e) { setError(e instanceof Error ? e.message : '회원 현황을 불러오지 못했습니다.') }
  }

  useEffect(() => { const timeout = window.setTimeout(() => setDebouncedQuery(query), 300); return () => window.clearTimeout(timeout) }, [query])
  useEffect(() => {
    const controller = new AbortController()
    void loadMembers(controller.signal)
    return () => controller.abort()
  }, [loadMembers])
  useEffect(() => { void loadCounts(); void loadActivities() }, [loadActivities])

  /** 상세를 닫는다 — 고르던 사람과 고치던 값을 함께 놓는다 */
  const closeDetail = () => {
    setSelectedId(null)
    setDraft(null)
  }

  const updateStatus = (id: string, status: UserStatus) => {
    const current = users.find((user) => user.id === id)
    if (!current) return
    const action = status === 'INACTIVE' ? 'deactivate' : current.status === 'PENDING' ? 'approve' : 'activate'
    setPendingChange({ id, action, status, label: actionLabelOf(current.status, status) })
  }

  const applyStatusChange = async () => {
    if (!pendingChange || changingStatus) return
    const { id, action } = pendingChange
    setChangingStatus(true)
    setError('')
    setChangeError('')
    try {
      await changeAdminMember(id, action)
      setPendingChange(null)
      await Promise.all([loadMembers(), loadCounts(), loadActivities()])
    } catch (e) {
      // 창은 열어 둔다 — 사유를 읽고 그 자리에서 다시 시도할 수 있게
      setChangeError(e instanceof Error ? e.message : '회원 상태를 변경하지 못했습니다.')
    } finally {
      setChangingStatus(false)
    }
  }

  const startEditing = (user: ManagedUser) => {
    setError('')
    setDraft(normalizeMemberDraft(user))
  }

  const saveEditing = async () => {
    if (!draft || saving) return
    const normalizedDraft = normalizeMemberDraft(draft)
    const validationError = validateMemberDraft(normalizedDraft)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    try {
      await updateAdminMember(normalizedDraft)
      setDraft(null)
      await Promise.all([loadMembers(), loadActivities()])
    } catch (e) {
      setError(e instanceof Error ? e.message : '회원 정보를 수정하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const changeSort = (field: SortField) => {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === 'ASC' ? 'DESC' : 'ASC',
    }))
    setPage(0)
  }

  // 선택은 지금 목록 안에서만 유효하다 — 필터·페이지가 바뀌어 사라진 사용자를 상세에 남겨 두지 않는다
  const selected = users.find((user) => user.id === selectedId) ?? null
  const editing = draft !== null && draft.id === selected?.id
  const shown = editing ? draft : selected
  // 본인 계정 — 스스로 비활성하거나 권한을 회수하면 관리 화면으로 돌아올 길이 사라진다
  const isSelf = shown !== null && shown.id === profile?.id

  // 목록에서 사라진 사람은 고른 것도 고치던 값도 놓는다 —
  // 필터를 되돌려 그 사람이 다시 나타나면 낡은 초안이 편집 상태로 되살아나, 그동안 바뀐 서버 값을 덮어쓴다.
  useEffect(() => {
    if (selectedId !== null && selected === null) {
      setSelectedId(null)
      setDraft(null)
    }
  }, [selectedId, selected])

  // 상세는 닫히는 동안에도 내용을 들고 있어야 미끄러져 나가는 모습이 이어진다
  const detailOpen = shown !== null
  const shownRef = useRef<ManagedUser | null>(null)
  useEffect(() => {
    if (shown) shownRef.current = shown
  })
  const [leaving, setLeaving] = useState<ManagedUser | null>(null)
  useEffect(() => {
    if (detailOpen) {
      setLeaving(null)
      return
    }
    const last = shownRef.current
    if (!last) return
    setLeaving(last)
    const timeout = window.setTimeout(() => setLeaving(null), DETAIL_LEAVE_MS)
    return () => window.clearTimeout(timeout)
  }, [detailOpen])
  const detail = shown ?? leaving

  const firstPageNumber = Math.min(Math.max(page - 2, 0), Math.max(totalPages - 5, 0))
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstPageNumber + index)

  return (
    <main className="app-bg relative h-full text-ink">
      {/* 헤더는 지도 화면과 같은 것을 쓴다 — 탭 자리만 이 화면의 이름으로 바꾼다 */}
      <AppHeader
        onHome={onBack}
        tabs={[
          { key: 'members', label: '사용자 관리', icon: <UsersIcon className="size-[18px]" />, active: tab === 'members', onClick: () => setTab('members') },
          { key: 'activities', label: '활동 로그', icon: <ActivityIcon />, active: tab === 'activities', onClick: () => setTab('activities') },
        ]}
        user={profile}
      />

      {/* 지도 화면과 같이 머리띠를 두지 않는다 — 바탕은 화면 전체가 하나이고 헤더는 그 위에 떠 있다.
          내용만 헤더 높이만큼 내려 시작해 알약에 가리지 않는다. */}
      <section className="absolute inset-0 flex flex-col pt-[76px]">
        {/* 머리말 묶음 — 아래 청록 선이 본문과의 경계다(좌측 판·대화 판과 같은 규칙) */}
        <div className="shrink-0 border-b-2 border-b-teal">
        <header className="px-[22px] py-[15px]">
          <h1 className="min-w-0 text-[23px] font-semibold tracking-[-.02em] text-ink">
            {tab === 'members' ? '사용자 관리' : '활동 로그'}
          </h1>
        </header>

        {/* 걸러 보기와 찾기는 제목 아래 한 단계 낮은 줄에 함께 둔다 */}
        {tab === 'members' && (
          <div className="flex items-center gap-2 px-[22px] pb-[11px]">
            {(['ALL', 'PENDING', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
              <button
                type="button"
                key={status}
                onClick={() => { setFilter(status); setPage(0) }}
                aria-pressed={filter === status}
                className={`flex h-[30px] items-center gap-1.5 rounded-chip px-3 text-[12px] font-medium transition-colors ${
                  filter === status ? 'bg-teal-wash-strong text-teal-text' : 'text-ink-3 hover:bg-hover hover:text-ink-2'
                }`}
              >
                {status === 'ALL' ? '전체' : STATUS_LABEL[status]}
                <span className="font-mono">{counts[status]}</span>
              </button>
            ))}

            <div className="ml-auto flex min-w-0 gap-2">
              <select
                className="select-chevron h-[34px] rounded-ctl border border-line-field bg-field pl-3 pr-9 text-[12px] font-medium text-ink outline-none transition-colors focus:border-teal-edge"
                value={searchField}
                onChange={(event) => { setSearchField(event.target.value as SearchField); setPage(0) }}
              >
                {(['name', 'email', 'phone'] as const).map((value) => (
                  <option key={value} value={value}>{SEARCH_LABEL[value]}</option>
                ))}
              </select>
              <input
                type="search"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(0) }}
                placeholder={`${SEARCH_LABEL[searchField]} 검색`}
                className="h-[34px] w-[240px] rounded-ctl border border-line-field bg-field px-3.5 text-[12px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-teal-edge"
              />
            </div>
          </div>
        )}
        </div>

        {error && (
          <p className="mx-[22px] mt-3 shrink-0 rounded-pop border border-danger-btn-edge bg-danger-wash px-4 py-2.5 text-[12.5px] text-danger" role="alert">
            {error}
          </p>
        )}

        {tab === 'members' ? (
          <>
            <div className="flex min-h-0 flex-1">
              <div
                className="min-w-0 flex-1 overflow-y-auto"
                onClick={(event) => { if (event.target === event.currentTarget) closeDetail() }}
              >
                <div className="flex h-[34px] items-center gap-3 border-b border-line-soft px-[22px] text-[11px] font-medium tracking-[.08em] text-ink-4">
                  {COLUMNS.map((column) => {
                    const place = columnStyle(column)
                    return column.sortable ? (
                      <SortHeader
                        key={column.key}
                        field={column.key as SortField}
                        label={column.label}
                        sort={sort}
                        onSort={changeSort}
                        className={place.className}
                        style={place.style}
                      />
                    ) : (
                      <span key={column.key} className={`${place.className} truncate`} style={place.style}>
                        {column.label}
                      </span>
                    )
                  })}
                </div>

                {loading && <p className="px-[22px] py-10 text-center text-[12.5px] text-ink-4">사용자 정보를 불러오는 중입니다…</p>}
                {!loading && users.length === 0 && (
                  <p className="px-[22px] py-10 text-center text-[12.5px] text-ink-4">조건에 맞는 사용자가 없습니다.</p>
                )}

                {!loading && users.map((user) => (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => { setSelectedId((current) => (current === user.id ? null : user.id)); setDraft(null) }}
                    aria-current={user.id === selectedId}
                    className={`flex h-14 w-full items-center gap-3 border-b border-line-row px-[22px] text-left transition-colors hover:bg-hover ${
                      user.id === selectedId ? 'bg-teal-wash shadow-[inset_3px_0_0_var(--color-teal)]' : ''
                    }`}
                  >
                    {COLUMNS.map((column) => {
                      const place = columnStyle(column)
                      return (
                        <span key={column.key} className={place.className} style={place.style}>
                          <Cell column={column.key} user={user} />
                        </span>
                      )
                    })}
                  </button>
                ))}
              </div>

              <div
                className={`shrink-0 overflow-hidden transition-[width] duration-200 ease-out ${detailOpen ? 'w-[400px]' : 'w-0'}`}
                aria-hidden={!detailOpen}
                inert={!detailOpen}
              >
              {detail && (
                <aside
                  className={`relative flex h-full w-[400px] flex-col border-l border-line transition-[opacity,transform] duration-200 ease-out ${
                    detailOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                  }`}
                >
                  <button
                    type="button"
                    onClick={closeDetail}
                    aria-label="닫기"
                    title="닫기"
                    className="absolute right-3 top-3 z-10 flex size-[26px] items-center justify-center rounded-chip text-ink-3 transition-colors hover:bg-danger-wash hover:text-danger"
                  >
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-[18px]">
                  <div className="flex items-center gap-3 pr-8">
                    <UserAvatar name={detail.name} className="size-11 text-[15px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[17px] font-semibold text-ink">{detail.name}</span>
                      <span className="block truncate font-mono text-[11px] text-ink-4">#{detail.id} · {detail.role}</span>
                      {isSelf && (
                        <span className="mt-1 inline-flex rounded-chip bg-teal-wash-strong px-2 py-0.5 text-[10.5px] font-semibold text-teal-text">
                          현재 접속중인 계정
                        </span>
                      )}
                    </span>
                    <span className={`shrink-0 rounded-chip px-2.5 py-1 text-[10.5px] font-semibold ${STATUS_TONE[detail.status]}`}>
                      {STATUS_LABEL[detail.status]}
                    </span>
                  </div>

                  <dl className="mt-5 flex-1">
                    <Field label="이름" editing={editing} value={detail.name} onChange={(v) => setDraft({ ...detail, name: v })} />
                    <Field
                      label="전화번호"
                      editing={editing}
                      mono
                      value={detail.phone}
                      onChange={(v) => setDraft({ ...detail, phone: v.replace(/\D/g, '').slice(0, 11) })}
                    />
                    <Field label="이메일" editing={editing} value={detail.email} onChange={(v) => setDraft({ ...detail, email: v })} />
                    <SelectField
                      label="소속 구청"
                      editing={editing}
                      value={detail.district}
                      options={DISTRICTS}
                      onChange={(v) => setDraft({ ...detail, district: v as ManagedUser['district'] })}
                    />
                    <Field label="소속 과" editing={editing} value={detail.department} onChange={(v) => setDraft({ ...detail, department: v })} />
                    <SelectField
                      label="소속 팀"
                      editing={editing}
                      value={detail.team}
                      options={TEAMS}
                      onChange={(v) => setDraft({ ...detail, team: v as ManagedUser['team'] })}
                    />
                    <SelectField
                      label="직위"
                      editing={editing}
                      value={detail.position}
                      options={POSITIONS}
                      onChange={(v) => setDraft({ ...detail, position: v as ManagedUser['position'] })}
                    />
                  </dl>

                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    {editing ? (
                      <>
                        <button type="button" disabled={saving} className={PANEL_BTN_NEUTRAL} onClick={() => setDraft(null)}>
                          취소
                        </button>
                        <button type="button" disabled={saving} className={PANEL_BTN_PRIMARY} onClick={saveEditing}>
                          {saving ? '저장 중…' : '변경사항 저장'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className={PANEL_BTN_NEUTRAL} onClick={() => startEditing(detail)}>
                          정보 수정
                        </button>
                        {!isSelf && detail.status === 'PENDING' && (
                          <>
                            <button type="button" className={PANEL_BTN_DANGER} onClick={() => setPendingChange({ id: detail.id, action: 'reject', label: '가입 거절' })}>
                              가입 거절
                            </button>
                            <button type="button" className={PANEL_BTN_PRIMARY} onClick={() => updateStatus(detail.id, 'ACTIVE')}>
                              가입 승인
                            </button>
                          </>
                        )}
                        {!isSelf && detail.status === 'ACTIVE' && (
                          <>
                            <button
                              type="button"
                              className={PANEL_BTN_NEUTRAL}
                              onClick={() => setPendingChange(
                                detail.role === 'ADMIN'
                                  ? { id: detail.id, action: 'role/user', label: '관리자 권한 회수' }
                                  : { id: detail.id, action: 'role/admin', label: '관리자 권한 부여' },
                              )}
                            >
                              {detail.role === 'ADMIN' ? '권한 회수' : '관리자 부여'}
                            </button>
                            <button type="button" className={PANEL_BTN_DANGER} onClick={() => updateStatus(detail.id, 'INACTIVE')}>
                              비활성화
                            </button>
                          </>
                        )}
                        {!isSelf && detail.status === 'INACTIVE' && (
                          <button type="button" className={PANEL_BTN_PRIMARY} onClick={() => updateStatus(detail.id, 'ACTIVE')}>
                            다시 활성화
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  </div>
                </aside>
              )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 border-t border-line-soft px-[22px] py-2.5 text-[12px] text-ink-3">
              <span>총 <strong className="font-mono font-semibold text-ink">{totalElements}</strong>명</span>
              <label className="flex items-center gap-2">
                페이지당
                <select
                  className="select-chevron h-8 rounded-ctl border border-line-field bg-field pl-2.5 pr-8 text-[12px] text-ink outline-none transition-colors focus:border-teal-edge"
                  value={pageSize}
                  onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0) }}
                >
                  <option value={20}>20명</option><option value={50}>50명</option><option value={100}>100명</option>
                </select>
              </label>
              <nav className="ml-auto flex items-center gap-1" aria-label="회원 목록 페이지">
                <button type="button" disabled={page === 0} className="h-8 rounded-ctl border border-line-btn px-2.5 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setPage((current) => current - 1)}>이전</button>
                {pageNumbers.map((pageNumber) => (
                  <button
                    type="button"
                    key={pageNumber}
                    aria-current={page === pageNumber ? 'page' : undefined}
                    className={`size-8 rounded-ctl font-mono text-[12px] font-semibold transition-colors ${
                      page === pageNumber ? 'border border-teal-btn-edge bg-teal-wash-strong text-teal-text' : 'border border-line-btn text-ink-2 hover:bg-hover'
                    }`}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber + 1}
                  </button>
                ))}
                <button type="button" disabled={page + 1 >= totalPages} className="h-8 rounded-ctl border border-line-btn px-2.5 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setPage((current) => current + 1)}>다음</button>
              </nav>
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex h-[34px] items-center gap-3 border-b border-line-soft px-[22px] text-[11px] font-medium tracking-[.08em] text-ink-4">
              {ACTIVITY_COLUMNS.map((column) => {
                const place = columnStyle(column)
                return (
                  <span key={column.key} className={`${place.className} truncate`} style={place.style}>
                    {column.label}
                  </span>
                )
              })}
            </div>

            {activitiesLoading && activities.length === 0 && (
              <p className="px-[22px] py-10 text-center text-[12.5px] text-ink-4">관리자 활동 로그를 불러오는 중입니다…</p>
            )}
            {!activitiesLoading && activitiesError && activities.length === 0 && (
              <div className="px-[22px] py-10 text-center">
                <p className="text-[12.5px] text-danger">{activitiesError}</p>
                <button type="button" className={`${BTN_SM_SECONDARY} mt-3`} onClick={() => void loadActivities()}>다시 시도</button>
              </div>
            )}
            {!activitiesLoading && !activitiesError && activities.length === 0 && (
              <p className="px-[22px] py-10 text-center text-[12.5px] text-ink-4">기록된 관리자 활동이 없습니다.</p>
            )}

            {activities.map((activity) => (
              <div key={activity.id} className="flex h-11 w-full items-center gap-3 border-b border-line-row px-[22px]">
                {ACTIVITY_COLUMNS.map((column) => {
                  const place = columnStyle(column)
                  return (
                    <span key={column.key} className={place.className} style={place.style}>
                      <ActivityCell column={column.key} activity={activity} />
                    </span>
                  )
                })}
              </div>
            ))}

            {activitiesError && activities.length > 0 && (
              <p className="mx-[22px] mt-3 rounded-pop border border-danger-btn-edge bg-danger-wash px-4 py-2.5 text-center text-[12.5px] text-danger">{activitiesError}</p>
            )}
            {nextCursor && (
              <div className="px-[22px] py-4">
                <button type="button" disabled={activitiesLoading} className={`${BTN_SM_SECONDARY} h-10 w-full`} onClick={() => void loadActivities(nextCursor)}>
                  {activitiesLoading ? '불러오는 중…' : '활동 더 보기'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {pendingChange && (
        <ConfirmDialog
          message={`해당 사용자를 ${pendingChange.label}할까요?`}
          confirmLabel={pendingChange.label}
          cancelLabel="취소"
          danger={pendingChange.action === 'deactivate' || pendingChange.action === 'reject'}
          busy={changingStatus}
          busyLabel="처리 중…"
          error={changeError}
          onConfirm={applyStatusChange}
          onCancel={() => { setPendingChange(null); setChangeError('') }}
        />
      )}
    </main>
  )
}

/** 열 하나의 값 — 열 구성과 같은 순서로 돌기 때문에 머리와 줄이 어긋나지 않는다 */
function Cell({ column, user }: { column: ColumnKey; user: ManagedUser }) {
  if (column === 'name') {
    return (
      <span className="flex items-center gap-2.5">
        <UserAvatar name={user.name} className="size-[30px] text-[11.5px]" />
        <span className="truncate text-[13px] font-semibold text-ink">{user.name}</span>
      </span>
    )
  }
  if (column === 'email') return <span className="block truncate font-mono text-[11.5px] text-ink-3">{user.email}</span>
  if (column === 'role') {
    return <span className="block truncate font-mono text-[11px] font-semibold tracking-[.06em] text-ink-3">{user.role}</span>
  }
  if (column === 'status') {
    return (
      <span className={`inline-flex rounded-chip px-2 py-0.5 text-[10.5px] font-semibold ${STATUS_TONE[user.status]}`}>
        {STATUS_LABEL[user.status]}
      </span>
    )
  }
  return <span className="block truncate text-[12.5px] text-ink-3">{user[column]}</span>
}

/** 활동 로그 한 칸 */
function ActivityCell({ column, activity }: { column: ActivityColumnKey; activity: AdminActivity }) {
  if (column === 'createdAt') {
    return <span className="block truncate font-mono text-[11.5px] text-ink-3">{new Date(activity.createdAt).toLocaleString('ko-KR')}</span>
  }
  if (column === 'activityType') {
    return (
      <span className="inline-flex max-w-full truncate rounded-chip border border-line-field bg-hover px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">
        {ACTIVITY_LABEL[activity.activityType] ?? activity.activityType}
      </span>
    )
  }
  // 응답이 id 만 주므로 id 만 보여 준다 — 이름을 함께 세우려면 응답에 이름이 실려야 한다
  if (column === 'actor') return <span className="block truncate font-mono text-[11.5px] text-ink-3">#{activity.actorAdminId}</span>
  if (column === 'target') return <span className="block truncate font-mono text-[11.5px] text-ink-3">#{activity.targetMemberId}</span>
  return <span className="block truncate text-[12.5px] text-ink-2">{activity.message}</span>
}

/** 열 이름이 곧 정렬 버튼이다 — 같은 열을 다시 누르면 방향이 뒤집힌다 */
function SortHeader(props: {
  field: SortField
  label: string
  sort: { field: SortField; direction: SortDirection }
  onSort: (field: SortField) => void
  className?: string
  style?: { width?: number }
}) {
  const active = props.sort.field === props.field
  const nextDirection = active && props.sort.direction === 'ASC' ? '내림차순' : '오름차순'
  return (
    <button
      type="button"
      onClick={() => props.onSort(props.field)}
      title={`${props.label} ${nextDirection} 정렬`}
      aria-label={`${props.label} ${nextDirection} 정렬`}
      style={props.style}
      className={`flex items-center gap-1 text-left transition-colors hover:text-ink-2 ${active ? 'text-teal-text' : ''} ${props.className ?? ''}`}
    >
      <span className="truncate">{props.label}</span>
      {/* 켜진 열에만 방향을 표시한다 — 나머지 열까지 표를 채우면 이름이 묻힌다 */}
      {active && (
        <svg viewBox="0 0 24 24" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {props.sort.direction === 'ASC' ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M18 13l-6 6-6-6" />}
        </svg>
      )}
    </button>
  )
}

/** 읽을 때는 값만 보이고 고칠 때만 입력칸이 된다 — 상자가 늘 서 있으면 읽기가 어렵다 */
function Field(props: { label: string; value: string; editing: boolean; mono?: boolean; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-line-row py-2">
      <dt className="w-[78px] shrink-0 text-[11.5px] text-ink-4">{props.label}</dt>
      <dd className="min-w-0 flex-1">
        {props.editing ? (
          // 라벨은 dt 에 있어 입력칸과 이어지지 않는다 — 화면 낭독기가 이름을 읽도록 같은 문구를 붙인다
          <input aria-label={props.label} value={props.value} onChange={(e) => props.onChange(e.target.value)} className={FIELD} />
        ) : (
          <span className={`block truncate text-[13px] text-ink-2 ${props.mono ? 'font-mono' : ''}`}>{props.value}</span>
        )}
      </dd>
    </div>
  )
}

/** 값이 목록에 없을 수 있다(백엔드에 새 값이 생긴 경우) — 그 값도 고를 수 있게 함께 세운다 */
function SelectField(props: {
  label: string
  value: string
  options: readonly string[]
  editing: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line-row py-2">
      <dt className="w-[78px] shrink-0 text-[11.5px] text-ink-4">{props.label}</dt>
      <dd className="min-w-0 flex-1">
        {props.editing ? (
          <select
            aria-label={props.label}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            className={FIELD_SELECT}
          >
            {!isKnownValue(props.options, props.value) && <option value={props.value} disabled>{props.value}</option>}
            {props.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        ) : (
          <span className="block truncate text-[13px] text-ink-2">{props.value}</span>
        )}
      </dd>
    </div>
  )
}
