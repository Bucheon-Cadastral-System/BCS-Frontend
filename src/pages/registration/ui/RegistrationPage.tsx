import { useState, type FormEvent } from 'react'

const DISTRICTS = ['원미구', '소사구', '오정구'] as const
const TEAMS = ['민원행정팀', '가족관계팀', '지적정보팀', '지적관리팀', '부동산관리팀'] as const
const POSITIONS = ['팀장', '주무관'] as const

export interface RegistrationData {
  kakaoId: string
  name: string
  phone: string
  email: string
  district: (typeof DISTRICTS)[number]
  department: '민원지적과'
  team: (typeof TEAMS)[number]
  position: (typeof POSITIONS)[number]
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
    <main className="registration">
      <header className="registration__header">
        <img src="/logo.png" alt="부천시" />
        <span>지적기준점 관리 서비스</span>
      </header>

      <section className="registration__card" aria-labelledby="registration-title">
        <div className="registration__intro">
          <p className="registration__step">카카오 로그인 완료</p>
          <h1 id="registration-title">회원 정보 입력</h1>
          <p>서비스 이용과 관리자 승인을 위해 정확한 소속 정보를 입력해 주세요.</p>
        </div>

        <form className="registration__form" onSubmit={handleSubmit}>
          <div className="registration__fields">
            <label className="registration__field">
              <span>이름 <b>*</b></span>
              <input name="name" type="text" placeholder="이름을 입력해 주세요" autoComplete="name" required />
            </label>

            <label className="registration__field">
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

            <label className="registration__field registration__field--wide">
              <span>이메일 <b>*</b></span>
              <input name="email" type="email" placeholder="이메일 주소를 입력해 주세요" autoComplete="email" required />
            </label>

            <label className="registration__field">
              <span>소속 구청 <b>*</b></span>
              <select name="district" defaultValue="" required>
                <option value="" disabled>구청을 선택해 주세요</option>
                {DISTRICTS.map((district) => <option key={district}>{district}</option>)}
              </select>
            </label>

            <label className="registration__field">
              <span>소속 과</span>
              <input name="department" type="text" value="민원지적과" readOnly />
              <small>현재 민원지적과 소속 사용자만 가입할 수 있습니다.</small>
            </label>

            <label className="registration__field">
              <span>팀명 <b>*</b></span>
              <select name="team" defaultValue="" required>
                <option value="" disabled>팀을 선택해 주세요</option>
                {TEAMS.map((team) => <option key={team}>{team}</option>)}
              </select>
            </label>

            <label className="registration__field">
              <span>직위 <b>*</b></span>
              <select name="position" defaultValue="" required>
                <option value="" disabled>직위를 선택해 주세요</option>
                {POSITIONS.map((position) => <option key={position}>{position}</option>)}
              </select>
            </label>
          </div>

          <p className="registration__privacy">
            입력한 정보는 가입 승인과 사용자 권한 관리 목적으로만 사용됩니다.
          </p>

          <div className="registration__actions">
            <button type="button" className="registration__cancel" onClick={onCancel}>취소</button>
            <button type="submit" className="registration__submit">가입 신청하기</button>
          </div>
        </form>
      </section>
    </main>
  )
}
