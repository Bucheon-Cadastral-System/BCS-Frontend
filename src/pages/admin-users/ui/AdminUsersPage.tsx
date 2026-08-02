import { useEffect, useMemo, useState } from 'react'
import { changeAdminMember, getAdminActivities, getAdminMembers, updateAdminMember, DISTRICTS, POSITIONS, TEAMS } from '@/entities/user'
import type { AdminActivity, AdminMemberAction, AdminMemberSortBy, ManagedUser, SortDirection, UserStatus } from '@/entities/user'
import { AppHeader } from '@/shared/ui/AppHeader'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'

interface AdminUsersPageProps {
  onBack: () => void
}

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: '승인 대기',
  ACTIVE: '사용 중',
  INACTIVE: '비활성',
}

type SortField = 'name' | 'phone' | 'email' | 'district' | 'department' | 'team' | 'position' | 'role' | 'status'
const API_SORT_FIELD: Partial<Record<SortField, AdminMemberSortBy>> = {
  name: 'name', email: 'email', district: 'district', team: 'team', position: 'position', role: 'memberRole', status: 'memberStatus',
}

/** 확인 문구는 목표 상태만으로 정해지지 않는다 — 같은 ACTIVE라도 대기 중이면 승인, 비활성이면 재활성화다. */
function actionLabelOf(from: UserStatus, to: UserStatus): string {
  if (to === 'ACTIVE') return from === 'INACTIVE' ? '다시 활성화' : '승인'
  if (to === 'INACTIVE') return '비활성화'
  return '상태 변경'
}

