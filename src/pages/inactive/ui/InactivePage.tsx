import { BrandLockup } from '@/shared/ui/BrandLockup'

interface InactivePageProps {
  onBackToLogin: () => void
}

export function InactivePage({ onBackToLogin }: InactivePageProps) {
  return (
    <main className="relative grid min-h-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(244,63,94,0.08),transparent_38%),linear-gradient(145deg,#f8fafc_0%,#f1f5f9_100%)] px-5 py-12">
      <section className="relative z-10 w-full max-w-[460px] rounded-3xl border border-white bg-white/95 px-7 py-10 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:px-12" aria-labelledby="inactive-title">
        <BrandLockup size="md" tone="onLight" variant="mark" className="mx-auto mb-8 w-fit" />

        <div className="mx-auto grid size-16 place-items-center rounded-full bg-rose-50 text-rose-600" aria-hidden="true">
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.8 2.6 17.1A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.9L13.7 3.8a2 2 0 0 0-3.4 0Z" />
          </svg>
        </div>

        <p className="mt-6 text-sm font-bold text-rose-600">서비스 이용 제한</p>
        <h1 id="inactive-title" className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-900">비활성화된 계정입니다</h1>
        <p className="mt-4 text-sm leading-7 text-slate-500">
          관리자에 의해 계정 이용이 중지되어<br />현재 서비스에 로그인할 수 없습니다.
        </p>

        <div className="mt-7 rounded-xl bg-slate-50 p-4 text-left text-sm leading-6 text-slate-600">
          계정 재활성화가 필요하다면 서비스 관리자에게 문의해 주세요.
        </div>

        <button type="button" className="mt-7 min-h-12 w-full rounded-xl border border-slate-200 bg-white font-bold text-slate-600 transition hover:bg-slate-50" onClick={onBackToLogin}>
          로그인 화면으로 돌아가기
        </button>
      </section>
    </main>
  )
}
