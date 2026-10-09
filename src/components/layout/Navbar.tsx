import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus, Info, LogIn, LogOut, MessageSquareQuote, Moon, Sparkles, Sun, UserRound } from 'lucide-react'
import { BottomNavBar } from '@/components/ui/bottom-nav-bar'
import { FloatingActionMenu, type MenuAction } from '@/components/ui/floating-action-button'
import { useCustomerAuth } from '@/lib/customer-auth'
import { useTheme } from '@/lib/theme'
import { instagramDmUrl, useWhatsapp } from '@/lib/site-config'

type TabId = 'top' | 'servicos' | 'galeria' | 'agendar' | 'contacto'

// The same floating tab bar as the customer app: sections of the page, plus booking, which opens its own page.
const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'top', label: 'Início', icon: 'bx bx-home-alt' },
  { id: 'servicos', label: 'Serviços', icon: 'bx bx-list-ul' },
  { id: 'agendar', label: 'Agendar', icon: 'bx bx-calendar-plus' },
  { id: 'galeria', label: 'Galeria', icon: 'bx bx-images' },
  { id: 'contacto', label: 'Contacto', icon: 'bx bx-phone' },
]

const SECTION_IDS = TABS.filter((tab) => tab.id !== 'agendar').map((tab) => tab.id)

const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

/**
 * The website menu, in the customer app's pattern: the AFROGLOW logo at the top, and at the bottom a floating
 * "liquid glass" tab bar (the active item shows its name) with the round "+" beside it for everything else.
 */
export default function Navbar() {
  const navigate = useNavigate()
  const { customer, logout } = useCustomerAuth()
  const { theme, toggleTheme } = useTheme()
  const whatsapp = useWhatsapp()
  const [activeSection, setActiveSection] = useState<TabId>('top')
  const [overHero, setOverHero] = useState(true)

  // Highlights the tab of the section on screen. The sections load lazily after the first paint, so they are
  // picked up as they appear instead of only once when the bar mounts.
  useEffect(() => {
    const observed = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (mostVisible) setActiveSection(mostVisible.target.id as TabId)
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
    { Icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? 'Tema claro' : 'Tema escuro', onClick: toggleTheme },
    { Icon: Info, label: 'Sobre nós', onClick: () => scrollToSection('sobre') },
    { Icon: MessageSquareQuote, label: 'Testemunhos', onClick: () => scrollToSection('testemunhos') },
    { Icon: Sparkles, label: 'Conhecer a CEO', onClick: () => navigate('/ceo') },
    { Icon: CalendarPlus, label: 'Agendar', onClick: () => navigate('/agendar') },
    customer
      ? { Icon: UserRound, label: 'A minha conta', onClick: () => navigate('/conta') }
      : { Icon: LogIn, label: 'Entrar ou criar conta', onClick: () => navigate('/entrar') },
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
    ...(customer ? [{ Icon: LogOut, label: 'Terminar sessão', danger: true, onClick: () => void logout() }] : []),
  ]

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 mt-[calc(1rem+env(safe-area-inset-top))] px-4 sm:mt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex max-w-6xl">
          <a
            href="#top"
            className="pointer-events-auto flex items-center rounded-full bg-white px-5 py-3 shadow-lg shadow-black/10 sm:px-6"
          >
            <span className="font-logo text-2xl leading-none tracking-wide text-gold-ink">AFROGLOW</span>
          </a>
        </div>
      </div>

      {/* Tab bar with the round menu button beside it, as in the customer app. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex items-end justify-center gap-2.5 px-3">
        <div className="pointer-events-auto">
          <BottomNavBar
            glass
            compact
            tone={overHero ? 'onDark' : 'onLight'}
            value={activeSection}
            onChange={(id) => {
              if (id === 'agendar') navigate('/agendar')
              else scrollToSection(id)
            }}
            items={TABS}
          />
        </div>
        <FloatingActionMenu actions={menuActions} tone={overHero ? 'onDark' : 'onLight'} />
      </div>
    </>
  )
}