export function AdminUsersPage({ onBack }: AdminUsersPageProps) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activities, setActivities] = useState<AdminActivity[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | UserStatus>('ALL')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({ field: 'name', direction: 'ASC' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ManagedUser | null>(null)
  const [pendingChange, setPendingChange] = useState<{ id: string; action: AdminMemberAction; status?: UserStatus; label: string } | null>(null)

  const loadActivities = async (cursor?: string) => {
    const result = await getAdminActivities(cursor)
    setActivities((current) => cursor ? [...current, ...result.content] : result.content)
    setNextCursor(result.nextCursor)
  }

  const reload = async (nextSort = sort) => {
    setLoading(true)
    setError('')
    try {
      const apiSortBy = API_SORT_FIELD[nextSort.field] ?? 'name'
      const members = await getAdminMembers(apiSortBy, nextSort.direction)
      setUsers(members)
      await loadActivities()
    } catch (e) {
      setError(e instanceof Error ? e.message : '관리자 정보를 불러오지 못했습니다.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void reload() }, [])

  const counts = useMemo(() => ({
    ALL: users.length,
    PENDING: users.filter((user) => user.status === 'PENDING').length,
    ACTIVE: users.filter((user) => user.status === 'ACTIVE').length,
    INACTIVE: users.filter((user) => user.status === 'INACTIVE').length,
  }), [users])

  const visibleUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const filtered = users.filter((user) => {
      const matchesStatus = filter === 'ALL' || user.status === filter
      const matchesQuery = !keyword || [
        user.name,
        user.email,
        user.phone,
        user.district,
        user.team,
      ].some((value) => value.toLowerCase().includes(keyword))
      return matchesStatus && matchesQuery
    })
    if (sort.field !== 'phone' && sort.field !== 'department') return filtered
    return [...filtered].sort((a, b) => {
      const result = a[sort.field].localeCompare(b[sort.field], 'ko', { numeric: true })
      return sort.direction === 'ASC' ? result : -result
    })
  }, [filter, query, sort, users])

  const changeSort = (field: SortField) => {
    const nextSort = {
      field,
      direction: sort.field === field && sort.direction === 'ASC' ? 'DESC' as const : 'ASC' as const,
    }
    setSort(nextSort)
    if (API_SORT_FIELD[field]) void reload(nextSort)
  }

  const sortHeader = (label: string, field: SortField, className: string) => {
    const active = sort.field === field
    return (
      <th className={className} aria-sort={active ? (sort.direction === 'ASC' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className={`flex w-full items-center gap-1 text-left transition hover:text-slate-900 ${active ? 'text-teal-700' : ''}`} onClick={() => changeSort(field)}>
          {label}<span aria-hidden="true" className="text-[10px]">{active ? (sort.direction === 'ASC' ? '▲' : '▼') : '↕'}</span>
        </button>
      </th>
    )
  }

  const updateStatus = (id: string, status: UserStatus) => {
    const current = users.find((user) => user.id === id)
    if (!current) return
    const action = status === 'INACTIVE' ? 'deactivate' : current.status === 'PENDING' ? 'approve' : 'activate'
    setPendingChange({ id, action, status, label: actionLabelOf(current.status, status) })
  }

  const applyStatusChange = async () => {
    if (!pendingChange) return
    const { id, action, status } = pendingChange
    try {
      await changeAdminMember(id, action)
      if (action === 'reject') setUsers(users.filter((user) => user.id !== id))
      else setUsers(users.map((user) => user.id === id ? { ...user, ...(status ? { status } : {}), ...(action === 'role/admin' ? { role: 'ADMIN' as const } : {}), ...(action === 'role/user' ? { role: 'USER' as const } : {}) } : user))
      setPendingChange(null)
      await loadActivities()
    } catch (e) { setError(e instanceof Error ? e.message : '회원 상태를 변경하지 못했습니다.') }
  }

  const startEditing = (user: ManagedUser) => {
    setEditingId(user.id)
    setDraft({ ...user })
  }

  const saveEditing = async () => {
    if (!draft) return
    try {
      await updateAdminMember(draft)
      setUsers(users.map((user) => user.id === draft.id ? draft : user))
      setEditingId(null)
      setDraft(null)
      await loadActivities()
    } catch (e) { setError(e instanceof Error ? e.message : '회원 정보를 수정하지 못했습니다.') }
  }

  return (
    <main className="min-h-full bg-slate-100 text-slate-900">
      {/* 화면 이름과 지도로 돌아가기는 아래 본문에 있으므로 헤더에는 아이덴티티와 권한 표시만 둔다 */}
      <AppHeader>
        <span className="rounded-full bg-teal-500/20 px-2.5 py-1 text-xs font-bold text-teal-300">ADMIN</span>
      </AppHeader>

      <section className="mx-auto max-w-[1500px] px-5 py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold text-teal-600">관리자 전용</p>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em]">사용자 관리</h1>
            <span className="mt-2 block text-sm text-slate-500">가입 신청을 승인하고 사용자 정보와 서비스 이용 상태를 관리합니다.</span>
          </div>
          <button className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-bold text-slate-600 hover:bg-slate-50" type="button" onClick={onBack}>지도로 돌아가기</button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 [&>div]:flex [&>div]:flex-col [&>div]:rounded-2xl [&>div]:border [&>div]:border-slate-200 [&>div]:bg-white [&>div]:p-5 [&_span]:text-sm [&_span]:text-slate-500 [&_strong]:mt-2 [&_strong]:text-3xl">
          <div><span>전체 사용자</span><strong>{counts.ALL}</strong></div>
          <div><span>승인 대기</span><strong className="text-amber-600">{counts.PENDING}</strong></div>
          <div><span>사용 중</span><strong className="text-teal-600">{counts.ACTIVE}</strong></div>
          <div><span>비활성</span><strong className="text-slate-400">{counts.INACTIVE}</strong></div>
        </div>

        {error && <p className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700" role="alert">{error}</p>}
        {loading && <p className="mt-5 rounded-2xl bg-white p-10 text-center text-slate-400">사용자 정보를 불러오는 중입니다…</p>}

        <div className="mt-6 flex flex-col justify-between gap-3 lg:flex-row">
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PENDING', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
              <button
                type="button"
                key={status}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${filter === status ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setFilter(status)}
              >
                {status === 'ALL' ? '전체' : STATUS_LABEL[status]} {counts[status]}
              </button>
            ))}
          </div>
          <input className="min-h-11 min-w-72 rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-teal-500"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름, 이메일, 전화번호, 소속 검색"
          />
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1320px] table-fixed text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                {sortHeader('이름', 'name', 'w-28 px-4 py-3')}
                {sortHeader('전화번호', 'phone', 'w-36 px-3 py-3')}
                {sortHeader('이메일', 'email', 'w-56 px-3 py-3')}
                {sortHeader('구청', 'district', 'w-24 px-3 py-3')}
                {sortHeader('소속 과', 'department', 'w-28 px-3 py-3')}
                {sortHeader('팀명', 'team', 'w-32 px-3 py-3')}
                {sortHeader('직위', 'position', 'w-24 px-3 py-3')}
                {sortHeader('권한', 'role', 'w-20 px-3 py-3')}
                {sortHeader('상태', 'status', 'w-24 px-3 py-3')}
                <th className="w-72 px-4 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleUsers.length === 0 && <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">조건에 맞는 사용자가 없습니다.</td></tr>}
              {visibleUsers.map((user) => {
                const isEditing = editingId === user.id && draft
                const current = isEditing ? draft : user
                const fieldClass = 'h-9 w-full rounded-md border border-teal-300 bg-white px-2 outline-none focus:ring-2 focus:ring-teal-100'

                return (
                  <tr className="transition hover:bg-slate-50/70" key={user.id}>
                    <td className="px-4 py-3">{isEditing ? <input className={fieldClass} value={current.name} onChange={(e) => setDraft({ ...current, name: e.target.value })} /> : <><strong className="block truncate">{current.name}</strong><span className="text-[11px] text-slate-400">#{current.id}</span></>}</td>
                    <td className="px-3 py-3">{isEditing ? <input className={fieldClass} value={current.phone} onChange={(e) => setDraft({ ...current, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} /> : <span className="whitespace-nowrap">{current.phone}</span>}</td>
                    <td className="px-3 py-3">{isEditing ? <input className={fieldClass} type="email" value={current.email} onChange={(e) => setDraft({ ...current, email: e.target.value })} /> : <span className="block truncate" title={current.email}>{current.email}</span>}</td>
                    <td className="px-3 py-3">{isEditing ? <select className={fieldClass} value={current.district} onChange={(e) => setDraft({ ...current, district: e.target.value as ManagedUser['district'] })}>{DISTRICTS.map((value) => <option key={value}>{value}</option>)}</select> : current.district}</td>
                    <td className="px-3 py-3">{isEditing ? <input className={fieldClass} value={current.department} onChange={(e) => setDraft({ ...current, department: e.target.value })} /> : current.department}</td>
                    <td className="px-3 py-3">{isEditing ? <select className={fieldClass} value={current.team} onChange={(e) => setDraft({ ...current, team: e.target.value as ManagedUser['team'] })}>{TEAMS.map((value) => <option key={value}>{value}</option>)}</select> : current.team}</td>
                    <td className="px-3 py-3">{isEditing ? <select className={fieldClass} value={current.position} onChange={(e) => setDraft({ ...current, position: e.target.value as ManagedUser['position'] })}>{POSITIONS.map((value) => <option key={value}>{value}</option>)}</select> : current.position}</td>
                    <td className="px-3 py-3 text-xs font-bold text-slate-500">{current.role}</td>
                    <td className="px-3 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${current.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : current.status === 'ACTIVE' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>{STATUS_LABEL[current.status]}</span></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1.5 [&_button]:h-8 [&_button]:whitespace-nowrap [&_button]:rounded-md [&_button]:px-2.5 [&_button]:text-xs [&_button]:font-bold">
                      {isEditing ? <><button type="button" className="border border-slate-200 text-slate-600" onClick={() => { setEditingId(null); setDraft(null) }}>취소</button><button type="button" className="bg-teal-600 text-white" onClick={saveEditing}>저장</button></> : <>
                        <button type="button" className="border border-slate-200 text-slate-600" onClick={() => startEditing(user)}>수정</button>
                        {user.status === 'PENDING' && <><button type="button" className="border border-rose-200 text-rose-600" onClick={() => setPendingChange({ id: user.id, action: 'reject', label: '가입 거절' })}>거절</button><button type="button" className="bg-teal-600 text-white" onClick={() => updateStatus(user.id, 'ACTIVE')}>승인</button></>}
                        {user.status === 'ACTIVE' && <button type="button" className="bg-slate-700 text-white" onClick={() => updateStatus(user.id, 'INACTIVE')}>비활성</button>}
                        {user.status === 'INACTIVE' && <button type="button" className="bg-teal-600 text-white" onClick={() => updateStatus(user.id, 'ACTIVE')}>활성화</button>}
                        {user.status === 'ACTIVE' && (user.role === 'ADMIN' ? <button type="button" className="border border-slate-300 text-slate-600" onClick={() => setPendingChange({ id: user.id, action: 'role/user', label: '관리자 권한 회수' })}>권한 회수</button> : <button type="button" className="border border-teal-200 text-teal-700" onClick={() => setPendingChange({ id: user.id, action: 'role/admin', label: '관리자 권한 부여' })}>관리자 부여</button>)}
                      </>}
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <section className="mt-10" aria-labelledby="activity-title">
          <p className="text-sm font-bold text-teal-600">감사 기록</p>
          <h2 id="activity-title" className="mt-1 text-2xl font-bold">관리자 활동 로그</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {activities.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">기록된 관리자 활동이 없습니다.</p> : activities.map((activity) => (
              <div key={activity.id} className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div><strong className="text-sm">{activity.message}</strong><p className="mt-1 text-xs text-slate-400">관리자 #{activity.actorAdminId} · 대상 회원 #{activity.targetMemberId} · {activity.activityType}</p></div>
                <time className="text-xs text-slate-400">{new Date(activity.createdAt).toLocaleString('ko-KR')}</time>
              </div>
            ))}
          </div>
          {nextCursor && <button type="button" className="mt-3 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600" onClick={() => void loadActivities(nextCursor)}>활동 더 보기</button>}
        </section>
      </section>

      {pendingChange && (
        <ConfirmDialog
          message={`해당 사용자를 ${pendingChange.label}할까요?`}
          confirmLabel={pendingChange.label}
          cancelLabel="취소"
          danger={pendingChange.action === 'deactivate' || pendingChange.action === 'reject'}
          onConfirm={applyStatusChange}
          onCancel={() => setPendingChange(null)}
        />
      )}
    </main>
  )
}
