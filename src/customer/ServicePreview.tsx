import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ActionButton } from '@/components/ui/action-button'
import { serviceImageUrls } from '@/lib/service-images'
import { formatPrice, type Service } from '@/lib/types'
import { Fact, Facts, labelClass } from './panel'

/**
 * Bottom sheet with all the photos of a hairstyle (swipe sideways), its details and a button to choose it, so
 * the customer decides after seeing the work.
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

  return (
    <AnimatePresence>
      {service && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={service.name}
            className="relative flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white sm:max-h-[88vh] sm:rounded-3xl"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="glass-chip absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-xl text-onyx"
            >
              <i className="bx bx-x" aria-hidden="true" />
            </button>

            <div className="overflow-y-auto">
              {photos.length > 0 ? (
                <div className="relative">
                  <div
                    ref={strip}
                    onScroll={(e) => {
                      const el = e.currentTarget
                      setIndex(Math.round(el.scrollLeft / el.clientWidth))
                    }}
                    className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {photos.map((src, i) => (
                      <img
                        key={src}
                        src={src}
                        alt={`${service.name}, foto ${i + 1} de ${photos.length}`}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        className="aspect-[4/5] w-full shrink-0 snap-center object-cover"
                      />
                    ))}
                  </div>
                  {photos.length > 1 && (
                    <>
                      <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1 font-subtitle text-xs text-[#ffffff] backdrop-blur-md">
                        {index + 1} / {photos.length}
                      </span>
                      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
                        {photos.map((_, i) => (
                          <span
                            key={i}
                            className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-[#ffffff]' : 'w-1.5 bg-[#ffffff]/55'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center bg-onyx/5">
                  <span className="font-subtitle text-sm text-muted-dark">Ainda sem fotos deste modelo</span>
                </div>
              )}

              <div className="p-5">
                <p className={labelClass}>Modelo</p>
                <h2 className="mt-2 font-subtitle text-2xl font-semibold tracking-tight text-onyx">{service.name}</h2>
                {service.description && (
                  <p className="mt-2 font-subtitle text-sm font-light leading-relaxed text-muted-dark">
                    {service.description}
                  </p>
                )}
                <Facts columns="1fr 1fr">
                  <Fact label="Duração">{service.durationLabel}</Fact>
                  <Fact label="Preço">{formatPrice(service.priceCents)}</Fact>
                </Facts>
              </div>
            </div>

            <div className="border-t border-onyx/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="flex justify-center">
                <ActionButton
                  label={chosen ? 'Retirar escolha' : chooseLabel}
                  variant={chosen ? 'secondary' : 'primary'}
                  icon={chosen ? 'bx bx-x' : undefined}
                  onClick={onChoose}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
