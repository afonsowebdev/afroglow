import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BottomNavBar } from '@/components/ui/bottom-nav-bar'
import AccountAuthPage from '@/pages/AccountAuthPage'
import { useCustomerAuth } from '@/lib/customer-auth'
import { enableCustomerPush, onNotificationOpened, pushWanted } from '@/lib/customer-push'
import { tap } from '@/lib/haptics'
import BookingsScreen from './BookingsScreen'
import BookScreen from './BookScreen'
import HomeScreen from './HomeScreen'
import ProfileScreen from './ProfileScreen'

type TabId = 'inicio' | 'marcar' | 'marcacoes' | 'conta'

const TABS: Array<{ id: TabId; label: string; icon: string; path: string }> = [
  { id: 'inicio', label: 'Início', icon: 'bx bx-home-alt', path: '/' },
  {
    id: 'marcar',
    label: 'Marcar',
    icon: 'bx bx-calendar-plus',
    path: '/marcar',
  },
  {
    id: 'marcacoes',
    label: 'Marcações',
    icon: 'bx bx-calendar-check',
    path: '/marcacoes',
  },
  { id: 'conta', label: 'Conta', icon: 'bx bx-user', path: '/conta' },
]

function tabFor(pathname: string): TabId {
  if (pathname.startsWith('/marcar')) return 'marcar'
  if (pathname.startsWith('/marcacoes')) return 'marcacoes'
  if (pathname.startsWith('/conta') || pathname.startsWith('/entrar')) return 'conta'
  return 'inicio'
}

// Tabs that need an account show the sign-in/sign-up screen until the customer has one.
function RequireAccount({ children }: { children: React.ReactNode }) {
  const { customer, loading } = useCustomerAuth()
  if (loading) return <div className="min-h-screen bg-white" />
  return <>{customer ? children : <AccountAuthPage embedded />}</>
}

export default function CustomerApp() {
  const location = useLocation()
  const navigate = useNavigate()
  const { customer } = useCustomerAuth()

  // Signed in: make sure this iPhone is registered for booking notifications (asks permission once).
  useEffect(() => {
    if (customer && pushWanted()) void enableCustomerPush()
  }, [customer])

  // Tapping a notification opens the bookings tab.
  useEffect(() => {
    let off: (() => void) | undefined
    void onNotificationOpened(() => navigate('/marcacoes')).then((remove) => (off = remove))
    return () => off?.()
  }, [navigate])

  const tab = tabFor(location.pathname)

  // The glass bar sits over the hero photo on the home screen and over white pages elsewhere.
  const [overHero, setOverHero] = useState(true)
  useEffect(() => {
    // Over the photo only while the hero's bottom edge is still below the middle of the bar.
    const update = () => {
      const hero = document.querySelector('[data-hero]')
      const barCentre = window.innerHeight - 60
      setOverHero(location.pathname === '/' && !!hero && hero.getBoundingClientRect().bottom > barCentre)
    }
    update()
    // The new screen mounts a moment after the route changes (page transition), so also re-check
    // whenever the page content changes, not only on scroll.
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

  return (
    <div className="min-h-screen bg-white">
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
            <Route path="/entrar" element={<AccountAuthPage embedded />} />
            <Route path="*" element={<HomeScreen />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      <BottomNavBar
        stickyBottom
        glass
        tone={overHero ? 'onDark' : 'onLight'}
        value={tab}
        onChange={(id) => {
          const target = TABS.find((t) => t.id === id)
          void tap()
          if (target) navigate(target.path)
          window.scrollTo({ top: 0 })
        }}
        items={TABS.map(({ id, label, icon }) => ({ id, label, icon }))}
      />
    </div>
  )
}
