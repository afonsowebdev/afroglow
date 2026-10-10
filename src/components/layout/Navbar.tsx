import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarCheckFill,
  CalendarPlusFill,
  DockDownFill,
  DockFill,
  GearFill,
  HouseFill,
  InfoCircleFill,
  ListRectangleFill,
  MoonFill,
  PersonCircleFill,
  PhoneFill,
  PhotoStackFill,
  PlusBold,
  QuoteBubbleFill,
  SignOutFill,
  SparklesFill,
  SunFill,
} from '@/components/ui/apple-icons'
import { BottomNavBar, type BottomNavItem } from '@/components/ui/bottom-nav-bar'
import { DesktopNav, type AccountItem, type DesktopLink } from '@/components/layout/DesktopNav'
import { FloatingActionMenu, type MenuAction } from '@/components/ui/floating-action-button'
import { loadAvatar, useAvatar } from '@/lib/avatar-store'
import { useHideOnScroll } from '@/customer/nav-visibility'
import { useCustomerAuth } from '@/lib/customer-auth'
import { setHideNavOnScroll, useHideNavOnScrollSetting } from '@/lib/nav-prefs'
import { useTheme } from '@/lib/theme'
import { instagramDmUrl, useWhatsapp } from '@/lib/site-config'

type TabId = 'top' | 'servicos' | 'galeria' | 'agendar' | 'contacto' | 'perfil'

// The same floating tab bar as the customer app: sections of the page, plus booking, which opens its own page.
// Icons in the style of Apple's SF Symbols (see apple-icons); `icon` stays as the Boxicons fallback.
const TABS: Array<BottomNavItem<TabId>> = [
  { id: 'top', label: 'Início', icon: 'bx bx-home-alt', Icon: HouseFill },
  { id: 'servicos', label: 'Serviços', icon: 'bx bx-list-ul', Icon: ListRectangleFill },
  { id: 'agendar', label: 'Agendar', icon: 'bx bx-calendar-plus', Icon: CalendarPlusFill },
  { id: 'galeria', label: 'Galeria', icon: 'bx bx-images', Icon: PhotoStackFill },
  { id: 'contacto', label: 'Contacto', icon: 'bx bx-phone', Icon: PhoneFill },
  { id: 'perfil', label: 'Perfil', icon: 'bx bx-user', Icon: PersonCircleFill },
]

// Tabs that open their own page rather than a section of this one.
const PAGE_TABS: TabId[] = ['agendar', 'perfil']

// Wide screens: the sections as words, in the order they appear on the page.
const DESKTOP_LINKS: DesktopLink[] = [
  { id: 'sobre', label: 'Sobre nós' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'galeria', label: 'Galeria' },
  { id: 'testemunhos', label: 'Testemunhos' },
  { id: 'contacto', label: 'Contacto' },
]

// Every section either menu highlights while it is on screen.
const SECTION_IDS = [
  ...new Set([
    ...TABS.filter((tab) => !PAGE_TABS.includes(tab.id)).map((tab) => tab.id as string),
    ...DESKTOP_LINKS.map((link) => link.id),
  ]),
]

/**
 * The website menu. Wide screens: the AFROGLOW logo, the sections as words, an "Agendar" button and the account
 * menu (DesktopNav). Tablets and phones: the customer app's floating "liquid glass" tab bar (the active item shows
 * its name) with the round "+" for everything else. The same menu shows on the customer pages, with `page` keeping
 * their tab selected; its sections then lead back to the home page.
 */
