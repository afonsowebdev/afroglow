import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarCheck, LogIn, LogOut, Moon, PanelTop, PanelTopClose, Settings, Sparkles, Sun, UserRound } from 'lucide-react'
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
import { AccountMenu, DesktopNav, type AccountItem, type DesktopLink } from '@/components/layout/DesktopNav'
import { ButtonWithIcon } from '@/components/ui/button-with-icon'
import { NotificationBell } from '@/components/layout/NotificationBell'
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
  { id: 'perguntas-frequentes', label: 'FAQ' },
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
    { Icon: InfoCircleFill, label: 'Perguntas frequentes', onClick: () => scrollToSection('perguntas-frequentes') },
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

  // Wide screens: the account menu behind the customer's photo, with what the "+" holds elsewhere; outline icons.
  const firstName = customer?.name.trim().split(/\s+/)[0]
  const accountItems: AccountItem[] = [
    ...(customer
      ? [
          { Icon: UserRound, label: 'O meu perfil', onClick: () => navigate('/conta') },
          { Icon: CalendarCheck, label: 'As minhas marcações', onClick: () => navigate('/marcacoes') },
          { Icon: Settings, label: 'Definições', onClick: () => navigate('/definicoes') },
        ]
      : [{ Icon: LogIn, label: 'Entrar ou criar conta', onClick: () => navigate('/entrar') }]),
    { Icon: Sparkles, label: 'Conhecer a CEO', onClick: () => navigate('/ceo'), divider: true },
    { iconClass: 'bx bxl-instagram', label: 'Instagram', href: instagramDmUrl() },
    ...(whatsapp.enabled
      ? [{ iconClass: 'bx bxl-whatsapp', label: 'WhatsApp', href: whatsapp.url('Olá! Gostaria de saber mais sobre os vossos serviços.') }]
      : []),
    {
      Icon: theme === 'dark' ? Sun : Moon,
      label: theme === 'dark' ? 'Tema claro' : 'Tema escuro',
      onClick: toggleTheme,
      divider: true,
    },
    {
      Icon: hideOnScroll ? PanelTop : PanelTopClose,
      label: hideOnScroll ? 'Menu sempre visível' : 'Ocultar menu ao descer',
      onClick: () => setHideNavOnScroll(!hideOnScroll),
    },
    ...(customer
      ? [{ Icon: LogOut, label: 'Terminar sessão', danger: true, divider: true, onClick: () => void logout().then(() => navigate('/')) }]
      : []),
  ]

  // The brand's "A" emblem, then the wordmark: white over the video, black over the light sections. On wide screens it
  // sits inside the one header bar; on smaller ones in a glass pill of its own, beside the tab bar.
  const logo = (
    <a
      href={onHome ? '#top' : '/'}
      onClick={(e) => {
        if (onHome) return
        e.preventDefault()
        navigate('/')
      }}
      aria-label="AFROGLOW, voltar ao início"
      className={`pointer-events-auto flex items-center gap-3 rounded-full h-9 pe-3 ps-0.5`}
    >
      <span
        className={`flex shrink-0 size-8 items-center justify-center rounded-full logo-weight font-logo text-[1.35rem] leading-none shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-colors duration-500 ${
          headerOverHero ? 'bg-[#ffffff] text-[#111111]' : 'bg-onyx text-white'
        }`}
        aria-hidden="true"
      >
        <span className="translate-y-[2px]">A</span>
      </span>
      <span
        className={`translate-y-[2px] logo-weight font-logo leading-none tracking-[0.14em] text-[1.1rem] transition-colors duration-500 ${
          headerOverHero ? 'text-[#ffffff]' : 'text-onyx'
        }`}
      >
        AFROGLOW
      </span>
    </a>
  )

  // Phones and tablets: just the "A", gold on white (white on the dark background colour in the dark theme).
  const mark = (
    <a
      href={onHome ? '#top' : '/'}
      onClick={(e) => {
        if (onHome) return
        e.preventDefault()
        navigate('/')
      }}
      aria-label="AFROGLOW, voltar ao início"
      className="pointer-events-auto flex size-[56px] items-center justify-center rounded-full bg-[#ffffff] font-logo text-[1.75rem] leading-none text-[#c9a84c] shadow-[0_2px_10px_rgba(0,0,0,0.16)] logo-weight dark:bg-[#2b1d12] dark:text-[#ffffff] dark:ring-1 dark:ring-[#ffffff]/15"
    >
      <span className="translate-y-[2px]" aria-hidden="true">
        A
      </span>
    </a>
  )

  return (
    <>
      <div
        data-tone={headerTone}
        // Always in place and at the same size while scrolling; only the phone tab bar below steps aside.
        className="site-header pointer-events-none fixed inset-x-0 top-0 z-50 mt-[calc(1rem+env(safe-area-inset-top))] px-4 sm:mt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="lg:hidden">{mark}</div>

          {/* Wide screens: a glass bar with the logo and the sections (centred on the page), then "Agendar" and the
              account, each in its own glass beside it. Always 48px tall. */}
          <div className="relative hidden w-full items-center gap-2.5 lg:flex">
            <div
              className="liquid-glass pointer-events-auto flex h-12 min-w-0 flex-1 items-center rounded-full px-2"
            >
              {logo}
            </div>
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
              inBar
            />
            {/* Signed-in customers: what the app would notify them about, for those who don't use it. */}
            {customer && (
              <div className="pointer-events-auto">
                <NotificationBell
                  tone={headerTone}
                  className="size-12"
                />
              </div>
            )}
            <div className="pointer-events-auto">
              <ButtonWithIcon
                label="Agendar"
                tone={headerTone}
                compact
                onClick={() => navigate('/agendar')}
                aria-current={page === 'agendar' ? 'page' : undefined}
                className="!h-12"
              />
            </div>
            <div className="pointer-events-auto">
              <AccountMenu
                tone={headerTone}
                avatar={customer ? avatar : null}
                dot={dot}
                active={page === 'perfil'}
                label={customer ? `Olá, ${firstName}` : 'Ainda não tens conta?'}
                items={accountItems}
                className="!size-12"
              />
            </div>
          </div>

          {/* Tablets: the app's tab bar and its round menu, which opens downward. Phones: only the menu here. */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="pointer-events-auto hidden md:block">{tabBar(headerTone)}</div>
            {customer && (
              <div className="pointer-events-auto">
                <NotificationBell tone={headerTone} className="size-14" />
              </div>
            )}
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
