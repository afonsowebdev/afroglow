import { motion } from 'motion/react'

const STATS = [
  { value: '2020', label: 'Ano de fundação' },
  { value: '100%', label: 'Feito à mão' },
  { value: 'Portugal', label: 'Onde criamos' },
]

export default function About() {
  return (
    <section id="sobre" className="relative flex min-h-screen items-center overflow-hidden bg-white">
      <motion.span
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.94 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center whitespace-nowrap font-logo text-[20vw] leading-none tracking-tight text-onyx/5"
      >
        AFROGLOW
      </motion.span>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-5 pt-28 pb-36 text-center sm:px-8 sm:pt-32 sm:pb-44">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-onyx/10 bg-white/90 px-8 py-10 shadow-xl backdrop-blur-sm sm:px-12 sm:py-14"
        >
          <span className="font-subtitle text-xs uppercase tracking-[0.3em] text-gold-deep">
            AfroGlow · Desde 2020
          </span>

          <h2 className="mt-6 font-logo text-4xl text-onyx sm:text-6xl">Quem somos</h2>

          <p className="mt-8 max-w-xl font-subtitle text-base font-light leading-[1.7] text-muted-dark sm:text-lg">
            A AfroGlow nasceu da paixão por preservar e celebrar a arte das tranças afro. Cada
            penteado é feito à mão, com técnica apurada e respeito pela identidade de quem o usa —
            uma prática que atravessa gerações e continua viva em cada fio entrançado.
          </p>
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-onyx/10 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-onyx/10 px-5 sm:px-8">
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
              <p className="mt-1 font-subtitle text-xs uppercase tracking-wide text-muted-dark">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
