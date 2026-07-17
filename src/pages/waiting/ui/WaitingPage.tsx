interface WaitingPageProps {
  onBackToLogin: () => void
}

export function WaitingPage({ onBackToLogin }: WaitingPageProps) {
  return (
    <main className="grid min-h-full place-items-center bg-slate-100 px-5 py-12">
      <section className="w-full max-w-[520px] rounded-3xl border border-slate-200 bg-white px-8 py-12 text-center shadow-xl sm:px-12">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-3xl font-bold text-emerald-600" aria-hidden="true">✓</div>
        <p className="mt-6 text-sm font-bold text-emerald-600">가입 신청 완료</p>
        <h1 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-900">관리자 승인을 기다리고 있습니다</h1>
        <p className="mt-5 text-sm leading-7 text-slate-500">
          입력하신 정보로 회원가입 신청이 완료되었습니다.<br />
          관리자가 소속 정보를 확인한 후 서비스를 이용할 수 있습니다.
        </p>
        <button type="button" className="mt-8 min-h-12 w-full rounded-xl bg-teal-600 px-5 font-bold text-white transition hover:bg-teal-700" onClick={onBackToLogin}>
          로그인 화면으로 돌아가기
        </button>
      </section>
    </main>
  )
}
