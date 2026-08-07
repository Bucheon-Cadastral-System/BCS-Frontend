import { useState, type FormEvent } from 'react'
import { DISTRICTS, POSITIONS, TEAMS } from '@/entities/user'
import type { District, Position, Team } from '@/entities/user'
import { BrandLockup } from '@/shared/ui/BrandLockup'
import { FormNotice } from '@/shared/ui/FormNotice'
import { useFormNotice } from '@/shared/lib/useFormNotice'
import { BTN_DANGER, BTN_PRIMARY, FIELD, FIELD_READONLY, FIELD_SELECT, MODAL_SHELL } from '@/shared/ui/classes'

const PHONE_PATTERN = /^01[016789]\d{7,8}$/
const PHONE_GUIDE = '휴대전화 번호는 010-1234-5678 형식으로 입력해 주세요.'

/** 서버가 정규식 위반을 그대로 돌려주면 사람이 읽을 문구로 바꾼다. */
function registrationErrorMessage(error: unknown) {
  if (error instanceof Error && /phone|전화번호/i.test(error.message) && /(일치|정규식|pattern|regexp)/i.test(error.message)) {
    return PHONE_GUIDE
  }
  return error instanceof Error ? error.message : '가입 신청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

export interface RegistrationData {
  name: string
  phone: string
  email: string
  district: District
  department: '민원지적과'
  team: Team
  position: Position
}

interface RegistrationPageProps {
  onCancel: () => void
  onSubmit: (registration: RegistrationData) => Promise<void>
}

export function RegistrationPage({ onCancel, onSubmit }: RegistrationPageProps) {
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const form = useFormNotice()

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length < 4) return numbers
    if (numbers.length < 8) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // 못 채운 칸은 화면 안에서 알린다 — 브라우저 기본 말풍선은 우리 규격 밖에서 그려진다
    if (!form.validate()) return
    const data = new FormData(event.currentTarget)
    // 칸을 채웠는지와 형식이 맞는지는 다른 검사다 — 형식은 브라우저가 모르므로 여기서 짚는다
    const normalizedPhone = String(data.get('phone')).replace(/\D/g, '')
    if (!PHONE_PATTERN.test(normalizedPhone)) {
      setPhoneError(PHONE_GUIDE)
      return
    }

    setSubmitting(true)
    setError('')
    setPhoneError('')
    try {
      await onSubmit({
        name: String(data.get('name')),
        phone: normalizedPhone,
        email: String(data.get('email')),
        district: pick(data.get('district'), DISTRICTS, '소속 지역을'),
        department: '민원지적과',
        team: pick(data.get('team'), TEAMS, '소속 팀을'),
        position: pick(data.get('position'), POSITIONS, '직위를'),
      })
    } catch (e) {
      setError(registrationErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="app-bg h-full overflow-y-auto px-5 py-10 text-ink">
      <header className="mx-auto mb-8 flex max-w-3xl items-center justify-between">
        {/* 가입 신청 전이라 메인으로 가는 링크를 걸지 않는다. 옆에 서비스명이 따로 있어 심볼+BCS만 노출 */}
        <BrandLockup size="md" variant="mark" />
        <span className="text-[12.5px] text-ink-3">지적기준점 관리 시스템</span>
      </header>

      <section className={`panel-in mx-auto max-w-3xl p-6 sm:p-10 ${MODAL_SHELL}`} aria-labelledby="registration-title">
        <div className="border-b border-line-soft pb-7">
          <p className="text-[12px] font-semibold tracking-[.08em] text-teal-text">카카오 로그인 완료</p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-.02em] text-ink" id="registration-title">회원 정보 입력</h1>
          <p className="mt-3 text-[13px] text-ink-3">서비스 이용과 관리자 승인을 위해 정확한 소속 정보를 입력해 주세요.</p>
        </div>

        <form ref={form.formRef} noValidate className="pt-8" onSubmit={handleSubmit}>
          {/* 칸 규격은 공용 레시피(FIELD·FIELD_SELECT)를 쓰고, 여기서는 라벨·별표·덧말만 정한다 */}
          <div className="grid gap-5 text-[12px] text-ink-3 sm:grid-cols-2 [&_b]:text-danger [&_input]:mt-2 [&_select]:mt-2 [&_small]:mt-1.5 [&_small]:block [&_small]:text-[11px] [&_small]:text-ink-3">
            <label>
              <span>이름 <b>*</b></span>
              <input name="name" type="text" className={FIELD} placeholder="이름을 입력해 주세요" autoComplete="name" required />
            </label>

            <label>
              <span>전화번호 <b>*</b></span>
              <input
                name="phone"
                type="tel"
                className={FIELD}
                value={phone}
                onChange={(event) => {
                  setPhone(formatPhone(event.target.value))
                  if (phoneError) setPhoneError('')
                }}
                placeholder="010-0000-0000"
                autoComplete="tel"
                inputMode="numeric"
                aria-invalid={phoneError !== '' ? 'true' : undefined}
                required
              />
              {/* 형식 오류는 그 칸 아래에서 알린다 — 버튼 옆 한 줄은 못 채운 칸을 알리는 자리다 */}
              {phoneError !== '' && <small className="!text-danger" role="alert">{phoneError}</small>}
            </label>

            <label className="sm:col-span-2">
              <span>이메일 <b>*</b></span>
              <input name="email" type="email" className={FIELD} placeholder="이메일 주소를 입력해 주세요" autoComplete="email" required />
            </label>

            <label>
              <span>소속 구청 <b>*</b></span>
              <select name="district" className={FIELD_SELECT} defaultValue="" required>
                <option value="" disabled>구청을 선택해 주세요</option>
                {DISTRICTS.map((district) => <option key={district}>{district}</option>)}
              </select>
            </label>

            <label>
              <span>소속 과</span>
              <input name="department" type="text" className={FIELD_READONLY} value="민원지적과" readOnly />
              <small>현재 민원지적과 소속 사용자만 가입할 수 있습니다.</small>
            </label>

            <label>
              <span>팀명 <b>*</b></span>
              <select name="team" className={FIELD_SELECT} defaultValue="" required>
                <option value="" disabled>팀을 선택해 주세요</option>
                {TEAMS.map((team) => <option key={team}>{team}</option>)}
              </select>
            </label>

            <label>
              <span>직위 <b>*</b></span>
              <select name="position" className={FIELD_SELECT} defaultValue="" required>
                <option value="" disabled>직위를 선택해 주세요</option>
                {POSITIONS.map((position) => <option key={position}>{position}</option>)}
              </select>
            </label>
          </div>

          <p className="mt-7 rounded-ctl border border-line-soft bg-soft p-4 text-[11.5px] leading-6 text-ink-3">
            입력한 정보는 가입 승인과 사용자 권한 관리 목적으로만 사용됩니다.
          </p>

          {error && (
            <p className="mt-4 rounded-ctl border border-danger-btn-edge bg-danger-wash p-4 text-[12.5px] text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="mt-7 flex items-center justify-end gap-3">
            <FormNotice message={form.notice} />
            {/* 적던 신청서를 버리는 취소 — 앱 전역 규격대로 빨강 */}
            <button type="button" className={`${BTN_DANGER} px-7`} onClick={onCancel}>취소</button>
            <button
              type="submit"
              disabled={submitting}
              className={`${BTN_PRIMARY} px-7 disabled:cursor-wait`}
            >
              {submitting ? '신청 중…' : '가입 신청하기'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

/**
 * 고른 값이 목록에 실제로 있는지 보고 좁힌다.
 * as 로 단언하면 선택지 목록과 타입이 어긋나는 날 컴파일이 조용히 통과하고 서버가 400 을 돌려준다.
 */
function pick<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[], label: string): T {
  const text = String(value ?? '')
  const found = allowed.find((v) => v === text)
  if (found === undefined) throw new Error(`${label} 다시 선택해 주세요.`)
  return found
}
