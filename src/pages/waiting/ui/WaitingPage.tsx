import { BTN_PRIMARY, MODAL_SHELL } from '@/shared/ui/classes'

interface WaitingPageProps {
  onBackToLogin: () => void
}

export function WaitingPage({ onBackToLogin }: WaitingPageProps) {
  return (
    <main className="app-bg grid min-h-full place-items-center px-5 py-12 text-ink">
      <section className={`panel-in w-full max-w-[520px] px-8 py-12 text-center sm:px-12 ${MODAL_SHELL}`}>
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-teal-wash-strong text-[26px] font-semibold text-teal-text" aria-hidden="true">✓</div>
        <p className="mt-6 text-[12px] font-semibold tracking-[.08em] text-teal-text">가입 신청 완료</p>
        <h1 className="mt-2 text-[24px] font-semibold tracking-[-.02em] text-ink">관리자 승인을 기다리고 있습니다</h1>
        <p className="mt-5 text-[13px] leading-7 text-ink-3">
          입력하신 정보로 회원가입 신청이 완료되었습니다.<br />
          관리자가 소속 정보를 확인한 후 서비스를 이용할 수 있습니다.
        </p>
        <button type="button" className={`${BTN_PRIMARY} mt-8 w-full`} onClick={onBackToLogin}>
          로그인 화면으로 돌아가기
        </button>
      </section>
    </main>
  )
}
