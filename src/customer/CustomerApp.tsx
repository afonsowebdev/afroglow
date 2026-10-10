import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  BellFill,
  BellSlashFill,
  CalendarCheckFill,
  CalendarPlusFill,
  DockDownFill,
  DockFill,
  GearFill,
  HouseFill,
  MoonFill,
  PersonCircleFill,
  PlusBold,
  SignOutFill,
  SunFill,
} from '@/components/ui/apple-icons'
import { BottomNavBar, type BottomNavItem } from '@/components/ui/bottom-nav-bar'
import { FloatingActionMenu, type MenuAction } from '@/components/ui/floating-action-button'
import AccountAuthPage from '@/pages/AccountAuthPage'
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
import { NavVisibilityProvider, useAutoHideNav, useNavForcedHidden, useNavHidden } from './nav-visibility'
import ProfileScreen from './ProfileScreen'
import SettingsScreen from './SettingsScreen'

type TabId = 'inicio' | 'marcar' | 'marcacoes' | 'conta'

// Icons in the style of Apple's SF Symbols (see apple-icons); `icon` stays as the Boxicons fallback.
const TABS: Array<BottomNavItem<TabId> & { path: string }> = [
  { id: 'inicio', label: 'Início', icon: 'bx bx-home-alt', Icon: HouseFill, path: '/' },
  { id: 'marcar', label: 'Marcar', icon: 'bx bx-calendar-plus', Icon: CalendarPlusFill, path: '/marcar' },
  { id: 'marcacoes', label: 'Marcações', icon: 'bx bx-calendar-check', Icon: CalendarCheckFill, path: '/marcacoes' },
  { id: 'conta', label: 'Conta', icon: 'bx bx-user', Icon: PersonCircleFill, path: '/conta' },
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
  return <>{customer ? children : <AccountAuthPage embedded />}</>
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
  const menuForcedHidden = useNavForcedHidden()
  const { unseen } = useBookingAlerts()
  const location = useLocation()
  const navigate = useNavigate()
  const { customer, logout } = useCustomerAuth()
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
      Icon: theme.theme === 'dark' ? SunFill : MoonFill,
      label: theme.theme === 'dark' ? 'Tema claro' : 'Tema escuro',
      onClick: theme.toggleTheme,
    },
    {
      Icon: hideOnScroll ? DockFill : DockDownFill,
      label: hideOnScroll ? 'Menu sempre visível' : 'Ocultar menu ao descer',
      onClick: () => setHideNavOnScroll(!hideOnScroll),
    },
    {
      Icon: GearFill,
      label: 'Definições',
      onClick: () => navigate('/definicoes'),
    },
    ...(pushSupported()
      ? [
          {
            Icon: notificationsOn ? BellFill : BellSlashFill,
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
            Icon: SignOutFill,
            label: 'Terminar sessão',
            danger: true,
            onClick: () => {
              void logout().then(() => navigate('/'))
            },
          },
        ]
      : []),
  ]

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
            <Route path="/entrar" element={<AccountAuthPage embedded />} />
            <Route path="*" element={<HomeScreen />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {/* Tab bar with the round menu button beside it. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex items-end justify-center gap-2.5 px-3">
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
        <FloatingActionMenu
          actions={menuActions}
          hidden={menuForcedHidden}
          tone={overHero ? 'onDark' : 'onLight'}
          PlusIcon={PlusBold}
        />
      </div>
    </div>
  )
}
