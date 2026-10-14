import { Link } from 'react-router-dom'
import { SiteLogo } from '@/components/layout/SiteAppShell'
import AuthScreen from '@/customer/AuthScreen'
import { usePageTitle } from '@/lib/page-title'

export default function AccountAuthPage() {
  usePageTitle('Entrar', { noindex: true })
  // Signed in already: AuthScreen moves on to the profile.
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="fixed inset-x-0 top-0 z-50 mt-[calc(1rem+env(safe-area-inset-top))] px-4 sm:mt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <SiteLogo />

          <Link
            to="/"
            className="liquid-glass flex h-[56px] items-center gap-2 rounded-full px-5 font-subtitle text-sm text-onyx transition-colors duration-300 hover:text-onyx/70"
          >
            <span>Sair</span>
            <i className="bx bx-x text-xl" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* The same simple sign-in as the customer app, under the site's header. */}
      <AuthScreen site />
    </div>
  )
}
