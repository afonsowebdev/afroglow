import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export interface Testimonial {
  id: number
  quote: string
  name: string
  service: string
}

export function TestimonialsSplit({ testimonials }: { testimonials: Testimonial[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)

  const active = testimonials[activeIndex]

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length)
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div
        className="group relative grid cursor-pointer grid-cols-1 items-center gap-10 sm:grid-cols-[1fr_auto] sm:gap-12"
        onClick={nextTestimonial}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="order-2 space-y-8 sm:order-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.service}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 font-subtitle text-xs uppercase tracking-[0.2em] text-muted-dark"
            >
              <span className="h-px w-8 bg-gold-deep/50" />
              {active.service}
            </motion.div>
          </AnimatePresence>

          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={active.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="font-display text-2xl italic leading-[1.4] tracking-tight text-onyx sm:text-3xl md:text-4xl"
              >
                "{active.quote}"
              </motion.blockquote>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="h-px w-10 bg-onyx/20" />
              <p className="font-subtitle text-sm font-medium text-onyx">{active.name}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative order-1 h-56 w-40 sm:order-2 sm:h-64 sm:w-48">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, filter: 'blur(20px)', scale: 1.05 }}
              animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
              exit={{ opacity: 0, filter: 'blur(20px)', scale: 0.95 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-gold/30 bg-cream">
                <i className="bx bx-user text-5xl text-onyx/25" aria-hidden="true" />
              </div>
            </motion.div>
          </AnimatePresence>

          <motion.div
            animate={{ opacity: isHovering ? 1 : 0, scale: isHovering ? 1 : 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute -bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-2 font-subtitle text-xs text-muted-dark sm:-bottom-12"
          >
            <span>Seguinte</span>
            <i className="bx bx-right-arrow-alt -rotate-45 text-sm" aria-hidden="true" />
          </motion.div>
        </div>

        <div className="order-3 flex items-center justify-center gap-3 sm:absolute sm:-bottom-16 sm:left-0 sm:justify-start">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                setActiveIndex(index)
              }}
              aria-label={`Ver testemunho ${index + 1}`}
              className="group/dot relative p-1"
            >
              <span
                className={`block h-2 w-2 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? 'scale-100 bg-onyx'
                    : 'scale-75 bg-onyx/30 hover:scale-100 hover:bg-onyx/50'
                }`}
              />
              {index === activeIndex && (
                <motion.span
                  layoutId="activeTestimonialDot"
                  className="absolute inset-0 rounded-full border border-gold-deep/50"
                  transition={{ duration: 0.3 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TestimonialsSplit
