import { ArrowUp } from 'lucide-react'
import { BrandLogo } from '@/components/ui/brand-logo'
import { dayList, useOpeningStatus } from '@/lib/opening-hours'
import { instagramDmUrl, mapSearchText, siteConfig, useBusinessInfo, useWhatsapp } from '@/lib/site-config'
import { cn } from '@/lib/utils'

const EXPLORE_LINKS = [
  // Sections of the home page, written as /#… so they also work from the other pages that show this footer.
  { label: 'Sobre nós', href: '/#sobre' },
  { label: 'Serviços', href: '/#servicos' },
  { label: 'Como funciona', href: '/#como-funciona' },
  { label: 'Galeria', href: '/#galeria' },
  { label: 'Testemunhos', href: '/#testemunhos' },
  { label: 'Perguntas frequentes', href: '/#perguntas-frequentes' },
]

const ACCOUNT_LINKS = [
  { label: 'Agendar', href: '/agendar' },
  { label: 'As minhas marcações', href: '/marcacoes' },
  { label: 'Perfil', href: '/conta' },
  { label: 'Conhecer a CEO', href: '/ceo' },
]

/** Small caps label over each column. */
function ColumnTitle({ children }: { children: string }) {
  return <h4 className="font-subtitle text-[11px] font-medium uppercase tracking-[0.18em] text-onyx/45">{children}</h4>
}

const linkClass =
  'font-subtitle text-sm text-onyx/70 underline-offset-4 transition-colors hover:text-onyx hover:underline'

function LinkList({ links }: { links: Array<{ label: string; href: string }> }) {
  return (
    <ul className="mt-5 flex flex-col gap-3">
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} className={linkClass}>
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  )
}

/**
 * The site's footer, in black and white: the logo, a line and the social links on top; the pages, the account,
 * the contacts and the opening hours (today in bold) in four columns; the legal line and a round "back to top" at
 * the bottom. No AFROGLOW in the background: the contact section above already ends on the big word.
 */
export default function Footer() {
  const business = useBusinessInfo()
  const whatsapp = useWhatsapp()
  const { todayRows, closedDays, todayClosed } = useOpeningStatus(business.openingHours)
  const whatsappUrl = whatsapp.enabled ? whatsapp.url('Olá! Gostaria de marcar uma sessão de tranças.') : ''

  const socials = [
    { icon: 'bx bxl-instagram', label: 'Instagram', href: instagramDmUrl() },
    ...(whatsappUrl ? [{ icon: 'bx bxl-whatsapp', label: 'WhatsApp', href: whatsappUrl }] : []),
    { icon: 'bx bx-envelope', label: 'Email', href: `mailto:${siteConfig.email}` },
  ]

  const contacts = [
    { icon: 'bx bxl-instagram', text: `@${siteConfig.instagramHandle}`, href: instagramDmUrl() },
    ...(business.phone
      ? [{ icon: 'bx bx-phone', text: business.phone, href: `tel:${business.phone.replace(/[^+\d]/g, '')}` }]
      : []),
    { icon: 'bx bx-envelope', text: siteConfig.email, href: `mailto:${siteConfig.email}` },
    ...(business.address
      ? [
          {
            icon: 'bx bx-map',
            text: business.address,
            href:
              business.mapUrl ||
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearchText(business.address))}`,
          },
        ]
      : [{ icon: 'bx bx-map', text: siteConfig.location, href: undefined }]),
  ]

  const year = new Date().getFullYear()

  return (
    // Bottom padding below `md` leaves room for the floating tab bar.
    <footer className="relative border-t border-onyx/10 bg-white pb-24 md:pb-0">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* The logo and a line, the social links beside them. */}
        <div className="flex flex-col gap-6 border-b border-onyx/10 py-12 sm:flex-row sm:items-end sm:justify-between md:py-16">
          <div>
            <a href="/" aria-label="AFROGLOW, voltar ao início" className="inline-flex">
              <BrandLogo size="md" />
            </a>
            <p className="mt-4 max-w-sm font-subtitle text-base font-light leading-relaxed text-onyx/60">
              Tranças afro feitas com cuidado, técnica e identidade.
            </p>
          </div>
          <ul className="flex gap-2.5">
            {socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target={social.href.startsWith('mailto:') ? undefined : '_blank'}
                  rel="noreferrer"
                  aria-label={social.label}
                  className="flex size-11 items-center justify-center rounded-full bg-onyx text-lg text-white transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <i className={social.icon} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Four columns on wide screens; two, then the contacts and hours across, on phones. */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 py-12 md:py-16 lg:grid-cols-[1fr_1fr_1.3fr_1.2fr] lg:gap-x-12">
          <nav aria-label="Explorar">
            <ColumnTitle>Explorar</ColumnTitle>
            <LinkList links={EXPLORE_LINKS} />
          </nav>

          <nav aria-label="A tua conta">
            <ColumnTitle>A tua conta</ColumnTitle>
            <LinkList links={ACCOUNT_LINKS} />
          </nav>

          <div className="col-span-2 lg:col-span-1">
            <ColumnTitle>Contacto</ColumnTitle>
            <ul className="mt-5 flex flex-col gap-3.5">
              {contacts.map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <i className={`${item.icon} mt-0.5 text-base text-onyx/50`} aria-hidden="true" />
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel="noreferrer"
                      className={cn(linkClass, 'break-words')}
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span className="font-subtitle text-sm text-onyx/70">{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {business.openingHours.length > 0 && (
            <div className="col-span-2 lg:col-span-1">
              <ColumnTitle>Horário</ColumnTitle>
              <dl className="mt-5 flex flex-col gap-2 font-subtitle text-sm">
                {business.openingHours.map((row, index) => {
                  const today = todayRows.has(index)
                  return (
                    <div key={row.days} className="flex justify-between gap-4">
                      <dt className={today ? 'font-medium text-onyx' : 'text-onyx/55'}>
                        {row.days}
                        {today && <span className="ml-2 text-[10px] uppercase tracking-wider text-onyx/45">Hoje</span>}
                      </dt>
                      <dd className={cn('tabular-nums', today ? 'font-medium text-onyx' : 'text-onyx/70')}>
                        {row.hours}
                      </dd>
                    </div>
                  )
                })}
                {closedDays.length > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className={todayClosed ? 'font-medium text-onyx' : 'text-onyx/55'}>{dayList(closedDays)}</dt>
                    <dd className="text-onyx/45">Fechado</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* The legal line, and a round button back to the top. */}
        <div className="flex flex-col-reverse items-center gap-6 border-t border-onyx/10 py-8 sm:flex-row sm:justify-between">
          <p className="font-subtitle text-xs text-onyx/50">
            &copy; {year} {siteConfig.name}. Todos os direitos reservados.
          </p>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
            <nav
              aria-label="Informação legal"
              className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-subtitle text-xs"
            >
              <a href="/privacidade" className={cn(linkClass, 'text-xs')}>
                Política de privacidade
              </a>
              <a href="/termos" className={cn(linkClass, 'text-xs')}>
                Termos e condições
              </a>
              <a
                href="https://www.livroreclamacoes.pt/"
                target="_blank"
                rel="noreferrer"
                className={cn(linkClass, 'text-xs')}
              >
                Livro de Reclamações
              </a>
            </nav>
            <button
              type="button"
              // Scrolls up on any page, including those without a #top section.
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Voltar ao topo"
              className="group flex size-11 items-center justify-center rounded-full border border-onyx/20 text-onyx transition-colors hover:border-onyx hover:bg-onyx hover:text-white"
            >
              <ArrowUp
                className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5"
                strokeWidth={2}
              />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
