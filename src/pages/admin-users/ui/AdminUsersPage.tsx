import { useMemo, useState } from 'react'

const DISTRICTS = ['원미구', '소사구', '오정구'] as const
const TEAMS = ['민원행정팀', '가족관계팀', '지적정보팀', '지적관리팀', '부동산관리팀'] as const
const POSITIONS = ['팀장', '주무관'] as const

export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE'

export interface ManagedUser {
  id: string
  kakaoId: string
  name: string
  phone: string
  email: string
  district: string
  department: string
  team: string
  position: string
  status: UserStatus
  requestedAt: string
}

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
    <main className="admin-users">
      <header className="admin-users__header">
        <button type="button" className="admin-users__back" onClick={onBack} aria-label="지도로 돌아가기">←</button>
        <img src="/logo2.png" alt="" />
        <div>
          <strong>사용자 관리</strong>
          <span>ADMIN</span>
        </div>
      </header>

      <section className="admin-users__content">
        <div className="admin-users__title">
          <div>
            <p>관리자 전용</p>
            <h1>사용자 관리</h1>
            <span>가입 신청을 승인하고 사용자 정보와 서비스 이용 상태를 관리합니다.</span>
          </div>
          <button type="button" onClick={onBack}>지도로 돌아가기</button>
        </div>

        <div className="admin-users__summary">
          <div><span>전체 사용자</span><strong>{counts.ALL}</strong></div>
          <div><span>승인 대기</span><strong className="pending">{counts.PENDING}</strong></div>
          <div><span>사용 중</span><strong className="active">{counts.ACTIVE}</strong></div>
          <div><span>비활성</span><strong className="inactive">{counts.INACTIVE}</strong></div>
        </div>

        <div className="admin-users__toolbar">
          <div className="admin-users__filters">
            {(['ALL', 'PENDING', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
              <button
                type="button"
                key={status}
                className={filter === status ? 'is-active' : ''}
                onClick={() => setFilter(status)}
              >
                {status === 'ALL' ? '전체' : STATUS_LABEL[status]} {counts[status]}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름, 이메일, 전화번호, 소속 검색"
          />
        </div>

        <div className="admin-users__list">
          {visibleUsers.length === 0 && <p className="admin-users__empty">조건에 맞는 사용자가 없습니다.</p>}
          {visibleUsers.map((user) => {
            const isEditing = editingId === user.id && draft
            const current = isEditing ? draft : user

            return (
              <article className="admin-user" key={user.id}>
                <div className="admin-user__top">
                  <div className="admin-user__identity">
                    <div className="admin-user__avatar">{current.name.slice(0, 1)}</div>
                    <div>
                      <strong>{current.name}</strong>
                      <span>카카오 ID {current.kakaoId}</span>
                    </div>
                  </div>
                  <span className={`admin-user__status admin-user__status--${current.status.toLowerCase()}`}>
                    {STATUS_LABEL[current.status]}
                  </span>
                </div>

                <div className="admin-user__form">
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
                    <select disabled={!isEditing} value={current.district} onChange={(e) => setDraft({ ...current, district: e.target.value })}>
                      {DISTRICTS.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>소속 과</span>
                    <input disabled={!isEditing} value={current.department} onChange={(e) => setDraft({ ...current, department: e.target.value })} />
                  </label>
                  <label>
                    <span>팀명</span>
                    <select disabled={!isEditing} value={current.team} onChange={(e) => setDraft({ ...current, team: e.target.value })}>
                      {TEAMS.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>직위</span>
                    <select disabled={!isEditing} value={current.position} onChange={(e) => setDraft({ ...current, position: e.target.value })}>
                      {POSITIONS.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>신청일</span>
                    <input disabled value={current.requestedAt} />
                  </label>
                </div>

                <div className="admin-user__actions">
                  {isEditing ? (
                    <>
                      <button type="button" className="admin-user__cancel" onClick={() => { setEditingId(null); setDraft(null) }}>취소</button>
                      <button type="button" className="admin-user__save" onClick={saveEditing}>변경사항 저장</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="admin-user__edit" onClick={() => startEditing(user)}>정보 수정</button>
                      {user.status === 'PENDING' && (
                        <button type="button" className="admin-user__approve" onClick={() => updateStatus(user.id, 'ACTIVE')}>가입 승인</button>
                      )}
                      {user.status === 'ACTIVE' && (
                        <button type="button" className="admin-user__deactivate" onClick={() => updateStatus(user.id, 'INACTIVE')}>비활성화</button>
                      )}
                      {user.status === 'INACTIVE' && (
                        <button type="button" className="admin-user__approve" onClick={() => updateStatus(user.id, 'ACTIVE')}>다시 활성화</button>
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
