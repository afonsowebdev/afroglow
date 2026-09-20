import { Link } from 'react-router-dom'
import { siteConfig } from '@/lib/site-config'

const SOCIALS = [
  { label: 'Instagram', href: siteConfig.instagramUrl, icon: 'bx bxl-instagram' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-gold/20 bg-cream px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center font-body text-sm text-muted-dark sm:flex-row sm:justify-between sm:text-left">
        <p>
          &copy; {year} {siteConfig.name}. Todos os direitos reservados.
        </p>
        <div className="flex items-center gap-5">
          {SOCIALS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              aria-label={social.label}
              className="text-xl text-onyx transition-colors hover:text-gold-deep"
            >
              <i className={social.icon} aria-hidden="true" />
            </a>
          ))}
          <Link
            to="/admin"
            className="flex items-center gap-1 text-xs text-muted-dark/70 transition-colors hover:text-gold-deep"
          >
            <i className="bx bx-lock-alt text-sm" aria-hidden="true" />
            Admin
          </Link>
        </div>
      </div>
    </footer>
  )
}
