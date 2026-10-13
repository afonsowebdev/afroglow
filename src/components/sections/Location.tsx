import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { dayList, useOpeningStatus } from '@/lib/opening-hours'
import { mapSearchText, useBusinessInfo } from '@/lib/site-config'
import { VelocityRow } from '@/components/ui/velocity-marquee'

const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
})

// The address on Google Maps: embedded (no key needed) and as a link for phones' map apps.
const mapsQuery = (address: string) => encodeURIComponent(mapSearchText(address))
const mapsEmbed = (address: string) => `https://www.google.com/maps?q=${mapsQuery(address)}&output=embed`
const mapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${mapsQuery(address)}`

/** Small caps label over each block. */
const label = 'font-subtitle text-[11px] font-medium uppercase tracking-[0.18em] text-onyx/50'
const linkClass =
  'inline-flex items-center gap-1.5 font-subtitle text-sm text-onyx underline underline-offset-4 hover:no-underline'

function HoursRow({ days, hours, today, closed = false }: { days: string; hours: string; today: boolean; closed?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-onyx/10 py-4 font-subtitle text-base">
      <dt className={`flex items-center gap-2.5 ${today ? 'font-medium text-onyx' : 'text-onyx/60'}`}>
        {days}
        {today && (
          <span className="rounded-full bg-onyx px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            Hoje
          </span>
        )}
      </dt>
      <dd className={`shrink-0 tabular-nums ${closed ? 'text-onyx/40' : 'text-onyx'} ${today ? 'font-medium' : ''}`}>
        {hours}
      </dd>
    </div>
  )
}

/**
 * Address and opening hours, in black and white: the title and today's status on the left, the address and the
 * week's hours as plain lists between hairlines on the right (stacked on phones). Renders nothing until the
 * business has filled them in (site-config).
 */
export default function Location() {
  const business = useBusinessInfo()
  const { todayRows, closedDays, todayClosed, status } = useOpeningStatus(business.openingHours)
  const [copied, setCopied] = useState(false)
  // The right-hand column shows either the address and hours, or the map.
  const [view, setView] = useState<'info' | 'map'>('info')
  const hasHours = business.openingHours.length > 0
  if (!business.address && !hasHours) return null

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(business.address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: the address is on screen to select by hand.
    }
  }

  return (
    <section id="localizacao" className="relative overflow-hidden bg-white px-5 py-24 sm:px-8 md:py-32">
      {/* AFROGLOW sliding across the middle, as on every other section from "Quem somos" down. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center">
        <VelocityRow direction={-1} />
      </div>
      <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="font-logo text-4xl text-onyx sm:text-5xl">Onde estamos</h2>
          <p className="mt-4 max-w-sm font-subtitle text-base font-light leading-relaxed text-onyx/60">
            A morada, o horário e tudo o que precisas para chegar até nós.
          </p>
          {status && (
            <p className="mt-8 inline-flex items-center gap-2.5 font-subtitle text-sm text-onyx">
              <span className="relative flex size-2">
                {status.open && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70 motion-reduce:animate-none" />
                )}
                <span className={`relative size-2 rounded-full ${status.open ? 'bg-emerald-500' : 'bg-onyx/30'}`} />
              </span>
              {status.text}
            </p>
          )}
        </div>

        {/* Address and hours, or the map: one replaces the other with a short cross-fade. */}
        <AnimatePresence mode="wait" initial={false}>
          {view === 'info' || !business.address ? (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="flex flex-col gap-14">
              {business.address && (
                <motion.div {...reveal(0)}>
                  <h3 className={label}>Morada</h3>
                  <address className="mt-4 border-t border-onyx/10 pt-5 font-logo text-2xl not-italic leading-snug text-onyx sm:text-3xl">
                    {business.address}
                  </address>
                  <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <button type="button" onClick={() => setView('map')} className={linkClass}>
                      Ver no mapa
                      <i className="bx bx-right-arrow-alt text-base" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={copyAddress} className={linkClass}>
                      <span aria-live="polite">{copied ? 'Morada copiada' : 'Copiar morada'}</span>
                    </button>
                    {business.phone && (
                      <a href={`tel:${business.phone.replace(/[^+\d]/g, '')}`} className={linkClass}>
                        {business.phone}
                      </a>
                    )}
                  </div>
                </motion.div>
              )}

              {hasHours && (
                <motion.div {...reveal(0.1)}>
                  <h3 className={label}>Horário</h3>
                  <dl className="mt-4 border-t border-onyx/10">
                    {business.openingHours.map((row, index) => (
                      <HoursRow key={row.days} days={row.days} hours={row.hours} today={todayRows.has(index)} />
                    ))}
                    {closedDays.length > 0 && (
                      <HoursRow days={dayList(closedDays)} hours="Fechado" today={todayClosed} closed />
                    )}
                  </dl>
                  <Link to="/agendar" className={`mt-6 ${linkClass}`}>
                    Marcar sessão
                    <i className="bx bx-right-arrow-alt text-base" aria-hidden="true" />
                  </Link>
                </motion.div>
              )}
            </div>
            </motion.div>
          ) : (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <button type="button" onClick={() => setView('info')} className={linkClass}>
                  <i className="bx bx-left-arrow-alt text-base" aria-hidden="true" />
                  Morada e horário
                </button>
                <a href={business.mapUrl || mapsLink(business.address)} target="_blank" rel="noreferrer" className={linkClass}>
                  Abrir na app de mapas
                  <i className="bx bx-right-arrow-alt text-base" aria-hidden="true" />
                </a>
              </div>
              <div className="mt-5 overflow-hidden rounded-2xl border border-onyx/10">
                <iframe
                  title={`Mapa: ${business.address}`}
                  src={mapsEmbed(business.address)}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  // Greyscale, to sit with the page's black and white.
                  className="block h-[380px] w-full grayscale sm:h-[460px]"
                />
              </div>
              <p className="mt-4 font-subtitle text-sm text-onyx/60">{business.address}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
