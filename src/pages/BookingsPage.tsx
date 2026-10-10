import { SiteAppShell } from '@/components/layout/SiteAppShell'
import BookingsScreen from '@/customer/BookingsScreen'
import { usePageTitle } from '@/lib/page-title'

/** The website's bookings page: the customer app's bookings screen (reschedule, cancel), its cards side by side. */
export default function BookingsPage() {
  usePageTitle('As minhas marcações', { noindex: true })
  return (
    <SiteAppShell requireAccount>
      <BookingsScreen wide />
    </SiteAppShell>
  )
}
