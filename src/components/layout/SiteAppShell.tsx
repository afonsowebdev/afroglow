import { useEffect, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Moon, Settings, Sun } from 'lucide-react'
import { BottomNavBar } from '@/components/ui/bottom-nav-bar'
import { FloatingActionMenu, type MenuAction } from '@/components/ui/floating-action-button'
import { BookingAlertsProvider, useBookingAlerts } from '@/customer/booking-alerts'
import { NavVisibilityProvider, useNavHidden } from '@/customer/nav-visibility'
import { loadAvatar, useAvatar } from '@/lib/avatar-store'
import { useCustomerAuth } from '@/lib/customer-auth'
import { useTheme } from '@/lib/theme'
import { useWhatsapp } from '@/lib/site-config'

type TabId = 'inicio' | 'marcar' | 'marcacoes' | 'conta'

// The customer app's tabs, with the website's addresses.
const TABS: Array<{ id: TabId; label: string; icon: string; path: string }> = [
  { id: 'inicio', label: 'Início', icon: 'bx bx-home-alt', path: '/' },
  { id: 'marcar', label: 'Marcar', icon: 'bx bx-calendar-plus', path: '/agendar' },
  { id: 'marcacoes', label: 'Marcações', icon: 'bx bx-calendar-check', path: '/marcacoes' },
  { id: 'conta', label: 'Conta', icon: 'bx bx-user', path: '/conta' },
]

function tabFor(pathname: string): TabId {
  if (pathname.startsWith('/agendar')) return 'marcar'
  if (pathname.startsWith('/marcacoes')) return 'marcacoes'
  return 'conta'
}

/** The AFROGLOW logo in its glass pill, as in the site header. */
export function SiteLogo() {
  return (
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
  )
}

function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { customer, logout } = useCustomerAuth()
  const { theme, toggleTheme } = useTheme()
  const whatsapp = useWhatsapp()
  const { unseen } = useBookingAlerts()
  const avatar = useAvatar()
  const navHidden = useNavHidden()
  const tab = tabFor(pathname)

  useEffect(() => {
    if (customer) void loadAvatar()
  }, [customer])

  const menuActions: MenuAction[] = [
    { Icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? 'Tema claro' : 'Tema escuro', onClick: toggleTheme },
    ...(customer ? [{ Icon: Settings, label: 'Definições', onClick: () => navigate('/definicoes') }] : []),
    ...(whatsapp.enabled
      ? [
          {
            iconClass: 'bx bxl-whatsapp',
            label: 'WhatsApp',
            href: whatsapp.url('Olá! Gostaria de saber mais sobre os vossos serviços.'),
          },
        ]
      : []),
    ...(customer
      ? [
          {
            Icon: LogOut,
            label: 'Terminar sessão',
            danger: true,
            onClick: () => void logout().then(() => navigate('/')),
          },
        ]
      : []),
  ]

  const tabBar = (
    <BottomNavBar
      glass
      compact
      hidden={navHidden}
      value={tab}
      onChange={(id) => {
        const target = TABS.find((t) => t.id === id)
        if (target) navigate(target.path)
        window.scrollTo({ top: 0 })
      }}
      items={TABS.map(({ id, label, icon }) => ({
        id,
        label,
        icon,
        dot: id === 'marcacoes' && unseen.size > 0,
        // The customer's photo stands in for the account icon when there is one, as in the app.
        ...(id === 'conta' && customer ? { image: avatar } : {}),
      }))}
    />
  )

  return (
    <div className="min-h-screen bg-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 mt-[calc(1rem+env(safe-area-inset-top))] px-4 sm:mt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <SiteLogo />
          <div className="flex items-center gap-2.5">
            <div className="pointer-events-auto hidden md:block">{tabBar}</div>
            <FloatingActionMenu actions={menuActions} direction="down" />
          </div>
        </div>
      </div>

      {/* Room for the header; the screens keep their own layout from the app. */}
      <div className="pt-[calc(4.5rem+env(safe-area-inset-top))] sm:pt-[calc(5.5rem+env(safe-area-inset-top))]">
        {children}
      </div>

      {/* On phones the tabs sit at the bottom, as in the customer app. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-3 md:hidden">
        <div className={navHidden ? 'pointer-events-none' : 'pointer-events-auto'}>{tabBar}</div>
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
 * The website's customer pages (booking, bookings, profile, settings) in the customer app's frame: the site
 * logo at the top, the app's tab bar (in the header on wide screens, at the bottom on phones) and its "+" menu.
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
