import { useMemo, useState } from 'react'
import { DISTRICTS, POSITIONS, TEAMS } from '@/entities/user'
import type { ManagedUser, UserStatus } from '@/entities/user'
import { AppHeader, UsersIcon } from '@/widgets/app-header'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { BTN_SM_DANGER, BTN_SM_PRIMARY, BTN_SM_SECONDARY, FIELD } from '@/shared/ui/classes'

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

/** 상태별 색 — 승인 대기는 브랜드 앰버, 사용 중은 청록, 비활성은 죽인 회색 */
const STATUS_TONE: Record<UserStatus, string> = {
  PENDING: 'bg-amber-wash text-amber',
  ACTIVE: 'bg-teal-wash-strong text-teal-text',
  INACTIVE: 'bg-soft text-ink-3',
}

const AVATAR_TONE: Record<UserStatus, string> = {
  PENDING: 'bg-amber-wash text-amber',
  ACTIVE: 'bg-teal-fill text-[#EFFBF7]',
  INACTIVE: 'bg-soft text-ink-3',
}

/** 확인 문구는 목표 상태만으로 정해지지 않는다 — 같은 ACTIVE라도 대기 중이면 승인, 비활성이면 재활성화다. */
function actionLabelOf(from: UserStatus, to: UserStatus): string {
  if (to === 'ACTIVE') return from === 'INACTIVE' ? '다시 활성화' : '승인'
  if (to === 'INACTIVE') return '비활성화'
  return '상태 변경'
}

