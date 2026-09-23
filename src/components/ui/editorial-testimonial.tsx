import { useState } from 'react'

export interface Testimonial {
  id: number
  quote: string
  name: string
  service: string
}

export function TestimonialsEditorial({ testimonials }: { testimonials: Testimonial[] }) {
  const [active, setActive] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleChange = (index: number) => {
    if (index === active || isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => {
      setActive(index)
      setTimeout(() => setIsTransitioning(false), 50)
    }, 300)
  }

  const handlePrev = () => {
    const newIndex = active === 0 ? testimonials.length - 1 : active - 1
    handleChange(newIndex)
  }

  const handleNext = () => {
    const newIndex = active === testimonials.length - 1 ? 0 : active + 1
    handleChange(newIndex)
  }

  const current = testimonials[active]

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-start gap-5 sm:gap-8">
        <span
          className="select-none font-logo text-7xl leading-none text-onyx/10 transition-all duration-500 sm:text-[120px]"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {String(active + 1).padStart(2, '0')}
        </span>

        <div className="flex-1 pt-2 sm:pt-6">
          <blockquote
            className={`font-display text-xl italic leading-relaxed tracking-tight text-onyx transition-all duration-300 sm:text-2xl md:text-3xl ${
              isTransitioning ? 'translate-x-4 opacity-0' : 'translate-x-0 opacity-100'
            }`}
          >
            {current.quote}
          </blockquote>

          <div
            className={`group mt-10 cursor-default transition-all delay-100 duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/30 bg-cream ring-2 ring-transparent transition-all duration-300 group-hover:ring-gold-deep/30">
                <i className="bx bx-user text-2xl text-onyx/25" aria-hidden="true" />
              </div>
              <div>
                <p className="font-subtitle font-medium text-onyx">{current.name}</p>
                <p className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">{current.service}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {testimonials.map((_, index) => (
              <button key={index} onClick={() => handleChange(index)} className="group relative py-4">
                <span
                  className={`block h-px transition-all duration-500 ease-out ${
                    index === active
                      ? 'w-12 bg-onyx'
                      : 'w-6 bg-onyx/20 group-hover:w-8 group-hover:bg-onyx/40'
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="font-subtitle text-xs uppercase tracking-widest text-muted-dark">
            {String(active + 1).padStart(2, '0')} / {String(testimonials.length).padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            aria-label="Testemunho anterior"
            className="rounded-full p-2 text-onyx/40 transition-all duration-300 hover:bg-onyx/5 hover:text-onyx"
          >
            <i className="bx bx-chevron-left text-xl" aria-hidden="true" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Testemunho seguinte"
            className="rounded-full p-2 text-onyx/40 transition-all duration-300 hover:bg-onyx/5 hover:text-onyx"
          >
            <i className="bx bx-chevron-right text-xl" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default TestimonialsEditorial
