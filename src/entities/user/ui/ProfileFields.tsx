import type { ReactNode } from 'react'
import { FIELD, FIELD_READONLY, FIELD_SELECT } from '@/shared/ui/classes'

/**
 * 회원 정보 한 줄 — 라벨과 값이 마주 서고, 고치는 중이면 값 자리가 그대로 입력칸이 된다.
 *
 * <p>관리자 화면과 프로필 패널이 같은 값을 같은 규칙으로 보이므로 줄을 한곳에서 만든다.
 * 두 벌로 두면 라벨 폭·글자 크기·빈 값 표기가 화면마다 조금씩 어긋난다.
 */
export function ProfileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    // 마지막 줄은 밑줄을 걷는다 — 줄과 줄 사이를 가르는 선이라, 아래에 가를 줄이 없으면 남는 것은 판을 가르는 선이 된다
    <div className="flex items-center gap-3 border-b border-line-row py-2 last:border-b-0">
      <dt className="w-[78px] shrink-0 text-[11.5px] text-ink-3">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}

/** 값이 없을 때 세우는 표기 — 빈 자리를 비워 두면 항목 자체가 없는 것으로 읽힌다 */
export function ProfileValue({ value }: { value: string }) {
  if (!value) return <span className="block truncate text-[13px] text-ink-4">정보 없음</span>
  return <span className="block truncate text-[13px] text-ink-2">{value}</span>
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
 * 이 화면에서는 고칠 수 없는 값 — 읽을 때는 글자로, 고치는 중에는 잠긴 칸으로 선다.
 *
 * <p>고치는 중에 글자로 두면 옆줄의 입력칸보다 낮아 라벨이 줄마다 어긋난다. 잠긴 칸으로 세우면
 * 높이가 같아지고, 이 줄만 손이 닿지 않는다는 것도 함께 보인다.
 */
export function ProfileLockedField(props: { label: string; value: string; editing: boolean }) {
  return (
    <ProfileRow label={props.label}>
      {props.editing ? (
        <input
          aria-label={props.label}
          value={props.value}
          placeholder="정보 없음"
          readOnly
          tabIndex={-1}
          className={`${FIELD_READONLY} placeholder:text-ink-4`}
        />
      ) : (
        <ProfileValue value={props.value} />
      )}
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
