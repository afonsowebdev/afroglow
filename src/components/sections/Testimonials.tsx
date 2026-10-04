import { useEffect, useState } from 'react'
import { TestimonialsEditorial, type Testimonial } from '@/components/ui/editorial-testimonial'
import { api } from '@/lib/api'
import { instagramDmUrl } from '@/lib/site-config'
import type { Testimonial as ApiTestimonial } from '@/lib/types'

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    api
      .get<ApiTestimonial[]>('/testimonials')
      .then((data) =>
        setTestimonials(data.map((t) => ({ id: t.id, quote: t.content, name: t.customer.name }))),
      )
      .catch(() => setLoadFailed(true))
  }, [])

  return (
    <section id="testemunhos" className="flex min-h-screen items-center bg-white px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="text-center font-logo text-4xl sm:text-5xl">O que dizem as nossas clientes</h2>

        <div className="mt-20 sm:mt-24">
          {loadFailed ? (
            <p className="text-center font-body text-sm text-muted-dark">
              Não foi possível carregar os testemunhos agora. Vê mais no nosso{' '}
              <a href={instagramDmUrl()} target="_blank" rel="noreferrer" className="text-gold-ink underline">
                Instagram
              </a>
              .
            </p>
          ) : testimonials.length === 0 ? null : (
            <TestimonialsEditorial testimonials={testimonials} />
          )}
        </div>
      </div>
    </section>
  )
}
