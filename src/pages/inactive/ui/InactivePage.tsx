import { BrandLockup } from '@/shared/ui/BrandLockup'
import { BTN_SECONDARY, MODAL_SHELL } from '@/shared/ui/classes'

interface InactivePageProps {
  onBackToLogin: () => void
}

export function InactivePage({ onBackToLogin }: InactivePageProps) {
  return (
    <main className="app-bg flex h-full flex-col overflow-y-auto px-5 py-12 text-ink">
      <section
        className={`panel-in my-auto w-full max-w-[460px] shrink-0 self-center px-7 py-10 text-center sm:px-12 ${MODAL_SHELL}`}
        aria-labelledby="inactive-title"
      >
        <BrandLockup size="md" variant="mark" className="mx-auto mb-8 w-fit" />

        <div className="mx-auto grid size-16 place-items-center rounded-full bg-danger-wash text-danger" aria-hidden="true">
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.8 2.6 17.1A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.9L13.7 3.8a2 2 0 0 0-3.4 0Z" />
          </svg>
        </div>

        <p className="mt-6 text-[12px] font-semibold tracking-[.08em] text-danger">서비스 이용 제한</p>
        <h1 id="inactive-title" className="mt-2 text-[24px] font-semibold tracking-[-.02em] text-ink">비활성화된 계정입니다</h1>
        <p className="mt-4 text-[13px] leading-7 text-ink-3">
          관리자에 의해 계정 이용이 중지되어<br />현재 서비스에 로그인할 수 없습니다.
        </p>

        <div className="mt-7 rounded-ctl border border-line-soft bg-soft p-4 text-left text-[12.5px] leading-6 text-ink-3">
          계정 재활성화가 필요하다면 서비스 관리자에게 문의해 주세요.
        </div>

        <button
          type="button"
          className={`${BTN_SECONDARY} mt-7 w-full`}
          onClick={onBackToLogin}
        >
          로그인 화면으로 돌아가기
        </button>
      </section>
    </main>
  )
}
