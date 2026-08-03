import { useCallback, useEffect, useRef, useState } from 'react'
import { changeAdminMember, getAdminActivities, getAdminMemberCounts, getAdminMembers, updateAdminMember, DISTRICTS, POSITIONS, TEAMS } from '@/entities/user'
import type { AdminActivity, AdminMemberAction, AdminMemberSortBy, ManagedUser, SortDirection, UserStatus } from '@/entities/user'
import { AppHeader, UsersIcon } from '@/widgets/app-header'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { BTN_SM_SECONDARY } from '@/shared/ui/classes'

interface AdminUsersPageProps {
  onBack: () => void
}

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: '승인 대기',
  ACTIVE: '사용 중',
  INACTIVE: '비활성',
}

/** 상태별 색 — 승인 대기는 앰버, 사용 중은 청록, 비활성은 죽인 회색 */
const STATUS_TONE: Record<UserStatus, string> = {
  PENDING: 'bg-amber-wash text-amber',
  ACTIVE: 'bg-teal-wash-strong text-teal-text',
  INACTIVE: 'bg-soft text-ink-3',
}

/** 표 안 버튼 — 줄 높이에 맞춘 작은 규격 */
const CELL_BTN = 'h-8 whitespace-nowrap rounded-ctl border px-2.5 text-[11.5px] font-semibold transition-colors disabled:opacity-40'
const CELL_BTN_NEUTRAL = `${CELL_BTN} border-line-btn text-ink-2 hover:bg-hover`
const CELL_BTN_PRIMARY = `${CELL_BTN} border-teal-btn-edge bg-teal-wash text-teal-label hover:bg-teal-wash-strong`
const CELL_BTN_DANGER = `${CELL_BTN} border-danger-btn-edge bg-danger-wash text-danger hover:bg-danger-wash-strong`