export default function Navbar({
  page,
  hidden = false,
  dot = false,
}: {
  /** On a page of its own (booking, profile): the tab kept selected. */
  page?: 'agendar' | 'perfil'
  /** Slides the phone tab bar away (a screen showing its own bottom button). */
  hidden?: boolean
  /** A red dot on the profile tab: a booking decision the customer hasn't seen. */
  dot?: boolean
} = {}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const onHome = pathname === '/'
  // As in the apps (same setting, in the "+" menu): the menu slides away while scrolling down and comes back on
  // the way up, near the top, or at the end of the page.
  const hideOnScroll = useHideNavOnScrollSetting()
  const scrolledAway = useHideOnScroll(hideOnScroll, pathname)
  // On the home page the sections scroll into view; elsewhere they open the home page at that section.
  const scrollToSection = (id: string) => {
    if (onHome) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    else navigate(`/#${id}`)
  }
  const { customer, logout } = useCustomerAuth()
  const { theme, toggleTheme } = useTheme()
  const whatsapp = useWhatsapp()
  const avatar = useAvatar()

  useEffect(() => {
    if (customer) void loadAvatar()
  }, [customer])
  const [activeSection, setActiveSection] = useState<string>('top')
  const [overHero, setOverHero] = useState(true)
  const [headerOverHero, setHeaderOverHero] = useState(true)

  // Highlights the tab of the section on screen. The sections load lazily after the first paint, so they are
  // picked up as they appear instead of only once when the bar mounts.
  useEffect(() => {
    const observed = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (mostVisible) setActiveSection(mostVisible.target.id)
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    )

    const scan = () => {
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id)
        if (el && !observed.has(id)) {
          observed.add(id)
          observer.observe(el)
        }
      }
      if (observed.size === SECTION_IDS.length) mutations.disconnect()
    }
    const mutations = new MutationObserver(scan)
    mutations.observe(document.body, { childList: true, subtree: true })
    scan()

    return () => {
      mutations.disconnect()
      observer.disconnect()
    }
  }, [])

  // White icons while the hero video is behind the bar, dark once the white sections scroll under it.
  useEffect(() => {
    const update = () => {
      const hero = document.getElementById('top')
      setOverHero(!!hero && hero.getBoundingClientRect().bottom > window.innerHeight - 60)
      setHeaderOverHero(!!hero && hero.getBoundingClientRect().bottom > 80)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const menuActions: MenuAction[] = [
    { Icon: theme === 'dark' ? SunFill : MoonFill, label: theme === 'dark' ? 'Tema claro' : 'Tema escuro', onClick: toggleTheme },
    {
      Icon: hideOnScroll ? DockFill : DockDownFill,
      label: hideOnScroll ? 'Menu sempre visível' : 'Ocultar menu ao descer',
      onClick: () => setHideNavOnScroll(!hideOnScroll),
    },
    { Icon: InfoCircleFill, label: 'Sobre nós', onClick: () => scrollToSection('sobre') },
    { Icon: QuoteBubbleFill, label: 'Testemunhos', onClick: () => scrollToSection('testemunhos') },
    { Icon: SparklesFill, label: 'Conhecer a CEO', onClick: () => navigate('/ceo') },
    { Icon: CalendarPlusFill, label: 'Agendar', onClick: () => navigate('/agendar') },
    ...(customer
      ? [
          { Icon: CalendarCheckFill, label: 'As minhas marcações', onClick: () => navigate('/marcacoes') },
          { Icon: GearFill, label: 'Definições', onClick: () => navigate('/definicoes') },
        ]
      : []),
    { iconClass: 'bx bxl-instagram', label: 'Instagram', href: instagramDmUrl() },
    ...(whatsapp.enabled
      ? [
          {
            iconClass: 'bx bxl-whatsapp',
            label: 'WhatsApp',
            href: whatsapp.url('Olá! Gostaria de saber mais sobre os vossos serviços.'),
          },
        ]
      : []),
    ...(customer ? [{ Icon: SignOutFill, label: 'Terminar sessão', danger: true, onClick: () => void logout().then(() => navigate('/')) }] : []),
  ]

  const tabBar = (tone: 'onDark' | 'onLight', hide = false) => (
    <BottomNavBar
      glass
      compact
      tone={tone}
      hidden={hide}
      value={page ?? (activeSection as TabId)}
      onChange={(id) => {
        if (id === 'agendar') navigate('/agendar')
        // Signed in: the profile; otherwise the sign-in page, which leads there.
        else if (id === 'perfil') navigate(customer ? '/conta' : '/entrar')
        else scrollToSection(id)
      }}
      items={TABS.map((item) =>
        // The customer's photo stands in for the profile icon when there is one, as in the app.
        item.id === 'perfil' && customer ? { ...item, image: avatar, dot } : item,
      )}
    />
  )
  const headerTone = headerOverHero ? 'onDark' : 'onLight'

  // Wide screens: the account menu behind the customer's photo, with what the "+" holds elsewhere.
  const firstName = customer?.name.trim().split(/\s+/)[0]
  const accountItems: AccountItem[] = [
    ...(customer
      ? [
          { Icon: PersonCircleFill, label: 'O meu perfil', onClick: () => navigate('/conta') },
          { Icon: CalendarCheckFill, label: 'As minhas marcações', onClick: () => navigate('/marcacoes') },
          { Icon: GearFill, label: 'Definições', onClick: () => navigate('/definicoes') },
        ]
      : [{ Icon: PersonCircleFill, label: 'Entrar ou criar conta', onClick: () => navigate('/entrar') }]),
    { Icon: SparklesFill, label: 'Conhecer a CEO', onClick: () => navigate('/ceo'), divider: true },
    { iconClass: 'bx bxl-instagram', label: 'Instagram', href: instagramDmUrl() },
    ...(whatsapp.enabled
      ? [{ iconClass: 'bx bxl-whatsapp', label: 'WhatsApp', href: whatsapp.url('Olá! Gostaria de saber mais sobre os vossos serviços.') }]
      : []),
    {
      Icon: theme === 'dark' ? SunFill : MoonFill,
      label: theme === 'dark' ? 'Tema claro' : 'Tema escuro',
      onClick: toggleTheme,
      divider: true,
    },
    {
      Icon: hideOnScroll ? DockFill : DockDownFill,
      label: hideOnScroll ? 'Menu sempre visível' : 'Ocultar menu ao descer',
      onClick: () => setHideNavOnScroll(!hideOnScroll),
    },
    ...(customer
      ? [{ Icon: SignOutFill, label: 'Terminar sessão', danger: true, divider: true, onClick: () => void logout().then(() => navigate('/')) }]
      : []),
  ]

  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 top-0 z-50 mt-[calc(1rem+env(safe-area-inset-top))] px-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:mt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6 ${
          scrolledAway ? '-translate-y-[calc(100%+2.5rem+env(safe-area-inset-top))]' : ''
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          {/* The logo sits in the same glass pill as the tab bar: the brand's "A" emblem (as on the app icon), then the
              wordmark, white over the video and gold over the light sections. */}
          <a
            href={onHome ? '#top' : '/'}
            onClick={(e) => {
              if (onHome) return
              e.preventDefault()
              navigate('/')
            }}
            aria-label="AFROGLOW, voltar ao início"
            className="liquid-glass pointer-events-auto flex h-[56px] items-center gap-3 rounded-full pe-5 ps-2"
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4eedf] logo-weight font-logo text-[1.35rem] leading-none text-[#8b6a24] shadow-[0_1px_4px_rgba(0,0,0,0.18)]"
              aria-hidden="true"
            >
              <span className="translate-y-[2px]">A</span>
            </span>
            <span
              className={`translate-y-[2px] logo-weight font-logo text-[1.35rem] leading-none tracking-[0.14em] transition-colors duration-500 ${
                headerOverHero ? 'text-[#ffffff]' : 'text-gold-ink'
              }`}
            >
              AFROGLOW
            </span>
          </a>

          {/* Wide screens: the sections as words, booking as its own button and the account menu. */}
          <div className="hidden lg:flex">
            <DesktopNav
              links={DESKTOP_LINKS}
              active={!page && onHome && DESKTOP_LINKS.some((l) => l.id === activeSection) ? activeSection : null}
              onLink={scrollToSection}
              onBook={() => navigate('/agendar')}
              bookingActive={page === 'agendar'}
              profileActive={page === 'perfil'}
              tone={headerTone}
              avatar={customer ? avatar : null}
              dot={dot}
              accountLabel={customer ? `Olá, ${firstName}` : 'Ainda não tens conta?'}
              accountItems={accountItems}
            />
          </div>

          {/* Tablets: the app's tab bar and its round menu, which opens downward. Phones: only the menu here. */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="pointer-events-auto hidden md:block">{tabBar(headerTone)}</div>
            <FloatingActionMenu actions={menuActions} direction="down" tone={headerTone} PlusIcon={PlusBold} />
          </div>
        </div>
      </div>

      {/* On phones the header has no room for the tabs, so they stay at the bottom, as in the customer app. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-3 md:hidden">
        <div className={hidden || scrolledAway ? 'pointer-events-none' : 'pointer-events-auto'}>
          {tabBar(overHero ? 'onDark' : 'onLight', hidden || scrolledAway)}
        </div>
      </div>
    </>
  )
}
