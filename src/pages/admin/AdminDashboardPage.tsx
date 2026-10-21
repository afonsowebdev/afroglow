import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  BellRing,
  CalendarDays,
  CalendarPlus,
  CalendarX2,
  Ellipsis,
  House,
  Inbox,
  LogOut,
  Moon,
  Plus,
  Sun,
  Tag,
  Users,
} from 'lucide-react'
import { BottomNavBar } from '@/components/ui/bottom-nav-bar'
import { FloatingActionMenu, type MenuAction } from '@/components/ui/floating-action-button'
import { useTheme } from '@/lib/theme'
import { adminToken, api, ApiError } from '@/lib/api'
import { registerForPushNotifications } from '@/lib/push-notifications'
import type { AvailabilitySlot, Booking, Service, Testimonial } from '@/lib/types'
import { ManualBookingSheet } from './ManualBookingSheet'
import { PortfolioView } from './PortfolioView'
import { SettingsView } from './SettingsView'
import { StatsView } from './StatsView'
import {
  AdminContext,
  type AdminContextValue,
  type AdminMe,
  type Permission,
  type Route,
  type RouteName,
  type TabId,
} from './admin-context'
import { Screen, ToastProvider } from './ios'
import { AgendaScreen } from './screens/AgendaScreen'
import { BroadcastScreen } from './screens/BroadcastScreen'
import { ClosuresScreen } from './screens/ClosuresScreen'
import { CustomerDetailScreen } from './screens/CustomerDetailScreen'
import { CustomersScreen } from './screens/CustomersScreen'
import { HomeScreen } from './screens/HomeScreen'
import { MoreScreen } from './screens/MoreScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { PromotionsScreen } from './screens/PromotionsScreen'
import { RequestsScreen } from './screens/RequestsScreen'
import { SecurityScreen } from './screens/SecurityScreen'
import { ServicesScreen } from './screens/ServicesScreen'
import { TeamScreen } from './screens/TeamScreen'
import { TestimonialsScreen } from './screens/TestimonialsScreen'

/** The title of each screen, used as the "‹ Back" label of the screen pushed on top of it. */
const TITLES: Record<RouteName, string> = {
  home: 'Início',
  requests: 'Pedidos',
  agenda: 'Agenda',
  customers: 'Clientes',
  more: 'Mais',
  customer: 'Cliente',
  services: 'Serviços',
  promotions: 'Promoções',
  portfolio: 'Portfólio',
  testimonials: 'Testemunhos',
  stats: 'Estatísticas',
  settings: 'Negócio',
  profile: 'Perfil',
  security: 'Segurança',
  team: 'Equipa',
  closures: 'Dias fechados',
  broadcast: 'Notificar',
}

const ROOTS: Record<TabId, Route> = {
  home: { name: 'home' },
  agenda: { name: 'agenda' },
  requests: { name: 'requests' },
  customers: { name: 'customers' },
  more: { name: 'more' },
}

/** Which tab the app opens on: the one in the address (#agenda), the old names included. */
function initialTab(): TabId {
  const hash = window.location.hash.slice(1)
  const legacy: Record<string, TabId> = { pedidos: 'requests', disponibilidade: 'agenda', clientes: 'customers', mais: 'more' }
  const tab = (legacy[hash] ?? hash) as TabId
  return tab in ROOTS ? tab : 'home'
}

/** A page from before, shown inside the new frame (its own padding, the large title and back from the frame). */
function Wrapped({ title, backLabel, onBack, children }: { title: string; backLabel: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <Screen title={title} back={{ label: backLabel, onClick: onBack }}>
      <div className="px-4">{children}</div>
    </Screen>
  )
}

export default function AdminDashboardPage() {
  return (
    <ToastProvider>
      <AdminApp />
    </ToastProvider>
  )
}

