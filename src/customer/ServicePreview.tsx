import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ActionButton } from '@/components/ui/action-button'
import { FavouriteButton } from '@/lib/favourites'
import { tap } from '@/lib/haptics'
import { serviceImageUrls } from '@/lib/service-images'
import { formatPrice, type Service } from '@/lib/types'
import { choiceLabel, combinations, priceKey } from '@/lib/pricing'

const group =
  'divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]'

/** A row of a grouped list: the label on the left, the value on the right. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-4 px-4 py-2.5 font-subtitle text-[15px]">
      <span className="text-onyx">{label}</span>
      <span className="text-right tabular-nums text-onyx/70">{value}</span>
    </div>
  )
}

/**
 * A hairstyle in full: its photos large at the top (swipe, tap either side, or the arrows; a bar per photo shows where
 * you are), then its name, description, duration and price, and the price of each option when it has a table, with a
 * button to choose it. Full screen on phones, a centred card on wide screens (the website).
 */
export function ServicePreview({
  service,
  chosen,
  chooseLabel = 'Escolher este modelo',
  onClose,
  onChoose,
}: {
  service: Service | null
  chosen: boolean
  /** Label of the main button when the model isn't chosen yet. */
  chooseLabel?: string
  onClose: () => void
  onChoose: () => void
}) {
  const strip = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const photos = service ? serviceImageUrls(service) : []
  const count = photos.length

  useEffect(() => {
    setIndex(0)
    strip.current?.scrollTo({ left: 0 })
  }, [service?.id])

  useEffect(() => {
    if (!service) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [service, onClose])

  const goTo = (to: number) => {
    const el = strip.current
    if (!el || to < 0 || to >= count) return
    void tap()
    el.scrollTo({ left: to * el.clientWidth, behavior: 'smooth' })
  }

  // The price of each option ("Curta", "Longa · Finas"…), cheapest first, when the hairstyle has a table.
  const options = service?.pricing
    ? combinations(service.pricing)
        .map(([length, parting]) => ({
          label: choiceLabel(length || null, parting || null) ?? '',
          cents: service.pricing!.prices[priceKey(length, parting)],
        }))
        .filter((o): o is { label: string; cents: number } => typeof o.cents === 'number' && Boolean(o.label))
    : []

  const roundOnPhoto =
    'flex size-10 items-center justify-center rounded-full bg-black/40 text-[1.6rem] text-[#ffffff] backdrop-blur-md transition-opacity disabled:opacity-30'

  return (
    <AnimatePresence>
      {service && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={service.name}
            className="relative flex h-[100svh] w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-3xl"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            {/* Close: always in the corner, even after scrolling down to the prices. */}
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className={`absolute right-4 top-[calc(1.5rem+env(safe-area-inset-top))] z-10 sm:top-6 ${roundOnPhoto}`}
            >
              <i className="bx bx-x" aria-hidden="true" />
            </button>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Photos */}
              <div className="relative h-[60svh] shrink-0 bg-onyx/5 sm:h-auto sm:aspect-[4/5]">
                {count > 0 ? (
                  <div
                    ref={strip}
                    onScroll={(e) => {
                      const el = e.currentTarget
                      setIndex(Math.round(el.scrollLeft / el.clientWidth))
                    }}
                    className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {photos.map((src, i) => (
                      <img
                        key={src}
                        src={src}
                        alt={`${service.name}, foto ${i + 1} de ${count}`}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        className="h-full w-full shrink-0 snap-center object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="font-subtitle text-sm text-muted-dark">Ainda sem fotos deste modelo</span>
                  </div>
                )}

                {/* The photo ends in a gentle wave into the details below, not a straight cut. */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 400 28"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-x-0 -bottom-px z-[1] h-7 w-full fill-white"
                >
                  <path d="M0 16 C70 2 130 2 200 14 S330 28 400 10 L400 28 L0 28 Z" />
                </svg>

                {/* A soft shade at the top so the bars and the close button read on any photo. */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />

                {count > 1 && (
                  <>
                    {/* Tap the left or right side of the photo to go back or forward. */}
                    <button
                      type="button"
                      aria-label="Foto anterior"
                      onClick={() => goTo(index - 1)}
                      className="absolute inset-y-0 left-0 w-1/4"
                    />
                    <button
                      type="button"
                      aria-label="Foto seguinte"
                      onClick={() => goTo(index + 1)}
                      className="absolute inset-y-0 right-0 w-1/4"
                    />
                    {/* One bar per photo, as in stories. */}
                    <div
                      className="pointer-events-none absolute inset-x-4 top-[calc(0.75rem+env(safe-area-inset-top))] flex gap-1 sm:top-3"
                      aria-label={`Foto ${index + 1} de ${count}`}
                    >
                      {photos.map((src, i) => (
                        <span
                          key={src}
                          className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                            i <= index ? 'bg-[#ffffff]' : 'bg-[#ffffff]/35'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="absolute bottom-10 right-4 z-[2] flex gap-2">
                      <button
                        type="button"
                        aria-label="Foto anterior"
                        disabled={index <= 0}
                        onClick={() => goTo(index - 1)}
                        className={roundOnPhoto}
                      >
                        <i className="bx bx-chevron-left" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Foto seguinte"
                        disabled={index >= count - 1}
                        onClick={() => goTo(index + 1)}
                        className={roundOnPhoto}
                      >
                        <i className="bx bx-chevron-right" aria-hidden="true" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Details */}
              <div className="px-5 pb-6 pt-2">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-subtitle text-[28px] font-semibold leading-tight tracking-tight text-onyx">
                    {service.name}
                  </h2>
                  <FavouriteButton serviceId={service.id} name={service.name} className="mt-1" />
                </div>
                {service.description && (
                  <p className="mt-2 font-subtitle text-[15px] font-light leading-relaxed text-onyx/70">
                    {service.description}
                  </p>
                )}

                {/* The key facts as three tiles. */}
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[
                    { icon: 'bx bx-time-five', label: 'Duração', value: service.durationLabel },
                    {
                      icon: 'bx bx-purchase-tag-alt',
                      label: service.pricing ? 'Desde' : 'Preço',
                      value: formatPrice(service.priceCents),
                    },
                    { icon: 'bx bx-images', label: 'Fotos', value: String(count) },
                  ].map((fact) => (
                    <div
                      key={fact.label}
                      className="rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))] px-3 py-3"
                    >
                      <i className={`${fact.icon} text-xl text-onyx/70`} aria-hidden="true" />
                      <p className="mt-2 font-subtitle text-[11px] uppercase tracking-[0.12em] text-muted-dark">
                        {fact.label}
                      </p>
                      <p className="mt-0.5 truncate font-subtitle text-[15px] font-semibold tabular-nums text-onyx">
                        {fact.value}
                      </p>
                    </div>
                  ))}
                </div>

                {options.length > 0 && (
                  <>
                    <p className="mb-2 mt-6 px-1 font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark">
                      Preço por comprimento
                    </p>
                    <div className={group}>
                      {options.map((o) => (
                        <Row key={o.label} label={o.label} value={formatPrice(o.cents)} />
                      ))}
                    </div>
                  </>
                )}

                <p className="mt-5 flex items-center gap-2 px-1 font-subtitle text-xs text-muted-dark">
                  <i className="bx bx-check-shield text-base" aria-hidden="true" />
                  Tudo incluído · pagas no dia, no salão
                </p>
              </div>
            </div>

            {/* The price on the left, the button on the right. */}
            <div className="flex items-center justify-between gap-4 border-t border-onyx/[0.08] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:pb-4">
              <div className="min-w-0">
                <p className="font-subtitle text-[11px] uppercase tracking-[0.12em] text-muted-dark">
                  {service.pricing ? 'A partir de' : 'Preço'}
                </p>
                <p className="font-subtitle text-xl font-semibold tabular-nums text-onyx">
                  {formatPrice(service.priceCents)}
                </p>
              </div>
              <ActionButton
                label={chosen ? 'Retirar' : chooseLabel === 'Escolher este modelo' ? 'Escolher' : chooseLabel}
                variant={chosen ? 'secondary' : 'primary'}
                icon={chosen ? 'bx bx-x' : undefined}
                onClick={onChoose}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
