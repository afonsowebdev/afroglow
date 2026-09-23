import { TestimonialsEditorial, type Testimonial } from '@/components/ui/editorial-testimonial'

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    quote:
      'Fui pela primeira vez e voltei encantada. As tranças ficaram impecáveis e duraram muito mais do que esperava.',
    name: 'Beatriz Almeida',
    service: 'Box Braids',
  },
  {
    id: 2,
    quote:
      'Atendimento incrível do início ao fim. Sinto que finalmente encontrei um sítio de confiança para cuidar do meu cabelo.',
    name: 'Carolina Ferreira',
    service: 'Knotless Braids',
  },
  {
    id: 3,
    quote: 'O cuidado com o detalhe é impressionante. Recomendo a todas as amigas que procuram tranças bem feitas.',
    name: 'Inês Rodrigues',
    service: 'Fulani Braids',
  },
  {
    id: 4,
    quote: 'Profissionalismo e simpatia em cada sessão. Já não marco tranças em mais lado nenhum.',
    name: 'Marta Sousa',
    service: 'Goddess Braids',
  },
]

export default function Testimonials() {
  return (
    <section id="testemunhos" className="bg-white px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-logo text-4xl sm:text-5xl">O que dizem as nossas clientes</h2>

        <div className="mt-20 sm:mt-24">
          <TestimonialsEditorial testimonials={TESTIMONIALS} />
        </div>
      </div>
    </section>
  )
}
