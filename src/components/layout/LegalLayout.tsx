import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Shared page frame for the legal texts (privacy policy, terms). */
export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gold/20">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="font-logo text-2xl leading-none tracking-wide text-gold-deep">
            AFROGLOW
          </Link>
          <Link to="/" className="font-subtitle text-sm text-muted-dark hover:text-onyx">
            Voltar ao site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-12 sm:px-8">
        <h1 className="font-logo text-4xl text-onyx sm:text-5xl">{title}</h1>
        <p className="mt-3 font-subtitle text-sm text-muted-dark">Última atualização: {updated}</p>
        {children}

        <nav className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-gold/20 pt-6 font-subtitle text-sm text-muted-dark">
          <Link to="/privacidade" className="hover:text-gold-deep">
            Política de privacidade
          </Link>
          <Link to="/termos" className="hover:text-gold-deep">
            Termos e condições
          </Link>
        </nav>
      </main>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-subtitle text-xl font-semibold text-onyx">{title}</h2>
      <div className="mt-3 space-y-3 font-subtitle text-[15px] leading-relaxed text-muted-dark">{children}</div>
    </section>
  )
}
