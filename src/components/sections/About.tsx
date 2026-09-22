import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'

export default function About() {
  const frameRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ['start end', 'end start'],
  })
  const parallaxY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [-30, 30])

  return (
    <section id="sobre" className="bg-cream px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-[60%_40%] md:gap-0">
        <div className="flex flex-col justify-center md:border-r md:border-gold/30 md:pr-14">
          <h2 className="font-logo text-4xl sm:text-5xl">Quem somos</h2>
          <p className="mt-8 max-w-[65ch] font-subtitle text-base font-light leading-[1.7] text-onyx/80 sm:text-lg">
            A AfroGlow nasceu da paixão por preservar e celebrar a arte das tranças afro. Cada
            penteado é feito à mão, com técnica apurada e respeito pela identidade de quem o usa.
            É uma prática que atravessa gerações e continua viva em cada fio entrançado.
          </p>
          <p className="mt-6 max-w-[65ch] font-subtitle text-base font-light leading-[1.7] text-onyx/80 sm:text-lg">
            Trabalhamos com atenção ao detalhe, higiene rigorosa e conforto durante todo o
            processo, para que cada sessão seja também um momento de cuidado.
          </p>
        </div>

        <div className="pb-8 md:pb-0 md:pl-14">
          <motion.div
            ref={frameRef}
            className="relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            <div
              className="absolute inset-0 translate-x-4 translate-y-4 rounded-sm border border-gold-deep/40"
              aria-hidden="true"
            />

            <motion.div
              className="group relative aspect-[4/5] overflow-hidden rounded-sm"
              variants={{
                hidden: { clipPath: 'inset(0% 0% 100% 0%)' },
                visible: { clipPath: 'inset(0% 0% 0% 0%)' },
              }}
              transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
            >
              <motion.div
                className="flex h-full w-full items-center justify-center bg-muted/30"
                style={{ y: parallaxY }}
                animate={{ scale: 1.18 }}
                whileHover={shouldReduceMotion ? undefined : { scale: 1.28 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                role="img"
                aria-label="Trabalho de tranças afro realizado pela AfroGlow"
              >
                <i className="bx bx-image text-4xl text-onyx/30" aria-hidden="true" />
              </motion.div>
              <div className="pointer-events-none absolute inset-0 bg-gold/0 transition-colors duration-300 group-hover:bg-gold/10" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute -bottom-2 left-5 flex items-center gap-3 rounded-2xl border border-gold/20 bg-white px-5 py-3 shadow-lg"
            >
              <span className="font-logo text-2xl text-gold-deep">2020</span>
              <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">A criar desde</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
