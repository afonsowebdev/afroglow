import { motion } from 'motion/react'
import { Link } from 'react-router-dom'

const STATS = [
  { value: '2020', label: 'Ano de fundação' },
  { value: '100%', label: 'Feito à mão' },
  { value: 'Portugal', label: 'Onde criamos' },
]

const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
})

/**
 * Who we are, in black and white like the other sections: the title on the left; the story, the link to the CEO
 * and the three facts between hairlines on the right, beside a photo of the work (stacked on phones).
 */
export default function About() {
  return (
    <section id="sobre" className="bg-white px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <motion.div {...reveal(0)} className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="font-logo text-4xl text-onyx sm:text-5xl">Quem somos</h2>
          <p className="mt-4 font-subtitle text-sm text-onyx/50">AFROGLOW · desde 2020</p>
          <div className="mt-10 hidden overflow-hidden rounded-2xl bg-onyx/5 lg:block">
            <img src="/images/hero/hero-4.jpg" alt="Tranças feitas na AFROGLOW" loading="lazy" className="aspect-[4/5] w-full object-cover" />
          </div>
        </motion.div>

        <div>
          <motion.p
            {...reveal(0.1)}
            className="font-subtitle text-2xl font-light leading-snug text-onyx sm:text-3xl"
          >
            A AFROGLOW nasceu da paixão por preservar e celebrar a arte das tranças afro.
          </motion.p>
          <motion.p
            {...reveal(0.15)}
            className="mt-6 max-w-2xl font-subtitle text-base leading-relaxed text-onyx/60 sm:text-lg"
          >
            Cada penteado é feito à mão, com técnica apurada e respeito pela identidade de quem o usa. É uma prática
            que atravessa gerações e continua viva em cada fio entrançado.
          </motion.p>

          <motion.div {...reveal(0.2)}>
            <Link
              to="/ceo"
              className="group mt-8 inline-flex h-11 items-center gap-1.5 rounded-full border border-onyx pe-4 ps-5 font-subtitle text-sm font-medium text-onyx transition-colors hover:bg-onyx hover:text-white"
            >
              Conhecer a nossa CEO
              <i
                className="bx bx-right-arrow-alt text-base transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </motion.div>

          {/* The three facts, in a row between hairlines. */}
          <dl className="mt-14 grid grid-cols-3 border-y border-onyx/10">
            {STATS.map((stat, index) => (
              <motion.div
                key={stat.label}
                {...reveal(0.25 + index * 0.08)}
                className={`flex flex-col-reverse justify-end py-6 ${index > 0 ? 'border-l border-onyx/10 pl-3 sm:pl-8' : ''}`}
              >
                <dt className="mt-2 font-subtitle text-[11px] font-medium uppercase tracking-[0.16em] text-onyx/50">
                  {stat.label}
                </dt>
                <dd className="font-logo text-xl leading-none text-onyx sm:text-4xl">{stat.value}</dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
