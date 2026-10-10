import { useEffect, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Navbar from '@/components/layout/Navbar'
import { BookingAlertsProvider, useBookingAlerts } from '@/customer/booking-alerts'
import { NavVisibilityProvider, useNavHidden } from '@/customer/nav-visibility'
import { useCustomerAuth } from '@/lib/customer-auth'

/** The AFROGLOW logo in its glass pill, as in the site header. */
export function SiteLogo() {
  return (
    <Link
      to="/"
      aria-label="AFROGLOW, voltar ao início"
      className="liquid-glass pointer-events-auto flex h-[56px] items-center gap-3 rounded-full pe-5 ps-2"
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4eedf] logo-weight font-logo text-[1.35rem] leading-none text-[#8b6a24] shadow-[0_1px_4px_rgba(0,0,0,0.18)]"
        aria-hidden="true"
      >
        <span className="translate-y-[2px]">A</span>
      </span>
      <span className="translate-y-[2px] logo-weight font-logo text-[1.35rem] leading-none tracking-[0.14em] text-gold-ink">
        AFROGLOW
      </span>
    </Link>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { unseen } = useBookingAlerts()
  const navHidden = useNavHidden()

  return (
    <div className="min-h-screen bg-white">
      {/* The same menu as the home page, with this page's tab kept selected. */}
      <Navbar page={pathname.startsWith('/agendar') ? 'agendar' : 'perfil'} hidden={navHidden} dot={unseen.size > 0} />

      {/* Room for the header; the screens keep their own layout from the app. */}
      <div className="pt-[calc(4.5rem+env(safe-area-inset-top))] sm:pt-[calc(5.5rem+env(safe-area-inset-top))]">
        {children}
      </div>
    </div>
  )
}

/** Sends visitors without an account to sign in first. */
function RequireAccount({ children }: { children: ReactNode }) {
  const { customer, loading } = useCustomerAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (!loading && !customer) navigate('/entrar', { replace: true })
  }, [loading, customer, navigate])
  return customer ? <>{children}</> : <div className="min-h-screen bg-white" />
}

/**
 * The website's customer pages (booking, bookings, profile, settings) with the site's own menu, the page's tab
 * kept selected; the screens themselves are the customer app's.
 */
export function SiteAppShell({ children, requireAccount = false }: { children: ReactNode; requireAccount?: boolean }) {
  return (
    <NavVisibilityProvider>
      <BookingAlertsProvider>
        <Shell>{requireAccount ? <RequireAccount>{children}</RequireAccount> : children}</Shell>
      </BookingAlertsProvider>
    </NavVisibilityProvider>
  )
}
