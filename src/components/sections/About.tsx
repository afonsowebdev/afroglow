import { motion, useReducedMotion } from 'motion/react'

const STATS = [
  { value: '2020', label: 'Ano de fundação' },
  { value: '100%', label: 'Feito à mão' },
  { value: 'Portugal', label: 'Onde criamos' },
]

export default function About() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section id="sobre" className="relative overflow-hidden">
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.08 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="flex h-full w-full items-center justify-center bg-cocoa"
          whileHover={shouldReduceMotion ? undefined : { scale: 1.06 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          role="img"
          aria-label="Trabalho de tranças afro realizado pela AfroGlow"
        >
          <i className="bx bx-image text-6xl text-[#f5efdf]/20" aria-hidden="true" />
        </motion.div>
      </motion.div>

      {/*
       * Fixed dark-photo treatment: uses literal colors, not the onyx/cream
       * tokens — those invert between light/dark site themes, which would
       * flip this scrim from dark to light and the text from light to dark.
       * A photo background should look the same regardless of site theme.
       */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#1a1008]/80 via-[#1a1008]/50 to-[#1a1008]/30"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-24 sm:px-8 md:py-32">
        <div className="max-w-xl">
          <h2 className="font-logo text-4xl text-[#f5efdf] sm:text-5xl">Quem somos</h2>
          <p className="mt-8 font-subtitle text-base font-light leading-[1.7] text-[#f5efdf]/85 sm:text-lg">
            A AfroGlow nasceu da paixão por preservar e celebrar a arte das tranças afro. Cada
            penteado é feito à mão, com técnica apurada e respeito pela identidade de quem o usa.
            É uma prática que atravessa gerações e continua viva em cada fio entrançado.
          </p>
          <p className="mt-6 font-subtitle text-base font-light leading-[1.7] text-[#f5efdf]/85 sm:text-lg">
            Trabalhamos com atenção ao detalhe, higiene rigorosa e conforto durante todo o
            processo, para que cada sessão seja também um momento de cuidado.
          </p>
        </div>

        <div className="mt-14 grid max-w-xl grid-cols-3 gap-6 border-t border-[#f5efdf]/20 pt-8">
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
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