type SortField = 'name' | 'email' | 'district' | 'team' | 'position' | 'role' | 'status'
type SearchField = 'name' | 'email' | 'phone'
const API_SORT_FIELD: Record<SortField, AdminMemberSortBy> = {
  name: 'name', email: 'email', district: 'district', team: 'team', position: 'position', role: 'memberRole', status: 'memberStatus',
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

export function AdminUsersPage({ onBack }: AdminUsersPageProps) {
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ManagedUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [pendingChange, setPendingChange] = useState<{ id: string; action: AdminMemberAction; status?: UserStatus; label: string } | null>(null)
  const memberRequestId = useRef(0)

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

  const changeSort = (field: SortField) => {
    const nextSort = {
      field,
      direction: sort.field === field && sort.direction === 'ASC' ? 'DESC' as const : 'ASC' as const,
    }
    setSort(nextSort)
    setPage(0)
  }

  const sortHeader = (label: string, field: SortField, className: string) => {
    const active = sort.field === field
    return (
      <th className={className} aria-sort={active ? (sort.direction === 'ASC' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className={`flex w-full items-center gap-1 text-left transition-colors hover:text-ink-2 ${active ? 'text-teal-text' : ''}`} onClick={() => changeSort(field)}>
          {label}<span aria-hidden="true" className="text-[10px]">{active ? (sort.direction === 'ASC' ? '▲' : '▼') : '↕'}</span>
        </button>
      </th>
    )
  }

  const plainHeader = (label: string, className: string, reason: string) => <th className={className} title={reason}>{label}</th>

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
    try {
      await changeAdminMember(id, action)
      setPendingChange(null)
      await Promise.all([loadMembers(), loadCounts(), loadActivities()])
    } catch (e) {
      setError(e instanceof Error ? e.message : '회원 상태를 변경하지 못했습니다.')
    } finally {
      setChangingStatus(false)
    }
  }

  const startEditing = (user: ManagedUser) => {
    setError('')
    setEditingId(user.id)
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
      setEditingId(null)
      setDraft(null)
      await Promise.all([loadMembers(), loadActivities()])
    } catch (e) {
      setError(e instanceof Error ? e.message : '회원 정보를 수정하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const firstPageNumber = Math.min(Math.max(page - 2, 0), Math.max(totalPages - 5, 0))
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstPageNumber + index)

  return (
    <main className="app-bg h-full overflow-y-auto text-ink">
      {/* 헤더는 지도 화면과 같은 것을 쓴다 — 탭 자리만 이 화면의 이름으로 바꾼다 */}
      <AppHeader onHome={onBack} title={{ label: '사용자 관리', icon: <UsersIcon className="size-[18px]" /> }} isAdmin />

      <section className="mx-auto max-w-[1500px] px-5 pb-10 pt-[92px]">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-medium tracking-[.08em] text-teal-text">관리자 전용</p>
            <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-.02em] text-ink">사용자 관리</h1>
            <span className="mt-2 block text-[12.5px] text-ink-3">가입 신청을 승인하고 사용자 정보와 서비스 이용 상태를 관리합니다.</span>
          </div>
          <button className={`${BTN_SM_SECONDARY} h-11 px-5`} type="button" onClick={onBack}>지도로 돌아가기</button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 [&>div]:flex [&>div]:flex-col [&>div]:rounded-pop [&>div]:border [&>div]:border-line [&>div]:bg-panel [&>div]:p-5 [&_span]:text-[12.5px] [&_span]:text-ink-3 [&_strong]:mt-2 [&_strong]:font-mono [&_strong]:text-[26px] [&_strong]:font-semibold">
          <div><span>전체 사용자</span><strong className="text-ink">{counts.ALL}</strong></div>
          <div><span>승인 대기</span><strong className="text-amber">{counts.PENDING}</strong></div>
          <div><span>사용 중</span><strong className="text-teal-text">{counts.ACTIVE}</strong></div>
          <div><span>비활성</span><strong className="text-ink-4">{counts.INACTIVE}</strong></div>
        </div>

        {error && <p className="mt-5 rounded-pop border border-danger-btn-edge bg-danger-wash p-4 text-[12.5px] text-danger" role="alert">{error}</p>}
        {loading && <p className="mt-5 rounded-pop border border-line bg-panel p-10 text-center text-[12.5px] text-ink-4">사용자 정보를 불러오는 중입니다…</p>}

        <div className="mt-6 flex flex-col justify-between gap-3 lg:flex-row">
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PENDING', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
              <button
                type="button"
                key={status}
                aria-pressed={filter === status}
                className={`flex h-[34px] items-center gap-1.5 rounded-ctl px-3.5 text-[12px] font-medium transition-colors ${
                  filter === status ? 'bg-teal-wash-strong text-teal-text' : 'text-ink-3 hover:bg-hover hover:text-ink-2'
                }`}
                onClick={() => { setFilter(status); setPage(0) }}
              >
                {status === 'ALL' ? '전체' : STATUS_LABEL[status]}
                <span className="font-mono">{counts[status]}</span>
              </button>
            ))}
          </div>
          <div className="flex min-w-0 gap-2">
            <select className="select-chevron h-11 rounded-ctl border border-line-field bg-field pl-3 pr-9 text-[12.5px] font-medium text-ink outline-none transition-colors focus:border-teal-edge" value={searchField} onChange={(event) => { setSearchField(event.target.value as SearchField); setPage(0) }}>
              <option value="name">이름</option><option value="email">이메일</option><option value="phone">전화번호</option>
            </select>
            <input className="h-11 min-w-0 flex-1 rounded-ctl border border-line-field bg-field px-4 text-[12.5px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-teal-edge lg:min-w-72" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder={`${searchField === 'name' ? '이름' : searchField === 'email' ? '이메일' : '전화번호'} 검색`} />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-pop border border-line bg-panel shadow-pill">
          <table className="w-full min-w-[1320px] table-fixed text-left text-[12.5px]">
            <thead className="border-b border-line-soft bg-soft text-[11px] font-medium tracking-[.04em] text-ink-4">
              <tr>
                {sortHeader('이름', 'name', 'w-28 px-4 py-3')}
                {plainHeader('전화번호', 'w-36 px-3 py-3', '백엔드에서 전화번호 정렬을 지원하지 않습니다.')}
                {sortHeader('이메일', 'email', 'w-56 px-3 py-3')}
                {sortHeader('구청', 'district', 'w-24 px-3 py-3')}
                {plainHeader('소속 과', 'w-28 px-3 py-3', '백엔드에서 소속 과 정렬을 지원하지 않습니다.')}
                {sortHeader('팀명', 'team', 'w-32 px-3 py-3')}
                {sortHeader('직위', 'position', 'w-24 px-3 py-3')}
                {sortHeader('권한', 'role', 'w-20 px-3 py-3')}
                {sortHeader('상태', 'status', 'w-24 px-3 py-3')}
                <th className="w-72 px-4 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-row text-ink-2">
              {!loading && users.length === 0 && <tr><td colSpan={10} className="px-4 py-12 text-center text-[12.5px] text-ink-4">조건에 맞는 사용자가 없습니다.</td></tr>}
              {users.map((user) => {
                const isEditing = editingId === user.id && draft
                const current = isEditing ? draft : user
                const fieldClass = 'h-9 w-full rounded-ctl border border-line-field bg-field px-2 text-[12.5px] text-ink outline-none transition-colors focus:border-teal-edge'

                return (
                  <tr className="transition-colors hover:bg-hover" key={user.id}>
                    <td className="px-4 py-3">{isEditing ? <input className={fieldClass} value={current.name} onChange={(e) => setDraft({ ...current, name: e.target.value })} /> : <><strong className="block truncate font-semibold text-ink">{current.name}</strong><span className="font-mono text-[10.5px] text-ink-4">#{current.id}</span></>}</td>
                    <td className="px-3 py-3">{isEditing ? <input className={fieldClass} value={current.phone} onChange={(e) => setDraft({ ...current, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} /> : <span className="whitespace-nowrap font-mono">{current.phone}</span>}</td>
                    <td className="px-3 py-3">{isEditing ? <input className={fieldClass} type="email" value={current.email} onChange={(e) => setDraft({ ...current, email: e.target.value })} /> : <span className="block truncate" title={current.email}>{current.email}</span>}</td>
                    <td className="px-3 py-3">{isEditing ? <select className={`select-chevron ${fieldClass} pr-8`} value={current.district} onChange={(e) => setDraft({ ...current, district: e.target.value as ManagedUser['district'] })}>{!isKnownValue(DISTRICTS, current.district) && <option value={current.district} disabled>{current.district}</option>}{DISTRICTS.map((value) => <option key={value}>{value}</option>)}</select> : current.district}</td>
                    <td className="px-3 py-3">{isEditing ? <input className={fieldClass} value={current.department} onChange={(e) => setDraft({ ...current, department: e.target.value })} /> : current.department}</td>
                    <td className="px-3 py-3">{isEditing ? <select className={`select-chevron ${fieldClass} pr-8`} value={current.team} onChange={(e) => setDraft({ ...current, team: e.target.value as ManagedUser['team'] })}>{!isKnownValue(TEAMS, current.team) && <option value={current.team} disabled>{current.team}</option>}{TEAMS.map((value) => <option key={value}>{value}</option>)}</select> : current.team}</td>
                    <td className="px-3 py-3">{isEditing ? <select className={`select-chevron ${fieldClass} pr-8`} value={current.position} onChange={(e) => setDraft({ ...current, position: e.target.value as ManagedUser['position'] })}>{!isKnownValue(POSITIONS, current.position) && <option value={current.position} disabled>{current.position}</option>}{POSITIONS.map((value) => <option key={value}>{value}</option>)}</select> : current.position}</td>
                    <td className="px-3 py-3 font-mono text-[11px] font-semibold tracking-[.06em] text-ink-3">{current.role}</td>
                    <td className="px-3 py-3"><span className={`inline-flex whitespace-nowrap rounded-chip px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONE[current.status]}`}>{STATUS_LABEL[current.status]}</span></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                      {isEditing ? <><button type="button" disabled={saving} className={CELL_BTN_NEUTRAL} onClick={() => { setEditingId(null); setDraft(null) }}>취소</button><button type="button" disabled={saving} className={CELL_BTN_PRIMARY} onClick={saveEditing}>{saving ? '저장 중…' : '저장'}</button></> : <>
                        <button type="button" className={CELL_BTN_NEUTRAL} onClick={() => startEditing(user)}>수정</button>
                        {user.status === 'PENDING' && <><button type="button" className={CELL_BTN_DANGER} onClick={() => setPendingChange({ id: user.id, action: 'reject', label: '가입 거절' })}>거절</button><button type="button" className={CELL_BTN_PRIMARY} onClick={() => updateStatus(user.id, 'ACTIVE')}>승인</button></>}
                        {user.status === 'ACTIVE' && <button type="button" className={CELL_BTN_NEUTRAL} onClick={() => updateStatus(user.id, 'INACTIVE')}>비활성</button>}
                        {user.status === 'INACTIVE' && <button type="button" className={CELL_BTN_PRIMARY} onClick={() => updateStatus(user.id, 'ACTIVE')}>활성화</button>}
                        {user.status === 'ACTIVE' && (user.role === 'ADMIN' ? <button type="button" className={CELL_BTN_NEUTRAL} onClick={() => setPendingChange({ id: user.id, action: 'role/user', label: '관리자 권한 회수' })}>권한 회수</button> : <button type="button" className={CELL_BTN_PRIMARY} onClick={() => setPendingChange({ id: user.id, action: 'role/admin', label: '관리자 부여' })}>관리자 부여</button>)}
                      </>}
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-pop border border-line bg-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-[12.5px] text-ink-3">
            <span>총 <strong className="font-mono font-semibold text-ink">{totalElements}</strong>명</span>
            <label className="flex items-center gap-2">페이지당
              <select className="select-chevron h-9 rounded-ctl border border-line-field bg-field pl-2.5 pr-8 text-[12.5px] text-ink outline-none transition-colors focus:border-teal-edge" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0) }}>
                <option value={20}>20명</option><option value={50}>50명</option><option value={100}>100명</option>
              </select>
            </label>
          </div>
          <nav className="flex items-center justify-end gap-1" aria-label="회원 목록 페이지">
            <button type="button" disabled={page === 0} className="h-9 rounded-ctl border border-line-btn px-3 text-[12.5px] font-semibold text-ink-2 transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setPage((current) => current - 1)}>이전</button>
            {pageNumbers.map((pageNumber) => <button type="button" key={pageNumber} aria-current={page === pageNumber ? 'page' : undefined} className={`size-9 rounded-ctl font-mono text-[12.5px] font-semibold transition-colors ${page === pageNumber ? 'border border-teal-btn-edge bg-teal-wash-strong text-teal-text' : 'border border-line-btn text-ink-2 hover:bg-hover'}`} onClick={() => setPage(pageNumber)}>{pageNumber + 1}</button>)}
            <button type="button" disabled={page + 1 >= totalPages} className="h-9 rounded-ctl border border-line-btn px-3 text-[12.5px] font-semibold text-ink-2 transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setPage((current) => current + 1)}>다음</button>
          </nav>
        </div>

        <section className="mt-10" aria-labelledby="activity-title">
          <p className="text-[11px] font-medium tracking-[.08em] text-teal-text">감사 기록</p>
          <h2 id="activity-title" className="mt-1.5 text-[20px] font-semibold tracking-[-.02em] text-ink">관리자 활동 로그</h2>
          <div className="mt-4 overflow-hidden rounded-pop border border-line bg-panel">
            {activitiesLoading && activities.length === 0 && <p className="p-8 text-center text-[12.5px] text-ink-4">관리자 활동 로그를 불러오는 중입니다…</p>}
            {!activitiesLoading && activitiesError && activities.length === 0 && <div className="p-8 text-center"><p className="text-[12.5px] text-danger">{activitiesError}</p><button type="button" className={`${BTN_SM_SECONDARY} mt-3`} onClick={() => void loadActivities()}>다시 시도</button></div>}
            {!activitiesLoading && !activitiesError && activities.length === 0 && <p className="p-8 text-center text-[12.5px] text-ink-4">기록된 관리자 활동이 없습니다.</p>}
            {activities.map((activity) => (
              <div key={activity.id} className="flex flex-col gap-1 border-b border-line-row px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div><strong className="text-[12.5px] font-semibold text-ink">{activity.message}</strong><p className="mt-1 font-mono text-[11px] text-ink-4">관리자 #{activity.actorAdminId} · 대상 회원 #{activity.targetMemberId} · {activity.activityType}</p></div>
                <time className="font-mono text-[11px] text-ink-4">{new Date(activity.createdAt).toLocaleString('ko-KR')}</time>
              </div>
            ))}
          </div>
          {activitiesError && activities.length > 0 && <p className="mt-3 rounded-pop border border-danger-btn-edge bg-danger-wash p-3 text-center text-[12.5px] text-danger">{activitiesError}</p>}
          {nextCursor && <button type="button" disabled={activitiesLoading} className={`${BTN_SM_SECONDARY} mt-3 h-11 w-full`} onClick={() => void loadActivities(nextCursor)}>{activitiesLoading ? '불러오는 중…' : '활동 더 보기'}</button>}
        </section>
      </section>

      {pendingChange && (
        <ConfirmDialog
          message={`해당 사용자를 ${pendingChange.label}할까요?`}
          confirmLabel={pendingChange.label}
          cancelLabel="취소"
          danger={pendingChange.action === 'deactivate' || pendingChange.action === 'reject'}
          busy={changingStatus}
          busyLabel="처리 중…"
          onConfirm={applyStatusChange}
          onCancel={() => setPendingChange(null)}
        />
      )}
    </main>
  )
}
