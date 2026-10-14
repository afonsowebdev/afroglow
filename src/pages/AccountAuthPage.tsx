import AuthScreen from '@/customer/AuthScreen'
import { usePageTitle } from '@/lib/page-title'

export default function AccountAuthPage() {
  usePageTitle('Entrar', { noindex: true })
  // Signed in already: AuthScreen moves on to the profile.
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      {/* The same simple sign-in as the customer app; no header, the "A" at the top leads home. */}
      <AuthScreen site />
    </div>
  )
}
