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
        <h2 className="text-center font-logo text-4xl sm:text-5xl">
          Os nossos serviços
        </h2>

        {loadFailed ? (
          <p className="mt-16 text-center font-body text-sm text-muted-dark">
            Não foi possível carregar os serviços agora. Contacta-nos diretamente pelo{' '}
            <a href={instagramDmUrl()} target="_blank" rel="noreferrer" className="text-gold-deep underline">
              Instagram
            </a>
            .
          </p>
        ) : (
          <div className="mt-16 grid gap-x-12 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div key={service.id} className="flex flex-col border-b border-gold/30 py-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-subtitle text-lg font-medium text-onyx">{service.name}</h3>
                  <span className="font-logo whitespace-nowrap text-2xl text-gold-deep">
                    {formatPrice(service.priceCents)}
                  </span>
                </div>
                <p className="mt-2 font-body text-sm font-light text-muted-dark">{service.description}</p>
                <p className="mt-3 font-logo text-sm tracking-wide text-muted-dark">
                  {service.durationLabel}
                </p>
                <div className="mt-5">
                  <MotionButton label="Agendar" size="sm" href={`/agendar?service=${service.id}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
