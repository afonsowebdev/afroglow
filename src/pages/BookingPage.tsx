import { SiteAppShell } from '@/components/layout/SiteAppShell'
import BookScreen from '@/customer/BookScreen'
import { usePageTitle } from '@/lib/page-title'

/** The website's booking page: the customer app's three-step flow (model, date, confirm) in the app frame. */
export default function BookingPage() {
  usePageTitle('Marcar sessão')
  return (
    <SiteAppShell>
      <BookScreen site />
    </SiteAppShell>
  )
}
