import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { MotionButton } from '@/components/ui/motion-button'
import { instagramDmUrl } from '@/lib/site-config'
import { formatPrice, type Service } from '@/lib/types'

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Service[]>('/services')
      .then((data) => {
        setServices(data)
        setActiveId(data[0]?.id ?? null)
      })
      .catch(() => setLoadFailed(true))
  }, [])

  const active = services.find((service) => service.id === activeId) ?? services[0]

  return (
    <section id="servicos" className="bg-white px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-logo text-4xl sm:text-5xl">Os nossos serviços</h2>

        {loadFailed ? (
          <p className="mt-16 text-center font-body text-sm text-muted-dark">
            Não foi possível carregar os serviços agora. Contacta-nos diretamente pelo{' '}
            <a href={instagramDmUrl()} target="_blank" rel="noreferrer" className="text-gold-deep underline">
              Instagram
            </a>
            .
          </p>
        ) : (
          <div className="mt-16 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div className="order-first lg:order-last lg:sticky lg:top-32 lg:self-start">
              <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-cream to-muted/30 sm:h-72">
                <AnimatePresence mode="wait">
                  {active && (
                    <motion.i
                      key={active.id}
                      className="bx bx-image text-4xl text-onyx/30"
                      aria-hidden="true"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait">
                {active && (
                  <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <p className="mt-6 font-logo text-sm tracking-wide text-muted-dark">{active.durationLabel}</p>
                    <p className="mt-3 font-subtitle text-base font-light leading-relaxed text-muted-dark">
                      {active.description}
                    </p>
                    <div className="mt-6">
                      <MotionButton label="Agendar" size="sm" href={`/agendar?service=${active.id}`} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ul>
              {services.map((service, index) => {
                const isActive = service.id === active?.id
                return (
                  <li key={service.id} className="relative border-b border-gold/20">
                    <button
                      type="button"
                      onMouseEnter={() => setActiveId(service.id)}
                      onFocus={() => setActiveId(service.id)}
                      onClick={() => setActiveId(service.id)}
                      className={`group flex w-full items-baseline justify-between gap-6 py-6 text-left transition-colors duration-300 ${
                        isActive ? 'text-onyx' : 'text-onyx/50 hover:text-onyx'
                      }`}
                    >
                      <span className="flex items-baseline gap-4">
                        <span
                          className={`font-logo text-sm transition-colors duration-300 ${
                            isActive ? 'text-gold-deep' : 'text-onyx/30 group-hover:text-gold-deep'
                          }`}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="font-subtitle text-xl sm:text-2xl">{service.name}</span>
                      </span>
                      <span className="font-logo whitespace-nowrap text-xl text-gold-deep sm:text-2xl">
                        {formatPrice(service.priceCents)}
                      </span>
                    </button>

                    {isActive && (
                      <motion.span
                        layoutId="service-indicator"
                        className="absolute inset-x-0 bottom-0 h-px bg-gold-deep"
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
