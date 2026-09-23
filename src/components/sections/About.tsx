import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'

const STATS = [
  { value: '2020', label: 'Ano de fundação' },
  { value: '100%', label: 'Feito à mão' },
  { value: 'Portugal', label: 'Onde criamos' },
]

export default function About() {
  const shouldReduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })
  const photoY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? ['0%', '0%'] : ['-10%', '10%'])

  return (
    <section id="sobre" ref={sectionRef} className="relative flex min-h-screen items-center overflow-hidden">
      <motion.div className="absolute inset-0 scale-[1.2]" style={{ y: photoY }}>
        <div
          className="flex h-full w-full items-center justify-center bg-cocoa"
          role="img"
          aria-label="Trabalho de tranças afro realizado pela AfroGlow"
        >
          <i className="bx bx-image text-6xl text-[#f5efdf]/20" aria-hidden="true" />
        </div>
      </motion.div>

      {/*
       * Fixed dark-photo treatment: uses literal colors, not the onyx/cream
       * tokens — those invert between light/dark site themes, which would
       * flip this scrim from dark to light and the text from light to dark.
       * A photo background should look the same regardless of site theme.
       */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#1a1008]/75 via-[#1a1008]/35 to-[#1a1008]/85"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-5 pt-28 pb-36 text-center sm:px-8 sm:pt-32 sm:pb-44">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5 }}
          className="font-subtitle text-xs uppercase tracking-[0.3em] text-gold"
        >
          AfroGlow · Desde 2020
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 font-logo text-4xl text-[#f5efdf] sm:text-6xl"
        >
          Quem somos
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 max-w-xl font-subtitle text-base font-light leading-[1.7] text-[#f5efdf]/85 sm:text-lg"
        >
          A AfroGlow nasceu da paixão por preservar e celebrar a arte das tranças afro. Cada
          penteado é feito à mão, com técnica apurada e respeito pela identidade de quem o usa —
          uma prática que atravessa gerações e continua viva em cada fio entrançado.
        </motion.p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-[#f5efdf]/15 bg-[#1a1008]/40 backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-[#f5efdf]/15 px-5 sm:px-8">
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
              className="flex flex-col items-center justify-center py-6 text-center sm:py-8"
            >
              <p className="font-logo text-2xl text-gold sm:text-3xl">{stat.value}</p>
              <p className="mt-1 font-subtitle text-xs uppercase tracking-wide text-[#f5efdf]/70">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
