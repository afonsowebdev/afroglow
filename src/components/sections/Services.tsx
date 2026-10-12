import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ServicePreview } from '@/customer/ServicePreview'
import { api } from '@/lib/api'
import { serviceImageUrls } from '@/lib/service-images'
import { instagramDmUrl } from '@/lib/site-config'
import type { Service } from '@/lib/types'
import { servicePriceLabel } from '@/lib/pricing'

// Shown on a card while the hairstyle has no photo of its own yet.
const FALLBACK_PHOTOS = ['/images/hero/hero-1.jpg', '/images/hero/hero-2.jpg', '/images/hero/hero-3.jpg', '/images/hero/hero-4.jpg', '/images/hero/hero-5.jpg']

/**
 * The price catalogue, in black and white like the other sections: one card per hairstyle with its photo, then
 * the name, description, duration and price, and a link to book it. Clicking the photo opens all its pictures and
 * details. Three across on wide screens, two on tablets, a swipeable strip on phones.
 */
export default function Services() {
  const navigate = useNavigate()
  const [services, setServices] = useState<Service[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const preview = services?.find((s) => s.id === previewId) ?? null

  useEffect(() => {
    api
      .get<Service[]>('/services')
      .then(setServices)
      .catch(() => setLoadFailed(true))
  }, [])

  return (
    <section id="servicos" className="bg-white py-24 md:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-logo text-4xl text-onyx sm:text-5xl">Os nossos serviços</h2>
          <p className="mt-4 max-w-md font-subtitle text-base font-light leading-relaxed text-onyx/60">
            Escolhe o teu estilo. Toca na foto para ver mais imagens, ou marca diretamente.
          </p>
        </div>
        {services && services.length > 0 && (
          <p className="font-subtitle text-sm text-onyx/50">
            {services.length} {services.length === 1 ? 'serviço' : 'serviços'}
          </p>
        )}
      </div>

      {loadFailed ? (
        <p className="mx-auto mt-16 max-w-6xl px-5 font-subtitle text-sm text-onyx/60 sm:px-8">
          Não foi possível carregar os serviços agora. Contacta-nos diretamente pelo{' '}
          <a href={instagramDmUrl()} target="_blank" rel="noreferrer" className="text-onyx underline underline-offset-4">
            Instagram
          </a>
          .
        </p>
      ) : (
        <div className="mx-auto mt-12 flex max-w-6xl snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pb-2 sm:scroll-px-8 [scrollbar-width:none] sm:px-8 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-12 md:overflow-visible lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
          {services === null &&
            [0, 1, 2].map((i) => (
              <div key={i} className="w-[80%] shrink-0 md:w-auto">
                <div className="aspect-[4/5] animate-pulse rounded-2xl bg-onyx/5" />
                <div className="mt-4 h-5 w-2/3 animate-pulse rounded bg-onyx/5" />
              </div>
            ))}
          {services?.map((service, i) => {
            const photos = serviceImageUrls(service)
            return (
              <article key={service.id} className="flex w-[80%] max-w-sm shrink-0 snap-start flex-col md:w-auto md:max-w-none">
                {/* The photo opens the gallery with more pictures. */}
                <button
                  type="button"
                  aria-label={`Ver fotos de ${service.name}`}
                  onClick={() => setPreviewId(service.id)}
                  className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-onyx/5"
                >
                  <img
                    src={photos[0] ?? FALLBACK_PHOTOS[i % FALLBACK_PHOTOS.length]}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  {photos.length > 1 && (
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 font-subtitle text-[11px] text-[#ffffff] backdrop-blur-md">
                      <i className="bx bx-images text-sm" aria-hidden="true" />
                      {photos.length} fotos
                    </span>
                  )}
                </button>

                <div className="mt-5 flex flex-1 flex-col">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-subtitle text-xl font-medium text-onyx">{service.name}</h3>
                    <p className="shrink-0 font-subtitle text-lg tabular-nums text-onyx">{servicePriceLabel(service)}</p>
                  </div>
                  {service.description && (
                    <p className="mb-4 mt-1.5 line-clamp-2 font-subtitle text-sm font-light leading-relaxed text-onyx/60">
                      {service.description}
                    </p>
                  )}
                  {/* Pinned to the bottom, so the lines and links align across a row whatever the description length. */}
                  <div className="mt-auto flex items-center justify-between gap-4 border-t border-onyx/10 pt-4">
                    <span className="inline-flex items-center gap-1.5 font-subtitle text-sm text-onyx/55">
                      <i className="bx bx-time-five text-base" aria-hidden="true" />
                      {service.durationLabel}
                    </span>
                    {/* Straight to booking this model. */}
                    <Link
                      to={`/agendar?service=${service.id}`}
                      aria-label={`Marcar ${service.name}`}
                      className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-onyx pe-3 ps-4 font-subtitle text-sm font-medium text-white transition-colors hover:bg-onyx/85"
                    >
                      Marcar
                      <i
                        className="bx bx-right-arrow-alt text-base transition-transform duration-300 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <ServicePreview
        service={preview}
        chosen={false}
        chooseLabel="Marcar este modelo"
        onClose={() => setPreviewId(null)}
        onChoose={() => {
          const id = previewId
          setPreviewId(null)
          if (id) navigate(`/agendar?service=${id}`)
        }}
      />
    </section>
  )
}
