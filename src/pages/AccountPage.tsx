import { SiteAppShell } from '@/components/layout/SiteAppShell'
import { usePageTitle } from '@/lib/page-title'
import SiteProfile from './SiteProfile'

/** The website's profile page: the profile laid out for the site (the app keeps its own screen), in the site frame. */
export default function AccountPage() {
  usePageTitle('A minha conta', { noindex: true })
  return (
    <SiteAppShell requireAccount>
      <SiteProfile />
    </SiteAppShell>
  )
}
