import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Bell, BellOff, CalendarCheck, CalendarPlus, House, LogOut, Moon, PanelTop, PanelTopClose, Plus, Settings, Sun, UserRound } from 'lucide-react'
import { BottomNavBar, type BottomNavItem } from '@/components/ui/bottom-nav-bar'
import { FloatingActionMenu, type MenuAction } from '@/components/ui/floating-action-button'
import AuthScreen from './AuthScreen'
import { api } from '@/lib/api'
import { clearAvatar, loadAvatar, useAvatar } from '@/lib/avatar-store'
import { useCustomerAuth } from '@/lib/customer-auth'
import {
  disableCustomerPush,
  enableCustomerPush,
  onNotificationOpened,
  pushSupported,
  pushWanted,
} from '@/lib/customer-push'
import { useWhatsapp } from '@/lib/site-config'
import { useTheme } from '@/lib/theme'
import { tap } from '@/lib/haptics'
import BookingsScreen from './BookingsScreen'
import BookScreen from './BookScreen'
import HomeScreen from './HomeScreen'
import { BookingAlertsProvider, useBookingAlerts } from './booking-alerts'
import { setHideNavOnScroll, useHideNavOnScrollSetting } from '@/lib/nav-prefs'
import { NavVisibilityProvider, useAutoHideNav, useNavHidden } from './nav-visibility'
import ProfileScreen from './ProfileScreen'
import { BRAND_CIRCLE } from '@/components/ui/brand-logo'
import SettingsScreen from './SettingsScreen'
import { NotificationBell } from '@/components/layout/NotificationBell'

type TabId = 'inicio' | 'marcar' | 'marcacoes' | 'conta'

// Outline icons (lucide), as in the website's account menu; `icon` stays as the Boxicons fallback.
const TABS: Array<BottomNavItem<TabId> & { path: string }> = [
  { id: 'inicio', label: 'Início', icon: 'bx bx-home-alt', Icon: House, path: '/' },
  { id: 'marcar', label: 'Marcar', icon: 'bx bx-calendar-plus', Icon: CalendarPlus, path: '/marcar' },
  { id: 'marcacoes', label: 'Marcações', icon: 'bx bx-calendar-check', Icon: CalendarCheck, path: '/marcacoes' },
  { id: 'conta', label: 'Conta', icon: 'bx bx-user', Icon: UserRound, path: '/conta' },
]

function tabFor(pathname: string): TabId {
  if (pathname.startsWith('/marcar')) return 'marcar'
  if (pathname.startsWith('/marcacoes')) return 'marcacoes'
  if (pathname.startsWith('/conta') || pathname.startsWith('/definicoes') || pathname.startsWith('/entrar'))
    return 'conta'
  return 'inicio'
}

// Tabs that need an account show the sign-in/sign-up screen until the customer has one.
function RequireAccount({ children }: { children: React.ReactNode }) {
  const { customer, loading } = useCustomerAuth()
  if (loading) return <div className="min-h-screen bg-white" />
  return <>{customer ? children : <AuthScreen stay />}</>
}

export default function CustomerApp() {
  return (
    <NavVisibilityProvider>
      <BookingAlertsProvider>
        <CustomerShell />
      </BookingAlertsProvider>
    </NavVisibilityProvider>
  )
}

