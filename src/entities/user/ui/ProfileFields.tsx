import type { ReactNode } from 'react'
import { FIELD, FIELD_HEIGHT, FIELD_SELECT } from '@/shared/ui/classes'

/**
 * 회원 정보 한 줄 — 라벨과 값이 마주 서고, 고치는 중이면 값 자리가 그대로 입력칸이 된다.
 *
 * <p>관리자 화면과 프로필 패널이 같은 값을 같은 규칙으로 보이므로 줄을 한곳에서 만든다.
 * 두 벌로 두면 라벨 폭·글자 크기·빈 값 표기가 화면마다 조금씩 어긋난다.
 */
export function ProfileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    // 마지막 줄은 밑줄을 걷는다 — 줄과 줄 사이를 가르는 선이라, 아래에 가를 줄이 없으면 남는 것은 패널을 가르는 선이 된다
    <div className="flex items-center gap-3 border-b border-line-row py-2 last:border-b-0">
      <dt className="w-[78px] shrink-0 text-[11.5px] text-ink-3">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}

/** 값이 없을 때 세우는 표기 — 빈 자리를 비워 두면 항목 자체가 없는 것으로 읽힌다 */
export function ProfileValue({ value }: { value: string }) {
  if (!value) return <span className="block min-w-0 truncate text-[13px] text-ink-4">정보 없음</span>
  return <span className="block min-w-0 truncate text-[13px] text-ink-2">{value}</span>
}

export function ProfileField(props: { label: string; value: string; editing: boolean; onChange: (v: string) => void }) {
  return (
    <ProfileRow label={props.label}>
      {props.editing ? (
        // 라벨은 dt 에 있어 입력칸과 이어지지 않는다 — 화면 낭독기가 이름을 읽도록 같은 문구를 붙인다
        <input aria-label={props.label} value={props.value} onChange={(e) => props.onChange(e.target.value)} className={FIELD} />
      ) : (
        <ProfileValue value={props.value} />
      )}
    </ProfileRow>
  )
}

/**
 * 이 화면에서는 고칠 수 없는 값 — 어느 상태에서도 글자로 선다.
 *
 * <p>고치는 중에도 칸을 씌우지 않는다. 칸 모양이면 손이 닿는 자리로 읽혀, 어디를 고칠 수 있는지가 흐려진다.
 * 대신 옆줄 입력칸과 같은 높이만 잡아 라벨이 줄마다 어긋나지 않게 한다.
 */
export function ProfileLockedField(props: { label: string; value: string; editing: boolean }) {
  return (
    <ProfileRow label={props.label}>
      <span className={props.editing ? `flex items-center ${FIELD_HEIGHT}` : undefined}>
        <ProfileValue value={props.value} />
      </span>
    </ProfileRow>
  )
}

export function ProfileSelectField(props: {
  label: string
  value: string
  options: readonly string[]
  editing: boolean
  onChange: (v: string) => void
}) {
  const known = props.options.includes(props.value)
  return (
    <ProfileRow label={props.label}>
      {props.editing ? (
        <select aria-label={props.label} value={props.value} onChange={(e) => props.onChange(e.target.value)} className={FIELD_SELECT}>
          {/* 서버가 우리가 모르는 값을 내려도 고르는 자리에서 그 값을 잃지 않는다 */}
          {!known && <option value={props.value} disabled>{props.value}</option>}
          {props.options.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      ) : (
        <ProfileValue value={props.value} />
      )}
    </ProfileRow>
  )
}
