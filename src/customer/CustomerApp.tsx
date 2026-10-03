import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BottomNavBar } from '@/components/ui/bottom-nav-bar'
import AccountAuthPage from '@/pages/AccountAuthPage'
import AccountPage from '@/pages/AccountPage'
import BookingPage from '@/pages/BookingPage'
import { useCustomerAuth } from '@/lib/customer-auth'
import HomeScreen from './HomeScreen'

type TabId = 'inicio' | 'marcar' | 'marcacoes' | 'conta'

const TABS: Array<{ id: TabId; label: string; icon: string; path: string }> = [
  { id: 'inicio', label: 'Início', icon: 'bx bx-home-alt', path: '/' },
  { id: 'marcar', label: 'Marcar', icon: 'bx bx-calendar-plus', path: '/marcar' },
  { id: 'marcacoes', label: 'Marcações', icon: 'bx bx-calendar-check', path: '/marcacoes' },
  { id: 'conta', label: 'Conta', icon: 'bx bx-user', path: '/conta' },
]

function tabFor(pathname: string): TabId {
  if (pathname.startsWith('/marcar')) return 'marcar'
  if (pathname.startsWith('/marcacoes')) return 'marcacoes'
  if (pathname.startsWith('/conta') || pathname.startsWith('/entrar')) return 'conta'
  return 'inicio'
}

// Tabs that need an account show the sign-in/sign-up screen until the customer has one.
function RequireAccount({ children }: { children: (embeddedAuth: boolean) => React.ReactNode }) {
  const { customer, loading } = useCustomerAuth()
  if (loading) return <div className="min-h-screen bg-white" />
  return <>{customer ? children(false) : <AccountAuthPage embedded />}</>
}

export default function CustomerApp() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/marcar" element={<BookingPage embedded />} />
        <Route
          path="/marcacoes"
          element={<RequireAccount>{() => <AccountPage embedded section="marcacoes" />}</RequireAccount>}
        />
        <Route
          path="/conta"
          element={<RequireAccount>{() => <AccountPage embedded section="conta" />}</RequireAccount>}
        />
        <Route path="/entrar" element={<AccountAuthPage embedded />} />
        <Route path="*" element={<HomeScreen />} />
      </Routes>

      <BottomNavBar
        stickyBottom
        value={tabFor(location.pathname)}
        onChange={(id) => {
          const tab = TABS.find((t) => t.id === id)
          if (tab) navigate(tab.path)
          window.scrollTo({ top: 0 })
        }}
        items={TABS.map(({ id, label, icon }) => ({ id, label, icon }))}
      />
    </div>
  )
}
