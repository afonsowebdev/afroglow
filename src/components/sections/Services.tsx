import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { MotionButton } from '@/components/ui/motion-button'
import { instagramDmUrl } from '@/lib/site-config'
import { formatPrice, type Service } from '@/lib/types'

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    api
      .get<Service[]>('/services')
      .then(setServices)
      .catch(() => setLoadFailed(true))
  }, [])

  return (
    <section id="servicos" className="bg-white px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-subtitle text-xs uppercase tracking-[0.3em] text-gold-deep">O nosso menu</span>
          <h2 className="mt-4 font-logo text-4xl sm:text-5xl">Os nossos serviços</h2>
        </div>

        {loadFailed ? (
          <p className="mt-16 text-center font-body text-sm text-muted-dark">
            Não foi possível carregar os serviços agora. Contacta-nos diretamente pelo{' '}
            <a href={instagramDmUrl()} target="_blank" rel="noreferrer" className="text-gold-deep underline">
              Instagram
            </a>
            .
          </p>
        ) : (
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="group flex flex-col rounded-2xl border border-onyx/10 bg-cream/40 p-8 transition-colors duration-300 hover:border-gold/40"
              >
                <span className="font-logo text-sm text-onyx/30">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="mt-4 font-subtitle text-2xl text-onyx">{service.name}</h3>
                <p className="mt-2 font-logo text-xs uppercase tracking-wide text-muted-dark">
                  {service.durationLabel}
                </p>
                <p className="mt-4 flex-1 font-subtitle text-sm font-light leading-relaxed text-muted-dark">
                  {service.description}
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-onyx/10 pt-6">
                  <span className="font-logo text-2xl text-gold-deep">{formatPrice(service.priceCents)}</span>
                  <MotionButton label="Agendar" size="sm" href={`/agendar?service=${service.id}`} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
