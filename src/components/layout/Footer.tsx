import type { ReactNode } from 'react'
import { ClockFill, MapPinFill } from '@/components/ui/apple-icons'
import { FooterBackgroundGradient, TextHoverEffect } from '@/components/ui/hover-footer'
import { useOpeningStatus } from '@/lib/opening-hours'
import { instagramDmUrl, siteConfig, useBusinessInfo, useWhatsapp } from '@/lib/site-config'

const EXPLORE_LINKS = [
  { label: 'Sobre nós', href: '#sobre' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Testemunhos', href: '#testemunhos' },
  { label: 'Perguntas frequentes', href: '#perguntas-frequentes' },
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
    // The address and today's hours are in the strip above the columns.
    { icon: 'bx bx-envelope', text: siteConfig.email, href: `mailto:${siteConfig.email}` },
  ]

  const { status } = useOpeningStatus(business.openingHours)
  const QUICK: Array<{ label: string; value: string; href: string; icon: ReactNode; dot?: boolean }> = [
    {
      label: 'Hoje',
      value: status?.text ?? 'Ver horário',
      href: '#localizacao',
      icon: <ClockFill className="size-6" />,
      dot: status ? status.open : undefined,
    },
    {
      label: 'Onde estamos',
      value: business.address || siteConfig.location,
      href: business.mapUrl || '#localizacao',
      icon: <MapPinFill className="size-6" />,
    },
    whatsappUrl
      ? { label: 'Fala connosco', value: 'WhatsApp', href: whatsappUrl, icon: <i className="bx bxl-whatsapp text-2xl" aria-hidden="true" /> }
      : {
          label: 'Fala connosco',
          value: `@${siteConfig.instagramHandle}`,
          href: instagramDmUrl(),
          icon: <i className="bx bxl-instagram text-2xl" aria-hidden="true" />,
        },
  ]

  const year = new Date().getFullYear()

  return (
    // Bottom padding below `md` leaves room for the floating tab bar.
    <footer className="relative overflow-hidden bg-cream pb-24 md:pb-0">
      <FooterBackgroundGradient />

      <div className="relative z-10 mx-auto max-w-6xl px-5 pt-16 sm:px-10 md:pt-24">
        {/* Quick facts before the columns: today's hours, where to find us, a direct line. */}
        <ul className="grid divide-y divide-gold/20 border-y border-gold/20 md:grid-cols-3 md:divide-x md:divide-y-0">
          {QUICK.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="group flex h-full items-center gap-4 py-6 transition-colors md:px-6 md:first:pl-0 md:last:pr-0 lg:px-8"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold-deep/10 text-gold-ink transition-colors duration-300 group-hover:bg-gold-deep group-hover:text-cream">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-subtitle text-[11px] font-medium uppercase tracking-[0.16em] text-muted-dark">
                    {item.label}
                  </span>
                  <span className="mt-1 flex items-center gap-2 font-subtitle text-sm text-onyx sm:text-base">
                    {item.dot !== undefined && (
                      <span
                        className={`size-2 shrink-0 rounded-full ${item.dot ? 'bg-emerald-500' : 'bg-muted'}`}
                        aria-hidden="true"
                      />
                    )}
                    <span className="line-clamp-2">{item.value}</span>
                  </span>
                </span>
                <i
                  className="bx bx-chevron-right -translate-x-1 text-xl text-muted-dark opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </a>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-x-8 gap-y-12 py-14 md:py-16 lg:grid-cols-12 lg:gap-x-10">
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
