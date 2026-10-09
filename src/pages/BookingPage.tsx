import { Link } from 'react-router-dom'
import BookScreen from '@/customer/BookScreen'
import { usePageTitle } from '@/lib/page-title'

/** The website's booking page: the customer app's three-step flow (model, date, confirm) under the site header. */
export default function BookingPage() {
  usePageTitle('Marcar sessão')

  return (
    <div className="min-h-screen bg-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 mt-[calc(1rem+env(safe-area-inset-top))] px-4 sm:mt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            to="/"
            aria-label="AFROGLOW, voltar ao início"
            className="liquid-glass pointer-events-auto flex h-[56px] items-center gap-3 rounded-full pe-5 ps-2"
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4eedf] font-logo text-[1.35rem] leading-none text-[#8b6a24] shadow-[0_1px_4px_rgba(0,0,0,0.18)]"
              aria-hidden="true"
            >
              <span className="translate-y-[2px]">A</span>
            </span>
            <span className="translate-y-[2px] font-logo text-[1.35rem] leading-none tracking-[0.14em] text-gold-ink">
              AFROGLOW
            </span>
          </Link>

          <Link
            to="/"
            className="liquid-glass pointer-events-auto flex h-[56px] items-center gap-2 rounded-full px-5 font-subtitle text-sm text-onyx transition-colors duration-300 hover:text-gold-ink"
          >
            <span>Sair</span>
            <i className="bx bx-x text-xl" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <BookScreen site />
    </div>
  )
}
