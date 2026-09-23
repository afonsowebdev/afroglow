import { motion, useReducedMotion } from 'motion/react'

const STATS = [
  { value: '2020', label: 'Ano de fundação' },
  { value: '100%', label: 'Feito à mão' },
  { value: 'Portugal', label: 'Onde criamos' },
]

export default function About() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section id="sobre" className="bg-cream">
      <div className="grid md:grid-cols-2">
        <motion.div
          className="relative h-[360px] overflow-hidden sm:h-[460px] md:h-auto md:min-h-[640px]"
          initial={{ opacity: 0, scale: 1.08 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="flex h-full w-full items-center justify-center bg-muted/30"
            whileHover={shouldReduceMotion ? undefined : { scale: 1.06 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            role="img"
            aria-label="Trabalho de tranças afro realizado pela AfroGlow"
          >
            <i className="bx bx-image text-5xl text-onyx/25" aria-hidden="true" />
          </motion.div>
        </motion.div>

        <div className="flex flex-col justify-center px-5 py-16 sm:px-8 md:justify-between md:px-16 md:py-20 lg:px-20">
          <div className="max-w-lg">
            <h2 className="font-logo text-4xl sm:text-5xl">Quem somos</h2>
            <p className="mt-8 font-subtitle text-base font-light leading-[1.7] text-onyx/80 sm:text-lg">
              A AfroGlow nasceu da paixão por preservar e celebrar a arte das tranças afro. Cada
              penteado é feito à mão, com técnica apurada e respeito pela identidade de quem o usa.
              É uma prática que atravessa gerações e continua viva em cada fio entrançado.
            </p>
            <p className="mt-6 font-subtitle text-base font-light leading-[1.7] text-onyx/80 sm:text-lg">
              Trabalhamos com atenção ao detalhe, higiene rigorosa e conforto durante todo o
              processo, para que cada sessão seja também um momento de cuidado.
            </p>
          </div>

          <div className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-gold/20 pt-8 md:mt-0">
            {STATS.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
              >
                <p className="font-logo text-2xl text-gold-deep sm:text-3xl">{stat.value}</p>
                <p className="mt-1 font-subtitle text-xs uppercase tracking-wide text-muted-dark">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
