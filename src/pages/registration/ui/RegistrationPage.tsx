import { useState, type FormEvent } from 'react'
import { DISTRICTS, POSITIONS, TEAMS } from '@/entities/user'
import type { District, Position, Team } from '@/entities/user'
import { BrandLockup } from '@/shared/ui/BrandLockup'

export interface RegistrationData {
  kakaoId: string
  name: string
  phone: string
  email: string
  district: District
  department: '민원지적과'
  team: Team
  position: Position
}

interface RegistrationPageProps {
  kakaoId: string
  onCancel: () => void
  onSubmit: (registration: RegistrationData) => void
}

export function RegistrationPage({ kakaoId, onCancel, onSubmit }: RegistrationPageProps) {
  const [phone, setPhone] = useState('')

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length < 4) return numbers
    if (numbers.length < 8) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    onSubmit({
      kakaoId,
      name: String(form.get('name')),
      phone: String(form.get('phone')).replace(/\D/g, ''),
      email: String(form.get('email')),
      district: String(form.get('district')) as RegistrationData['district'],
      department: '민원지적과',
      team: String(form.get('team')) as RegistrationData['team'],
      position: String(form.get('position')) as RegistrationData['position'],
    })
  }

  return (
    <main className="app-bg min-h-full px-5 py-10 text-ink">
      <header className="mx-auto mb-8 flex max-w-3xl items-center justify-between">
        {/* 가입 신청 전이라 메인으로 가는 링크를 걸지 않는다. 옆에 서비스명이 따로 있어 심볼+BCS만 노출 */}
        <BrandLockup size="md" tone="onDark" variant="mark" />
        <span className="text-[12.5px] text-ink-4">지적기준점 관리 시스템</span>
      </header>

      <section className="panel-in mx-auto max-w-3xl rounded-pill border border-line bg-panel-strong p-6 shadow-modal backdrop-blur-[14px] sm:p-10" aria-labelledby="registration-title">
        <div className="border-b border-line-soft pb-7">
          <p className="text-sm font-bold text-teal-600">카카오 로그인 완료</p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-.02em] text-ink" id="registration-title">회원 정보 입력</h1>
          <p className="mt-3 text-[13px] text-ink-3">서비스 이용과 관리자 승인을 위해 정확한 소속 정보를 입력해 주세요.</p>
        </div>

        <form className="pt-8" onSubmit={handleSubmit}>
          <div className="grid gap-5 text-[12px] text-ink-3 sm:grid-cols-2 [&_b]:text-danger [&_input:focus]:border-teal-edge [&_input]:mt-2 [&_input]:h-11 [&_input]:w-full [&_input]:rounded-ctl [&_input]:border [&_input]:border-line-field [&_input]:bg-field [&_input]:px-3.5 [&_input]:text-[13px] [&_input]:text-ink [&_input]:outline-none [&_select:focus]:border-teal-edge [&_select]:mt-2 [&_select]:h-11 [&_select]:w-full [&_select]:rounded-ctl [&_select]:border [&_select]:border-line-field [&_select]:bg-field [&_select]:px-3.5 [&_select]:text-[13px] [&_select]:text-ink [&_select]:outline-none">
            <label>
              <span>이름 <b>*</b></span>
              <input name="name" type="text" placeholder="이름을 입력해 주세요" autoComplete="name" required />
            </label>

            <label>
              <span>전화번호 <b>*</b></span>
              <input
                name="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(formatPhone(event.target.value))}
                placeholder="010-0000-0000"
                autoComplete="tel"
                inputMode="numeric"
                required
              />
            </label>

            <label className="sm:col-span-2">
              <span>이메일 <b>*</b></span>
              <input name="email" type="email" placeholder="이메일 주소를 입력해 주세요" autoComplete="email" required />
            </label>

            <label>
              <span>소속 구청 <b>*</b></span>
              <select name="district" defaultValue="" required>
                <option value="" disabled>구청을 선택해 주세요</option>
                {DISTRICTS.map((district) => <option key={district}>{district}</option>)}
              </select>
            </label>

            <label>
              <span>소속 과</span>
              <input name="department" type="text" value="민원지적과" readOnly />
              <small>현재 민원지적과 소속 사용자만 가입할 수 있습니다.</small>
            </label>

            <label>
              <span>팀명 <b>*</b></span>
              <select name="team" defaultValue="" required>
                <option value="" disabled>팀을 선택해 주세요</option>
                {TEAMS.map((team) => <option key={team}>{team}</option>)}
              </select>
            </label>

            <label>
              <span>직위 <b>*</b></span>
              <select name="position" defaultValue="" required>
                <option value="" disabled>직위를 선택해 주세요</option>
                {POSITIONS.map((position) => <option key={position}>{position}</option>)}
              </select>
            </label>
          </div>

          <p className="mt-7 rounded-ctl border border-line-soft bg-soft p-4 text-[11.5px] leading-6 text-ink-3">
            입력한 정보는 가입 승인과 사용자 권한 관리 목적으로만 사용됩니다.
          </p>

          <div className="mt-7 flex justify-end gap-3">
            <button type="button" className="h-11 rounded-ctl border-[1.5px] border-line-btn px-7 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-hover" onClick={onCancel}>취소</button>
            <button type="submit" className="h-11 rounded-ctl border-[1.5px] border-teal-btn-edge bg-teal-wash px-7 text-[13px] font-semibold text-teal-label transition-colors hover:border-teal-text hover:bg-teal-wash-strong">가입 신청하기</button>
          </div>
        </form>
      </section>
    </main>
  )
}
