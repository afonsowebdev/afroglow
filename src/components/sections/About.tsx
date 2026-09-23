import { motion } from 'motion/react'

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

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-24 text-center sm:px-8 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
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
    </section>
  )
}