function AdminApp() {
  const navigate = useNavigate()
  const theme = useTheme()
  const [me, setMe] = useState<AdminMe | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loadError, setLoadError] = useState(false)
  const [tab, setTab] = useState<TabId>(initialTab)
  const [stacks, setStacks] = useState<Record<TabId, Route[]>>(() => ({
    home: [ROOTS.home],
    agenda: [ROOTS.agenda],
    requests: [ROOTS.requests],
    customers: [ROOTS.customers],
    more: [ROOTS.more],
  }))
  const [direction, setDirection] = useState<1 | -1 | 0>(0)
  const [manual, setManual] = useState<{ open: boolean; customer: { id: string; name: string; phone: string } | null }>({
    open: false,
    customer: null,
  })
  const scrollMemory = useRef(new Map<string, number>())

  const signOut = useCallback(() => {
    adminToken.set(null)
    navigate('/admin/login')
  }, [navigate])

  const can = useCallback((permission: Permission) => Boolean(me?.permissions.includes(permission)), [me])

  const load = useCallback(
    async (who: AdminMe) => {
      const has = (p: Permission) => who.permissions.includes(p)
      try {
        const [servicesData, slotsData, bookingsData, testimonialsData] = await Promise.all([
          has('marcacoes') || has('catalogo') ? api.get<Service[]>('/admin/services') : Promise.resolve([] as Service[]),
          has('marcacoes') ? api.get<AvailabilitySlot[]>('/admin/availability') : Promise.resolve([] as AvailabilitySlot[]),
          has('marcacoes') ? api.get<Booking[]>('/admin/bookings') : Promise.resolve([] as Booking[]),
          has('testemunhos') ? api.get<Testimonial[]>('/admin/testimonials') : Promise.resolve([] as Testimonial[]),
        ])
        setServices(servicesData)
        setSlots(slotsData)
        setBookings(bookingsData)
        setTestimonials(testimonialsData)
        setLoadError(false)
      } catch (err) {
        // An expired session (or a removed team member) goes back to the sign-in.
        if (err instanceof ApiError && err.status === 401) signOut()
        else setLoadError(true)
      }
    },
    [signOut],
  )

  // Who is signed in, then everything they can see.
  useEffect(() => {
    api
      .get<Partial<AdminMe> & { email: string }>('/auth/me')
      .then(async (who) => {
        // A server from before the team update answers with the email only: everything is allowed then.
        const full: AdminMe = {
          name: '',
          role: 'OWNER',
          notifyNewBookings: true,
          avatarVersion: null,
          createdAt: new Date().toISOString(),
          id: '',
          ...who,
          permissions: who.permissions ?? ['marcacoes', 'clientes', 'catalogo', 'testemunhos', 'estatisticas', 'notificacoes', 'definicoes'],
        }
        setMe(full)
        await load(full)
        void registerForPushNotifications()
        if (full.avatarVersion && full.id) {
          api
            .get<{ dataUrl: string | null }>(`/auth/avatar/${full.id}`)
            .then((data) => setAvatar(data.dataUrl))
            .catch(() => {})
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) adminToken.set(null)
        navigate('/admin/login')
      })
  }, [load, navigate])

  // Live while open: new requests show up on their own, and right away when the app comes back to the front.
  useEffect(() => {
    if (!me) return
    const poll = () => {
      if (document.visibilityState === 'visible') void load(me)
    }
    const interval = setInterval(poll, 10_000)
    document.addEventListener('visibilitychange', poll)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [me, load])

  // Opening the app means the notifications were seen: the number on the icon goes back to zero.
  useEffect(() => {
    const seen = () => {
      if (document.visibilityState === 'visible') void api.post('/admin/push-token/seen').catch(() => {})
    }
    seen()
    document.addEventListener('visibilitychange', seen)
    return () => document.removeEventListener('visibilitychange', seen)
  }, [])

  // Tabs the admin can't use fall back to the start.
  useEffect(() => {
    if (!me) return
    const allowed = (t: TabId) => (t === 'agenda' || t === 'requests' ? can('marcacoes') : t === 'customers' ? can('clientes') : true)
    if (!allowed(tab)) setTab('home')
  }, [me, tab, can])

  useEffect(() => {
    history.replaceState(null, '', `#${tab}`)
  }, [tab])

  const stack = stacks[tab]
  const route = stack[stack.length - 1]
  const routeKey = `${tab}:${stack.length}:${route.name}:${route.id ?? ''}`

  const remember = () => scrollMemory.current.set(routeKey, window.scrollY)

  const push = useCallback(
    (next: Route) => {
      remember()
      setDirection(1)
      setStacks((all) => ({ ...all, [tab]: [...all[tab], next] }))
      window.scrollTo({ top: 0 })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, routeKey],
  )

  const pop = useCallback(() => {
    setDirection(-1)
    setStacks((all) => (all[tab].length > 1 ? { ...all, [tab]: all[tab].slice(0, -1) } : all))
  }, [tab])

  const goTab = useCallback(
    (next: TabId, nextRoute?: Route) => {
      remember()
      setDirection(0)
      if (nextRoute) {
        // Straight to a screen: the tab's root with that screen on top (or the root itself with a mode).
        setStacks((all) => ({
          ...all,
          [next]: nextRoute.name === ROOTS[next].name ? [nextRoute] : [ROOTS[next], nextRoute],
        }))
        setTab(next)
        window.scrollTo({ top: 0 })
        return
      }
      if (next === tab) {
        // Tapping the current tab again goes back to its first screen, as on the iPhone.
        setStacks((all) => ({ ...all, [next]: [all[next][0]] }))
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      setTab(next)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, routeKey],
  )

  // Coming back to a screen puts it where it was.
  useEffect(() => {
    const y = scrollMemory.current.get(routeKey)
    if (direction !== 1) window.scrollTo({ top: y ?? 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      signOut()
    }
  }, [signOut])

  const value = useMemo<AdminContextValue | null>(
    () =>
      me && {
        me,
        setMe,
        avatar,
        setAvatar,
        can,
        isOwner: me.role === 'OWNER',
        bookings,
        slots,
        services,
        testimonials,
        reload: () => load(me),
        push,
        pop,
        goTab,
        newBooking: (customer) => setManual({ open: true, customer: customer ?? null }),
        logout: () => void logout(),
      },
    [me, avatar, can, bookings, slots, services, testimonials, load, push, pop, goTab, logout],
  )

  if (!value || !me) {
    return (
      <div className="admin-ios flex min-h-screen items-center justify-center text-[15px] text-[var(--ios-secondary)]">
        A abrir…
      </div>
    )
  }

  const pending = bookings.filter((b) => b.status === 'PENDING' && new Date(b.slot.startsAt).getTime() >= Date.now()).length
  const pendingTestimonials = testimonials.filter((t) => t.status === 'PENDING').length
  const tabs = [
    { id: 'home' as const, label: 'Início', icon: 'bx bx-home', Icon: House },
    ...(can('marcacoes')
      ? [
          { id: 'agenda' as const, label: 'Agenda', icon: 'bx bx-calendar', Icon: CalendarDays },
          { id: 'requests' as const, label: 'Pedidos', icon: 'bx bx-bell', Icon: Inbox, badge: pending },
        ]
      : []),
    ...(can('clientes') ? [{ id: 'customers' as const, label: 'Clientes', icon: 'bx bx-user', Icon: Users }] : []),
    { id: 'more' as const, label: 'Mais', icon: 'bx bx-dots-horizontal-rounded', Icon: Ellipsis, dot: pendingTestimonials > 0 },
  ]

  // The round + beside the tab bar, as before: the things done most, one tap away from any screen.
  const menuActions: MenuAction[] = [
    ...(can('marcacoes')
      ? [
          { Icon: Plus, label: 'Nova marcação', onClick: () => setManual({ open: true, customer: null }) },
          { Icon: CalendarPlus, label: 'Abrir horários', onClick: () => goTab('agenda', { name: 'agenda', id: 'horarios' }) },
          { Icon: CalendarX2, label: 'Fechar dias', onClick: () => goTab('more', { name: 'closures' }) },
        ]
      : []),
    ...(can('notificacoes') ? [{ Icon: BellRing, label: 'Notificar clientes', onClick: () => goTab('more', { name: 'broadcast' }) }] : []),
    ...(can('catalogo') ? [{ Icon: Tag, label: 'Promoções', onClick: () => goTab('more', { name: 'promotions' }) }] : []),
    {
      Icon: theme.theme === 'dark' ? Sun : Moon,
      label: theme.theme === 'dark' ? 'Tema claro' : 'Tema escuro',
      onClick: theme.toggleTheme,
    },
    { Icon: LogOut, label: 'Terminar sessão', danger: true, onClick: () => void logout() },
  ]

  const backLabel = stack.length > 1 ? TITLES[stack[stack.length - 2].name] : ''

  function render(r: Route) {
    switch (r.name) {
      case 'home':
        return <HomeScreen />
      case 'agenda':
        return <AgendaScreen initialMode={r.id} />
      case 'requests':
        return <RequestsScreen />
      case 'customers':
        return <CustomersScreen />
      case 'more':
        return <MoreScreen />
      case 'customer':
        return <CustomerDetailScreen id={r.id ?? ''} backLabel={backLabel} />
      case 'services':
        return <ServicesScreen backLabel={backLabel} />
      case 'promotions':
        return <PromotionsScreen backLabel={backLabel} />
      case 'testimonials':
        return <TestimonialsScreen backLabel={backLabel} />
      case 'profile':
        return <ProfileScreen backLabel={backLabel} />
      case 'security':
        return <SecurityScreen backLabel={backLabel} />
      case 'team':
        return <TeamScreen backLabel={backLabel} />
      case 'closures':
        return <ClosuresScreen backLabel={backLabel} />
      case 'broadcast':
        return <BroadcastScreen backLabel={backLabel} presetCustomerId={r.id} />
      case 'stats':
        return (
          <Wrapped title="Estatísticas" backLabel={backLabel} onBack={pop}>
            <StatsView />
          </Wrapped>
        )
      case 'settings':
        return (
          <Wrapped title="Negócio" backLabel={backLabel} onBack={pop}>
            <SettingsView />
          </Wrapped>
        )
      case 'portfolio':
        return (
          <Wrapped title="Portfólio" backLabel={backLabel} onBack={pop}>
            <PortfolioView />
          </Wrapped>
        )
    }
  }

  return (
    <AdminContext.Provider value={value}>
      <div className="admin-ios relative min-h-screen overflow-x-hidden">
        {loadError && (
          <button
            type="button"
            onClick={() => void value.reload()}
            className="fixed inset-x-0 top-[calc(2.75rem+env(safe-area-inset-top))] z-30 bg-[var(--ios-orange)] py-1.5 text-center text-[13px] font-medium text-white"
          >
            Sem ligação ao servidor. Toca para tentar de novo.
          </button>
        )}
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={routeKey}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d === 1 ? '100%' : d === -1 ? '-30%' : 0, opacity: d === 0 ? 0 : 1 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d === 1 ? '-30%' : d === -1 ? '100%' : 0, opacity: d === 0 ? 0 : 1 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={direction === 0 ? { duration: 0.12 } : { type: 'spring', stiffness: 380, damping: 40 }}
            className="bg-[var(--ios-bg)]"
          >
            {render(route)}
          </motion.div>
        </AnimatePresence>

        {/* The floating glass tab bar with the round options button beside it, as the admin always had. */}
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex items-end justify-center gap-2.5 px-3">
          <div className="pointer-events-auto min-w-0">
            <BottomNavBar glass compact={tabs.length > 4} items={tabs} value={tab} onChange={(id) => goTab(id)} />
          </div>
          <FloatingActionMenu actions={menuActions} dot={pendingTestimonials > 0} PlusIcon={Plus} />
        </div>

        <ManualBookingSheet
          open={manual.open}
          services={services}
          presetCustomer={manual.customer}
          slots={slots}
          onClose={() => setManual((m) => ({ ...m, open: false }))}
          onDone={() => void value.reload()}
        />
      </div>
    </AdminContext.Provider>
  )
}
