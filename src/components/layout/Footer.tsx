import { FooterBackgroundGradient, TextHoverEffect } from '@/components/ui/hover-footer'
import { instagramDmUrl, siteConfig, useBusinessInfo, useWhatsapp } from '@/lib/site-config'

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

function ColumnTitle({ children }: { children: string }) {
  return (
    <h4 className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-dark">
      <span className="h-px w-4 bg-gold-deep/60" aria-hidden="true" />
      {children}
    </h4>
  )
}

function LinkList({ links }: { links: Array<{ label: string; href: string }> }) {
  return (
    <ul className="mt-5 flex flex-col gap-3">
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            className="group inline-flex items-center gap-1.5 font-body text-sm text-onyx transition-colors hover:text-gold-ink"
          >
            <i
              className="bx bx-chevron-right -ml-4 -translate-x-1 text-xs opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
              aria-hidden="true"
            />
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  )
}

export default function Footer() {
  const business = useBusinessInfo()
  const whatsapp = useWhatsapp()
  const whatsappUrl = whatsapp.enabled ? whatsapp.url('Olá! Gostaria de marcar uma sessão de tranças.') : ''

  const SOCIALS = [
    { icon: 'bx bxl-instagram', label: 'Instagram', href: instagramDmUrl() },
    ...(whatsappUrl ? [{ icon: 'bx bxl-whatsapp', label: 'WhatsApp', href: whatsappUrl }] : []),
    { icon: 'bx bx-envelope', label: 'Email', href: `mailto:${siteConfig.email}` },
  ]

  const CONTACT_INFO = [
    { icon: 'bx bxl-instagram', text: `@${siteConfig.instagramHandle}`, href: instagramDmUrl() },
    ...(business.phone
      ? [{ icon: 'bx bx-phone', text: business.phone, href: `tel:${business.phone.replace(/[^+\d]/g, '')}` }]
      : []),
    { icon: 'bx bx-envelope', text: siteConfig.email, href: `mailto:${siteConfig.email}` },
    business.address
      ? { icon: 'bx bx-map', text: business.address, href: business.mapUrl || undefined }
      : { icon: 'bx bx-map', text: siteConfig.location },
  ]

  const year = new Date().getFullYear()

  return (
    // Bottom padding below `md` leaves room for the floating tab bar.
    <footer className="relative overflow-hidden bg-cream pb-24 md:pb-0">
      <FooterBackgroundGradient />

      {/* Above the wordmark, which tucks up under the last row with a negative margin. */}
      <div className="relative z-20 mx-auto max-w-6xl px-5 pt-16 sm:px-10 md:pt-24">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 pb-14 md:pb-16 lg:grid-cols-12 lg:gap-x-10">
          <div className="col-span-2 flex flex-col gap-6 lg:col-span-4">
            <p className="max-w-xs font-subtitle text-lg font-light leading-relaxed text-onyx">
              Tranças afro feitas com <span className="text-gold-ink">cuidado</span>,{' '}
              <span className="text-gold-ink">técnica</span> e <span className="text-gold-ink">identidade</span>.
            </p>
            <ul className="flex gap-3">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target={social.href.startsWith('mailto:') ? undefined : '_blank'}
                    rel="noreferrer"
                    aria-label={social.label}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 text-lg text-gold-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-deep hover:bg-gold-deep hover:text-cream"
                  >
                    <i className={social.icon} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Explorar" className="lg:col-span-3">
            <ColumnTitle>Explorar</ColumnTitle>
            <LinkList links={EXPLORE_LINKS} />
          </nav>

          <nav aria-label="A tua conta" className="lg:col-span-2">
            <ColumnTitle>A tua conta</ColumnTitle>
            <LinkList links={ACCOUNT_LINKS} />
          </nav>

          <div className="col-span-2 lg:col-span-3">
            <ColumnTitle>Contacto</ColumnTitle>
            <ul className="mt-5 flex flex-col gap-3.5">
              {CONTACT_INFO.map((item) => (
                <li key={item.text} className="flex items-center gap-3 font-body text-sm text-onyx">
                  <i className={`${item.icon} text-base text-gold-ink`} aria-hidden="true" />
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel="noreferrer"
                      className="break-all transition-colors hover:text-gold-ink"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span>{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
            {business.openingHours.length > 0 && (
              <dl className="mt-6 flex flex-col gap-1.5 border-t border-gold/15 pt-5 font-body text-sm">
                {business.openingHours.map((row) => (
                  <div key={row.days} className="flex justify-between gap-4">
                    <dt className="text-muted-dark">{row.days}</dt>
                    <dd className="text-onyx">{row.hours}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-gold/20 pt-8 text-center lg:flex-row lg:text-left">
          <p className="font-body text-sm text-muted-dark">
            &copy; {year} {siteConfig.name}. Todos os direitos reservados.
          </p>
          <nav aria-label="Informação legal" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <a href="/privacidade" className="font-body text-sm text-muted-dark transition-colors hover:text-gold-ink">
              Política de privacidade
            </a>
            <a href="/termos" className="font-body text-sm text-muted-dark transition-colors hover:text-gold-ink">
              Termos e condições
            </a>
            <a
              href="https://www.livroreclamacoes.pt/"
              target="_blank"
              rel="noreferrer"
              className="font-body text-sm text-muted-dark transition-colors hover:text-gold-ink"
            >
              Livro de Reclamações
            </a>
            <a
              href="#top"
              // Scrolls up on any page, including those without a #top section.
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="group inline-flex items-center gap-1 font-body text-sm text-muted-dark transition-colors hover:text-gold-ink"
            >
              Voltar ao topo
              <i
                className="bx bx-up-arrow-alt transition-transform duration-300 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </a>
          </nav>
        </div>
      </div>

      <div className="relative z-10 -mt-2 flex h-32 px-2 sm:h-56 lg:-mt-6 lg:h-72">
        <TextHoverEffect text={siteConfig.name} />
      </div>
    </footer>
  )
}
