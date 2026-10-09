import { SiteAppShell } from '@/components/layout/SiteAppShell'
import SettingsScreen from '@/customer/SettingsScreen'
import { usePageTitle } from '@/lib/page-title'

/** The website's account settings: the customer app's settings screen in the app frame. */
export default function SettingsPage() {
  usePageTitle('Definições', { noindex: true })
  return (
    <SiteAppShell requireAccount>
      <SettingsScreen />
    </SiteAppShell>
  )
}
