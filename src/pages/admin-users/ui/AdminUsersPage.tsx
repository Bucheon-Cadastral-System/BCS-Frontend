import { useMemo, useState } from 'react'
import { DISTRICTS, POSITIONS, TEAMS } from '@/entities/user'
import type { ManagedUser, UserStatus } from '@/entities/user'

interface AdminUsersPageProps {
  users: ManagedUser[]
  onChangeUsers: (users: ManagedUser[]) => void
  onBack: () => void
}

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: '승인 대기',
  ACTIVE: '사용 중',
  INACTIVE: '비활성',
}

export function AdminUsersPage({ users, onChangeUsers, onBack }: AdminUsersPageProps) {
  const [filter, setFilter] = useState<'ALL' | UserStatus>('ALL')
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ManagedUser | null>(null)

  const counts = useMemo(() => ({
    ALL: users.length,
    PENDING: users.filter((user) => user.status === 'PENDING').length,
    ACTIVE: users.filter((user) => user.status === 'ACTIVE').length,
    INACTIVE: users.filter((user) => user.status === 'INACTIVE').length,
  }), [users])

  const visibleUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return users.filter((user) => {
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
  }, [filter, query, users])

  const updateStatus = (id: string, status: UserStatus) => {
    const action = status === 'ACTIVE' ? '사용자로 승인' : status === 'INACTIVE' ? '비활성화' : '상태 변경'
    if (!window.confirm(`해당 사용자를 ${action}할까요?`)) return
    onChangeUsers(users.map((user) => user.id === id ? { ...user, status } : user))
  }

  const startEditing = (user: ManagedUser) => {
    setEditingId(user.id)
    setDraft({ ...user })
  }

  const saveEditing = () => {
    if (!draft) return
    onChangeUsers(users.map((user) => user.id === draft.id ? draft : user))
    setEditingId(null)
    setDraft(null)
  }

  return (
    <main className="min-h-full bg-slate-100 text-slate-900">
      <header className="flex min-h-16 items-center gap-3 bg-slate-800 px-4 text-white shadow-md">
        <button type="button" className="grid size-10 place-items-center rounded-lg border border-white/20 hover:bg-white/10" onClick={onBack} aria-label="지도로 돌아가기">←</button>
        <img className="h-10 w-auto" src="/logo2.png" alt="" />
        <div className="flex items-center gap-3">
          <strong>사용자 관리</strong>
          <span className="rounded-full bg-teal-500/20 px-2 py-1 text-xs font-bold text-teal-300">ADMIN</span>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10">
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

        <div className="mt-5 grid gap-4">
          {visibleUsers.length === 0 && <p className="rounded-2xl bg-white p-10 text-center text-slate-400">조건에 맞는 사용자가 없습니다.</p>}
          {visibleUsers.map((user) => {
            const isEditing = editingId === user.id && draft
            const current = isEditing ? draft : user

            return (
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={user.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 place-items-center rounded-full bg-teal-50 font-bold text-teal-700">{current.name.slice(0, 1)}</div>
                    <div className="flex flex-col">
                      <strong>{current.name}</strong>
                      <span className="text-xs text-slate-400">카카오 ID {current.kakaoId}</span>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${current.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : current.status === 'ACTIVE' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABEL[current.status]}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4 [&_label]:flex [&_label]:flex-col [&_label>span]:mb-2 [&_label>span]:text-xs [&_label>span]:font-bold [&_label>span]:text-slate-500 [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:px-3 [&_input:disabled]:bg-slate-50 [&_select]:min-h-11 [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-3 [&_select:disabled]:bg-slate-50">
                  <label>
                    <span>이름</span>
                    <input disabled={!isEditing} value={current.name} onChange={(e) => setDraft({ ...current, name: e.target.value })} />
                  </label>
                  <label>
                    <span>전화번호</span>
                    <input disabled={!isEditing} value={current.phone} onChange={(e) => setDraft({ ...current, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} />
                  </label>
                  <label>
                    <span>이메일</span>
                    <input disabled={!isEditing} type="email" value={current.email} onChange={(e) => setDraft({ ...current, email: e.target.value })} />
                  </label>
                  <label>
                    <span>소속 구청</span>
                    <select disabled={!isEditing} value={current.district} onChange={(e) => setDraft({ ...current, district: e.target.value as ManagedUser['district'] })}>
                      {DISTRICTS.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>소속 과</span>
                    <input disabled={!isEditing} value={current.department} onChange={(e) => setDraft({ ...current, department: e.target.value })} />
                  </label>
                  <label>
                    <span>팀명</span>
                    <select disabled={!isEditing} value={current.team} onChange={(e) => setDraft({ ...current, team: e.target.value as ManagedUser['team'] })}>
                      {TEAMS.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>직위</span>
                    <select disabled={!isEditing} value={current.position} onChange={(e) => setDraft({ ...current, position: e.target.value as ManagedUser['position'] })}>
                      {POSITIONS.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>신청일</span>
                    <input disabled value={current.requestedAt} />
                  </label>
                </div>

                <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4 [&_button]:min-h-10 [&_button]:rounded-lg [&_button]:px-4 [&_button]:text-sm [&_button]:font-bold">
                  {isEditing ? (
                    <>
                      <button type="button" className="border border-slate-200 text-slate-600" onClick={() => { setEditingId(null); setDraft(null) }}>취소</button>
                      <button type="button" className="bg-teal-600 text-white" onClick={saveEditing}>변경사항 저장</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="border border-slate-200 text-slate-600" onClick={() => startEditing(user)}>정보 수정</button>
                      {user.status === 'PENDING' && (
                        <button type="button" className="bg-teal-600 text-white" onClick={() => updateStatus(user.id, 'ACTIVE')}>가입 승인</button>
                      )}
                      {user.status === 'ACTIVE' && (
                        <button type="button" className="bg-slate-700 text-white" onClick={() => updateStatus(user.id, 'INACTIVE')}>비활성화</button>
                      )}
                      {user.status === 'INACTIVE' && (
                        <button type="button" className="bg-teal-600 text-white" onClick={() => updateStatus(user.id, 'ACTIVE')}>다시 활성화</button>
                      )}
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
