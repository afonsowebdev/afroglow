import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ServicePreview } from '@/customer/ServicePreview'
import { api } from '@/lib/api'
import { serviceImageUrls } from '@/lib/service-images'
import { instagramDmUrl } from '@/lib/site-config'
import { formatPrice, type Service } from '@/lib/types'

// Shown on a card while the hairstyle has no photo of its own yet.
const FALLBACK_PHOTOS = ['/images/hero/hero-1.jpg', '/images/hero/hero-2.jpg', '/images/hero/hero-3.jpg', '/images/hero/hero-4.jpg', '/images/hero/hero-5.jpg']

/**
 * The price catalogue, in the same card language as the customer app: one photo card per hairstyle with its
 * duration, price and a button to book it. Clicking the photo opens all its pictures and details. Side by side
 * on wide screens, a swipeable strip on phones.
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
      <div className="mx-auto max-w-6xl px-5 text-center sm:px-8">
        <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Penteados</p>
        <h2 className="mt-2 font-logo text-4xl sm:text-5xl">Os nossos serviços</h2>
        <p className="mt-4 font-subtitle text-sm font-light text-muted-dark">
          Clica na foto para ver mais. Clica em Marcar para escolher o dia.
        </p>
      </div>

      {loadFailed ? (
        <p className="mx-auto mt-16 max-w-6xl px-5 text-center font-body text-sm text-muted-dark">
          Não foi possível carregar os serviços agora. Contacta-nos diretamente pelo{' '}
          <a href={instagramDmUrl()} target="_blank" rel="noreferrer" className="text-gold-ink underline">
            Instagram
          </a>
          .
        </p>
      ) : (
        <div className="mx-auto mt-12 flex max-w-6xl snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:px-8 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
          {services === null &&
            [0, 1, 2].map((i) => (
              <div key={i} className="h-[26rem] w-[85%] shrink-0 animate-pulse rounded-[2rem] bg-gold/10 md:w-auto" />
            ))}
          {services?.map((service, i) => {
            const photos = serviceImageUrls(service)
            return (
              <article
                key={service.id}
                className="relative h-[26rem] w-[85%] max-w-sm shrink-0 snap-center overflow-hidden rounded-[2rem] bg-[#1c1c1e] md:w-auto md:max-w-none"
              >
                {/* The photo opens the gallery with more pictures. */}
                <button
                  type="button"
                  aria-label={`Ver fotos de ${service.name}`}
                  onClick={() => setPreviewId(service.id)}
                  className="group absolute inset-0 block h-full w-full"
                >
                  <img
                    src={photos[0] ?? FALLBACK_PHOTOS[i % FALLBACK_PHOTOS.length]}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                </button>

                <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 font-subtitle text-[11px] text-[#ffffff] backdrop-blur-md">
                  <i className="bx bx-time-five text-sm" aria-hidden="true" />
                  {service.durationLabel}
                </span>
                {photos.length > 1 && (
                  <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1.5 font-subtitle text-[11px] text-[#ffffff] backdrop-blur-md">
                    <i className="bx bx-images text-sm" aria-hidden="true" />
                    {photos.length} fotos
                  </span>
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 text-left text-[#ffffff]">
                  <p className="truncate font-subtitle text-2xl font-semibold tracking-tight">{service.name}</p>
                  {service.description && (
                    <p className="mt-1 line-clamp-2 font-subtitle text-sm font-light text-[#ffffff]/80">
                      {service.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="font-subtitle text-xl font-semibold text-[#e0c36e]">
                      {formatPrice(service.priceCents)}
                    </p>
                    {/* The arrow goes straight to booking this model. */}
                    <Link
                      to={`/agendar?service=${service.id}`}
                      aria-label={`Marcar ${service.name}`}
                      className="pointer-events-auto flex h-11 items-center gap-2 rounded-full bg-[#ffffff]/25 pe-1.5 ps-4 font-subtitle text-sm font-medium text-[#ffffff] backdrop-blur-md transition-colors hover:bg-[#ffffff]/35"
                    >
                      Marcar
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffffff]/30 text-xl">
                        <i className="bx bx-right-arrow-alt" aria-hidden="true" />
                      </span>
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
