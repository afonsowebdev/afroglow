import { SiteAppShell } from '@/components/layout/SiteAppShell'
import ProfileScreen from '@/customer/ProfileScreen'
import { usePageTitle } from '@/lib/page-title'

/** The website's profile page: the customer app's profile screen in the app frame. */
export default function AccountPage() {
  usePageTitle('A minha conta', { noindex: true })
  return (
    <SiteAppShell requireAccount>
      <ProfileScreen />
    </SiteAppShell>
  )
}
