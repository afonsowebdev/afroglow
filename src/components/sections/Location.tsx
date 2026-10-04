import { MotionButton } from '@/components/ui/motion-button'
import { useBusinessInfo } from '@/lib/site-config'

/** Address and opening hours. Renders nothing until the business has filled them in (site-config). */
export default function Location() {
  const business = useBusinessInfo()
  const hasHours = business.openingHours.length > 0
  if (!business.address && !hasHours) return null

  return (
    <section id="localizacao" className="bg-white px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center font-logo text-4xl sm:text-5xl">Onde estamos</h2>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {business.address && (
            <div className="rounded-2xl border border-gold/20 bg-white p-7 shadow-sm shadow-black/5">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-deep/10 text-xl text-gold-ink">
                <i className="bx bx-map" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-logo text-xl text-onyx">Morada</h3>
              <p className="mt-2 font-subtitle text-base text-muted-dark">{business.address}</p>
              {business.phone && (
                <p className="mt-2 font-subtitle text-base text-muted-dark">
                  <a href={`tel:${business.phone.replace(/[^+\d]/g, '')}`} className="hover:text-gold-ink">
                    {business.phone}
                  </a>
                </p>
              )}
              {business.mapUrl && (
                <div className="mt-6">
                  <MotionButton
                    label="Abrir no mapa"
                    size="sm"
                    href={business.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                  />
                </div>
              )}
            </div>
          )}

          {hasHours && (
            <div className="rounded-2xl border border-gold/20 bg-white p-7 shadow-sm shadow-black/5">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-deep/10 text-xl text-gold-ink">
                <i className="bx bx-time-five" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-logo text-xl text-onyx">Horário</h3>
              <dl className="mt-3 divide-y divide-gold/15">
                {business.openingHours.map((row) => (
                  <div key={row.days} className="flex justify-between gap-4 py-2.5 font-subtitle text-base">
                    <dt className="text-muted-dark">{row.days}</dt>
                    <dd className="text-onyx">{row.hours}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
