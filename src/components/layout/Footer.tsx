import { Link } from 'react-router-dom'
import { FooterBackgroundGradient, TextHoverEffect } from '@/components/ui/hover-footer'
import { MotionButton } from '@/components/ui/motion-button'
import { instagramDmUrl, siteConfig, whatsappUrl } from '@/lib/site-config'

const NAV_LINKS = [
  { label: 'Início', href: '#top' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Galeria', href: '#galeria' },
  { label: 'Contacto', href: '#contacto' },
]

const CONTACT_INFO = [
  { icon: 'bx bxl-instagram', text: `@${siteConfig.instagramHandle}`, href: instagramDmUrl() },
  {
    icon: 'bx bxl-whatsapp',
    text: 'WhatsApp',
    href: whatsappUrl('Olá! Gostaria de marcar uma sessão de tranças.'),
  },
  { icon: 'bx bx-map', text: siteConfig.location },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative m-4 overflow-hidden rounded-3xl bg-cream sm:m-8">
      <FooterBackgroundGradient />

      <div className="relative z-10 mx-auto max-w-6xl p-8 sm:p-14">
        <div className="flex flex-col items-center justify-between gap-6 border-b border-gold/20 pb-10 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="font-logo text-3xl text-onyx sm:text-4xl">Pronta para brilhar?</h3>
            <p className="mt-2 font-subtitle text-sm font-light text-muted-dark">
              Marca a tua próxima sessão de tranças em poucos minutos.
            </p>
          </div>
          <MotionButton label="Agendar" href="/agendar" />
        </div>

        <div className="grid grid-cols-1 gap-12 py-12 sm:grid-cols-2 md:gap-16 lg:grid-cols-3">
          <div className="flex flex-col gap-4">
            <span className="font-logo text-4xl leading-none text-gold-deep">{siteConfig.name}</span>
            <p className="font-subtitle text-sm font-light leading-relaxed text-muted-dark">
              Tranças afro feitas com cuidado, técnica e identidade.
            </p>
          </div>

          <div>
            <h4 className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-dark">
              <span className="h-px w-4 bg-gold-deep/60" aria-hidden="true" />
              Navegação
            </h4>
            <ul className="mt-5 flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="group inline-flex items-center gap-1.5 font-body text-sm text-onyx transition-colors hover:text-gold-deep"
                  >
                    <i
                      className="bx bx-chevron-right -translate-x-1 text-xs opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-dark">
              <span className="h-px w-4 bg-gold-deep/60" aria-hidden="true" />
              Contacto
            </h4>
            <ul className="mt-5 flex flex-col gap-4">
              {CONTACT_INFO.map((item) => (
                <li key={item.text} className="flex items-center gap-3 font-body text-sm text-onyx">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold-deep">
                    <i className={item.icon} aria-hidden="true" />
                  </span>
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="transition-colors hover:text-gold-deep"
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

        <hr className="border-t border-gold/20" />

        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-center sm:flex-row sm:text-left">
          <p className="font-body text-sm text-muted-dark">
            &copy; {year} {siteConfig.name}. Todos os direitos reservados.
          </p>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 px-3.5 py-1.5 font-subtitle text-[11px] uppercase tracking-[0.15em] text-muted-dark transition-colors hover:border-gold-deep hover:text-gold-deep"
          >
            <i className="bx bx-lock-alt text-sm" aria-hidden="true" />
            Admin
          </Link>
        </div>
      </div>

      <div className="relative z-10 hidden h-64 sm:h-80 lg:flex">
        <TextHoverEffect text={siteConfig.name} />
      </div>
    </footer>
  )
}