function CustomerShell() {
  const navHidden = useNavHidden()
  const { unseen } = useBookingAlerts()
  const location = useLocation()
  const navigate = useNavigate()
  const { customer, loading, logout } = useCustomerAuth()
  const avatar = useAvatar()

  // The profile photo also marks the Conta tab; fetched once per sign-in.
  useEffect(() => {
    if (customer) void loadAvatar()
    else clearAvatar()
  }, [customer?.id])

  // Signed in: make sure this iPhone is registered for booking notifications (asks permission once).
  useEffect(() => {
    if (customer && pushWanted()) void enableCustomerPush()
  }, [customer])

  // Opening (or coming back to) the app means the notifications were seen: the server zeroes the number on the icon.
  useEffect(() => {
    if (!customer) return
    const seen = () => {
      if (document.visibilityState === 'visible') void api.post('/account/push-token/seen').catch(() => {})
    }
    seen()
    document.addEventListener('visibilitychange', seen)
    return () => document.removeEventListener('visibilitychange', seen)
  }, [customer?.id])

  // Tapping a notification opens the bookings tab.
  useEffect(() => {
    let off: (() => void) | undefined
    void onNotificationOpened(() => navigate('/marcacoes')).then((remove) => (off = remove))
    return () => off?.()
  }, [navigate])

  const tab = tabFor(location.pathname)
  // The sign-in screen: /entrar, or a page that needs an account opened without one.
  const needsAccount = ['/marcacoes', '/conta', '/definicoes'].some((p) => location.pathname.startsWith(p))
  const onSignIn = !loading && (location.pathname.startsWith('/entrar') || (needsAccount && !customer))
  const hideOnScroll = useHideNavOnScrollSetting()
  useAutoHideNav(hideOnScroll, location.pathname)

  // White icons while the hero (video) is behind the bar, dark once white pages scroll under it.
  const [overHero, setOverHero] = useState(location.pathname === '/')
  useEffect(() => {
    const update = () => {
      const hero = document.querySelector('[data-hero]')
      const barCentre = window.innerHeight - 60
      setOverHero(location.pathname === '/' && !!hero && hero.getBoundingClientRect().bottom > barCentre)
    }
    update()
    let frame = 0
    const recheck = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    const observer = new MutationObserver(recheck)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [location.pathname])

  const theme = useTheme()
  const { enabled: whatsappOn, url: whatsappUrl } = useWhatsapp()
  const [notificationsOn, setNotificationsOn] = useState(pushWanted())

  const menuActions: MenuAction[] = [
    {
      Icon: theme.theme === 'dark' ? Sun : Moon,
      label: theme.theme === 'dark' ? 'Tema claro' : 'Tema escuro',
      onClick: theme.toggleTheme,
    },
    {
      Icon: hideOnScroll ? PanelTop : PanelTopClose,
      label: hideOnScroll ? 'Menu sempre visível' : 'Ocultar menu ao descer',
      onClick: () => setHideNavOnScroll(!hideOnScroll),
    },
    {
      Icon: Settings,
      label: 'Definições',
      onClick: () => navigate('/definicoes'),
    },
    ...(pushSupported()
      ? [
          {
            Icon: notificationsOn ? Bell : BellOff,
            label: notificationsOn ? 'Desligar avisos' : 'Ligar avisos',
            onClick: async () => {
              if (notificationsOn) {
                setNotificationsOn(false)
                await disableCustomerPush({ remember: true })
              } else if ((await enableCustomerPush()) === 'granted') {
                setNotificationsOn(true)
              }
            },
          },
        ]
      : []),
    ...(whatsappOn
      ? [
          {
            iconClass: 'bx bxl-whatsapp',
            label: 'WhatsApp',
            href: whatsappUrl('Olá! Gostaria de saber mais sobre os vossos serviços.'),
          },
        ]
      : []),
    ...(customer
      ? [
          {
            Icon: LogOut,
            label: 'Terminar sessão',
            danger: true,
            onClick: () => {
              void logout().then(() => navigate('/'))
            },
          },
        ]
      : []),
  ]

  // The app opens on the sign-in: everything in it is for customers with an account (create one there if needed).
  if (loading) return <div className="min-h-screen bg-white" />
  if (!customer) return <AuthScreen gate />

  return (
    <div className="app-neutral min-h-screen bg-white">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <Routes location={location}>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/marcar" element={<BookScreen />} />
            <Route
              path="/marcacoes"
              element={
                <RequireAccount>
                  <BookingsScreen />
                </RequireAccount>
              }
            />
            <Route
              path="/conta"
              element={
                <RequireAccount>
                  <ProfileScreen />
                </RequireAccount>
              }
            />
            <Route
              path="/definicoes"
              element={
                <RequireAccount>
                  <SettingsScreen />
                </RequireAccount>
              }
            />
            <Route path="/entrar" element={<AuthScreen />} />
            <Route path="*" element={<HomeScreen />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {/* Top row on every screen: the "A" on the left (home), the bell and the menu on the right. At the top of the
          page, scrolling away with it. Not on the sign-in screen, which has its own "A" in the middle. */}
      {!onSignIn && (
      <div className="pointer-events-none absolute inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 flex items-start justify-between px-4">
        <button
          type="button"
          onClick={() => {
            void tap()
            navigate('/')
            window.scrollTo({ top: 0 })
          }}
          aria-label="AFROGLOW, início"
          className={`pointer-events-auto flex size-12 items-center justify-center rounded-full font-logo text-[1.6rem] leading-none logo-weight ${BRAND_CIRCLE}`}
        >
          <span className="translate-y-[0.1em]" aria-hidden="true">
            A
          </span>
        </button>
        <div className="pointer-events-auto flex items-start gap-2.5">
          {customer && <NotificationBell tone={overHero ? 'onDark' : 'onLight'} className="size-12" plainBadge brand />}
          <FloatingActionMenu
            actions={menuActions}
            direction="down"
            small
            brand
            tone={overHero ? 'onDark' : 'onLight'}
            PlusIcon={Plus}
          />
        </div>
      </div>
      )}

      {/* The tab bar, on its own at the bottom. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex items-end justify-center px-3">
        <div className={navHidden ? 'pointer-events-none' : 'pointer-events-auto'}>
          <BottomNavBar
            glass
            hidden={navHidden}
            tone={overHero ? 'onDark' : 'onLight'}
            value={tab}
            onChange={(id) => {
              const target = TABS.find((t) => t.id === id)
              void tap()
              if (target) navigate(target.path)
              window.scrollTo({ top: 0 })
            }}
            items={TABS.map(({ id, label, icon, Icon }) => ({
              id,
              label,
              icon,
              Icon,
              dot: id === 'marcacoes' && unseen.size > 0,
              // The customer's photo stands in for the account icon when there is one.
              ...(id === 'conta' && customer ? { image: avatar } : {}),
            }))}
          />
        </div>
      </div>
    </div>
  )
}
