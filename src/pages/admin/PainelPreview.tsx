import { HomeView } from './HomeView'

/** Development only: the Painel over the sample data, without signing in, to look at the blocks and charts. */
export default function PainelPreview() {
  // ?grafico=linhas|circular opens the chart block in that view.
  const view = new URLSearchParams(window.location.search).get('grafico')
  if (view) {
    try {
      localStorage.setItem('afroadmin:painel-grafico', JSON.stringify(view))
    } catch {
      // Storage blocked: the default view.
    }
  }
  // ?telemovel shows it at an iPhone's width (390px).
  const phone = new URLSearchParams(window.location.search).has('telemovel')
  return (
    <div className="app-neutral afro-admin relative min-h-screen bg-white font-medium">
      <main className={phone ? 'w-[390px] px-5 pb-10 pt-10' : 'mx-auto max-w-4xl px-5 pb-36 pt-16 sm:px-8'}>
        <HomeView
          name="Ruth"
          bookings={[]}
          slots={[]}
          services={[]}
          testimonials={[]}
          loaded
          startInDemo
          can={() => true}
          onOpen={() => {}}
          onNewBooking={() => {}}
        />
      </main>
    </div>
  )
}
