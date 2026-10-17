import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { bookPath } from '@/lib/app-mode'
import { FavouriteButton, useFavourites } from '@/lib/favourites'
import { tap } from '@/lib/haptics'
import { servicePriceLabel } from '@/lib/pricing'
import { serviceImageUrls } from '@/lib/service-images'
import type { Service } from '@/lib/types'

/**
 * "As minhas favoritas": the hairstyles the customer hearted, as photo cards in a row (tap one to book it, the heart
 * to take it out); with none yet, how to add them.
 */
export function FavouritesRow({ labelClass }: { labelClass: string }) {
  const navigate = useNavigate()
  const { ids } = useFavourites()
  const [services, setServices] = useState<Service[] | null>(null)

  useEffect(() => {
    api
      .get<Service[]>('/services')
      .then(setServices)
      .catch(() => setServices([]))
  }, [])

  const favourites = (services ?? [])
    .filter((s) => ids.includes(s.id))
    .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))

  return (
    <section>
      <h2 className={labelClass}>As minhas favoritas</h2>
      {favourites.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-onyx/[0.04] p-4">
          <i className="bx bx-heart text-2xl text-onyx/40" aria-hidden="true" />
          <p className="font-subtitle text-sm text-onyx/60">
            Toca no coração de um modelo para o guardares aqui e o marcares de novo num instante.
          </p>
        </div>
      ) : (
        <div className="-mx-5 flex snap-x gap-3 overflow-x-auto scroll-px-5 px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {favourites.map((service) => {
            const photo = serviceImageUrls(service)[0]
            return (
              <div
                key={service.id}
                className="relative aspect-[3/4] w-36 shrink-0 snap-start overflow-hidden rounded-2xl bg-onyx/5"
              >
                <button
                  type="button"
                  onClick={() => {
                    void tap()
                    navigate(`${bookPath}?service=${service.id}`)
                  }}
                  className="absolute inset-0 text-left"
                  aria-label={`Marcar ${service.name}`}
                >
                  {photo && <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-10">
                    <span className="block truncate font-subtitle text-sm font-semibold text-[#ffffff]">
                      {service.name}
                    </span>
                    <span className="block font-subtitle text-[11px] text-[#ffffff]/75">
                      {servicePriceLabel(service)}
                    </span>
                  </span>
                </button>
                <FavouriteButton
                  serviceId={service.id}
                  name={service.name}
                  onMedia
                  className="absolute right-2 top-2 size-8 text-lg"
                />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
