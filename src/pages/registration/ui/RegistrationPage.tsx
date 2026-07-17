import { useState, type FormEvent } from 'react'
import { DISTRICTS, POSITIONS, TEAMS } from '@/entities/user'
import type { District, Position, Team } from '@/entities/user'

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
    <main className="min-h-full bg-slate-100 px-5 py-10">
      <header className="mx-auto mb-8 flex max-w-3xl items-center justify-between">
        <img className="w-44" src="/logo.png" alt="부천시" />
        <span className="text-sm font-semibold text-slate-500">지적기준점 관리 서비스</span>
      </header>

      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-10" aria-labelledby="registration-title">
        <div className="border-b border-slate-200 pb-7">
          <p className="text-sm font-bold text-teal-600">카카오 로그인 완료</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-900" id="registration-title">회원 정보 입력</h1>
          <p className="mt-3 text-sm text-slate-500">서비스 이용과 관리자 승인을 위해 정확한 소속 정보를 입력해 주세요.</p>
        </div>

        <form className="pt-8" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2 [&_b]:text-rose-500 [&_input]:mt-2 [&_input]:min-h-12 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-200 [&_input]:px-4 [&_input]:outline-none [&_input:focus]:border-teal-500 [&_select]:mt-2 [&_select]:min-h-12 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-4 [&_select]:outline-none [&_select:focus]:border-teal-500">
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

          <p className="mt-7 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            입력한 정보는 가입 승인과 사용자 권한 관리 목적으로만 사용됩니다.
          </p>

          <div className="mt-7 flex justify-end gap-3">
            <button type="button" className="min-h-12 rounded-xl border border-slate-200 px-7 font-bold text-slate-600 hover:bg-slate-50" onClick={onCancel}>취소</button>
            <button type="submit" className="min-h-12 rounded-xl bg-teal-600 px-7 font-bold text-white hover:bg-teal-700">가입 신청하기</button>
          </div>
        </form>
      </section>
    </main>
  )
}