export function AdminUsersPage({ users, onChangeUsers, onBack }: AdminUsersPageProps) {
  const [filter, setFilter] = useState<'ALL' | UserStatus>('ALL')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(users[0]?.id ?? null)
  const [draft, setDraft] = useState<ManagedUser | null>(null)
  const [pendingChange, setPendingChange] = useState<{ id: string; status: UserStatus; label: string } | null>(null)

  const counts = useMemo(
    () => ({
      ALL: users.length,
      PENDING: users.filter((user) => user.status === 'PENDING').length,
      ACTIVE: users.filter((user) => user.status === 'ACTIVE').length,
      INACTIVE: users.filter((user) => user.status === 'INACTIVE').length,
    }),
    [users],
  )

  const visibleUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return users.filter((user) => {
      const matchesStatus = filter === 'ALL' || user.status === filter
      const matchesQuery =
        !keyword ||
        [user.name, user.email, user.phone, user.district, user.team].some((value) =>
          value.toLowerCase().includes(keyword),
        )
      return matchesStatus && matchesQuery
    })
  }, [filter, query, users])

  const selected = users.find((user) => user.id === selectedId) ?? null
  const editing = draft !== null && draft.id === selectedId
  const shown = editing ? draft : selected

  function askStatusChange(user: ManagedUser, status: UserStatus) {
    setPendingChange({ id: user.id, status, label: actionLabelOf(user.status, status) })
  }

  function applyStatusChange() {
    if (!pendingChange) return
    const { id, status } = pendingChange
    onChangeUsers(users.map((user) => (user.id === id ? { ...user, status } : user)))
    setPendingChange(null)
  }

  function saveEditing() {
    if (!draft) return
    onChangeUsers(users.map((user) => (user.id === draft.id ? draft : user)))
    setDraft(null)
  }

  return (
    <main className="app-bg relative h-full text-ink">
      {/* 헤더는 지도 화면과 같은 것을 쓴다 — 탭 자리만 이 화면의 이름으로 바꾼다 */}
      <AppHeader
        onHome={onBack}
        title={{ label: '사용자 관리', icon: <UsersIcon className="size-[18px]" /> }}
        isAdmin
      />

      <section className="absolute inset-x-0 bottom-0 top-[76px] flex flex-col border-t-2 border-t-teal bg-panel backdrop-blur-[12px]">
        <header className="flex shrink-0 items-center gap-3 px-[22px] py-[15px]">
          <h1 className="flex-1 text-[23px] font-semibold tracking-[-.02em] text-ink">사용자 관리</h1>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름, 이메일, 전화번호, 소속 검색"
            className="h-[38px] w-[320px] rounded-ctl border border-line-field bg-field px-4 text-[12.5px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-teal-edge"
          />
        </header>

        <div className="flex shrink-0 gap-2 border-b border-line-soft px-[22px] pb-[11px]">
          {(['ALL', 'PENDING', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
            <button
              type="button"
              key={status}
              onClick={() => setFilter(status)}
              aria-pressed={filter === status}
              className={`flex h-[30px] items-center gap-1.5 rounded-chip px-3 text-[12px] font-medium transition-colors ${
                filter === status ? 'bg-teal-wash-strong text-teal-text' : 'text-ink-3 hover:bg-hover hover:text-ink-2'
              }`}
            >
              {status === 'ALL' ? '전체' : STATUS_LABEL[status]}
              <span className="font-mono">{counts[status]}</span>
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto">
            <div className="flex h-[34px] items-center gap-3 border-b border-line-soft px-[22px] text-[11px] font-medium tracking-[.08em] text-ink-4">
              <span className="flex-1">사용자</span>
              <span className="w-[200px]">소속</span>
              <span className="w-[86px]">상태</span>
              <span className="w-[90px] text-right">신청일</span>
            </div>

            {visibleUsers.length === 0 && (
              <p className="px-[22px] py-10 text-center text-[12.5px] text-ink-4">조건에 맞는 사용자가 없습니다.</p>
            )}

            {visibleUsers.map((user) => (
              <button
                type="button"
                key={user.id}
                onClick={() => {
                  setSelectedId(user.id)
                  setDraft(null)
                }}
                aria-current={user.id === selectedId}
                className={`flex h-14 w-full items-center gap-3 border-b border-line-row px-[22px] text-left transition-colors hover:bg-white/[0.03] ${
                  user.id === selectedId ? 'bg-teal-wash shadow-[inset_3px_0_0_var(--color-teal)]' : ''
                }`}
              >
                <span
                  className={`flex size-[34px] shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${AVATAR_TONE[user.status]}`}
                >
                  {user.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{user.name}</span>
                  <span className="block truncate font-mono text-[10.5px] text-ink-4">카카오 ID {user.kakaoId}</span>
                </span>
                <span className="w-[200px] truncate text-[12.5px] text-ink-3">
                  {user.district} {user.department} {user.team} {user.position}
                </span>
                <span className="w-[86px]">
                  <span className={`inline-flex rounded-chip px-2 py-0.5 text-[10.5px] font-semibold ${STATUS_TONE[user.status]}`}>
                    {STATUS_LABEL[user.status]}
                  </span>
                </span>
                <span className="w-[90px] text-right font-mono text-[11.5px] text-ink-3">{user.requestedAt}</span>
              </button>
            ))}
          </div>

          {shown && (
            <aside className="flex w-[400px] shrink-0 flex-col overflow-y-auto border-l border-line px-5 py-[18px]">
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${AVATAR_TONE[shown.status]}`}
                >
                  {shown.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold text-ink">{shown.name}</span>
                  <span className="block truncate font-mono text-[11px] text-ink-4">카카오 ID {shown.kakaoId}</span>
                </span>
                <span className={`shrink-0 rounded-chip px-2.5 py-1 text-[10.5px] font-semibold ${STATUS_TONE[shown.status]}`}>
                  {STATUS_LABEL[shown.status]}
                </span>
              </div>

              <dl className="mt-5 flex-1">
                <Field label="이름" editing={editing} value={shown.name} onChange={(v) => setDraft({ ...shown, name: v })} />
                <Field
                  label="전화번호"
                  editing={editing}
                  mono
                  value={shown.phone}
                  onChange={(v) => setDraft({ ...shown, phone: v.replace(/\D/g, '').slice(0, 11) })}
                />
                <Field label="이메일" editing={editing} value={shown.email} onChange={(v) => setDraft({ ...shown, email: v })} />
                <SelectField
                  label="소속 구청"
                  editing={editing}
                  value={shown.district}
                  options={DISTRICTS}
                  onChange={(v) => setDraft({ ...shown, district: v as ManagedUser['district'] })}
                />
                <Field label="소속 과" editing={editing} value={shown.department} onChange={(v) => setDraft({ ...shown, department: v })} />
                <SelectField
                  label="팀명"
                  editing={editing}
                  value={shown.team}
                  options={TEAMS}
                  onChange={(v) => setDraft({ ...shown, team: v as ManagedUser['team'] })}
                />
                <SelectField
                  label="직위"
                  editing={editing}
                  value={shown.position}
                  options={POSITIONS}
                  onChange={(v) => setDraft({ ...shown, position: v as ManagedUser['position'] })}
                />
                <Field label="신청일" editing={false} mono value={shown.requestedAt} onChange={() => {}} />
              </dl>

              <div className="mt-5 flex justify-end gap-2">
                {editing ? (
                  <>
                    <button type="button" className={BTN_SM_SECONDARY} onClick={() => setDraft(null)}>
                      취소
                    </button>
                    <button type="button" className={BTN_SM_PRIMARY} onClick={saveEditing}>
                      변경사항 저장
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className={BTN_SM_SECONDARY} onClick={() => setDraft({ ...shown })}>
                      정보 수정
                    </button>
                    {shown.status === 'PENDING' && (
                      <button type="button" className={BTN_SM_PRIMARY} onClick={() => askStatusChange(shown, 'ACTIVE')}>
                        가입 승인
                      </button>
                    )}
                    {shown.status === 'ACTIVE' && (
                      <button type="button" className={BTN_SM_DANGER} onClick={() => askStatusChange(shown, 'INACTIVE')}>
                        비활성화
                      </button>
                    )}
                    {shown.status === 'INACTIVE' && (
                      <button type="button" className={BTN_SM_PRIMARY} onClick={() => askStatusChange(shown, 'ACTIVE')}>
                        다시 활성화
                      </button>
                    )}
                  </>
                )}
              </div>
            </aside>
          )}
        </div>
      </section>

      {pendingChange && (
        <ConfirmDialog
          message={`해당 사용자를 ${pendingChange.label}할까요?`}
          confirmLabel={pendingChange.label}
          cancelLabel="취소"
          danger={pendingChange.status === 'INACTIVE'}
          onConfirm={applyStatusChange}
          onCancel={() => setPendingChange(null)}
        />
      )}
    </main>
  )
}

/** 읽을 때는 값만 보이고 고칠 때만 입력칸이 된다 — 상자가 늘 서 있으면 읽기가 어렵다 */
function Field(props: { label: string; value: string; editing: boolean; mono?: boolean; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-line-row py-2">
      <dt className="w-[78px] shrink-0 text-[11.5px] text-ink-4">{props.label}</dt>
      <dd className="min-w-0 flex-1">
        {props.editing ? (
          <input value={props.value} onChange={(e) => props.onChange(e.target.value)} className={FIELD} />
        ) : (
          <span className={`block truncate text-[13px] text-ink-2 ${props.mono ? 'font-mono' : ''}`}>{props.value}</span>
        )}
      </dd>
    </div>
  )
}

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
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            className="select-chevron h-[38px] w-full rounded-ctl border border-line-field bg-field pl-3 pr-9 text-[13px] text-ink outline-none transition-colors focus:border-teal-edge"
          >
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
