import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { VelocityRow } from '@/components/ui/velocity-marquee'

const STEPS = [
  {
    title: 'Escolhe o modelo',
    text: 'Vê os modelos de tranças, a duração e o preço de cada um, e escolhe o teu.',
  },
  {
    title: 'Marca o dia e a hora',
    text: 'Seleciona um horário livre e envia o pedido com a tua conta. Demora poucos minutos.',
  },
  {
    title: 'Recebe a confirmação',
    text: 'Respondemos por email assim que virmos o pedido, e lembramos-te antes da sessão.',
  },
]

/**
 * How booking works, in black and white like the other sections: the title and a button to start on the left,
 * the three steps as numbered rows between hairlines on the right (stacked on phones). The numbers are real:
 * booking happens in this order.
 */
export default function HowItWorks() {
  return (
    <section id="como-funciona" className="relative overflow-hidden bg-white px-5 py-24 sm:px-8 md:py-32">
      {/* AFROGLOW sliding across the middle, as on every other section from "Quem somos" down. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center">
        <VelocityRow direction={-1} />
      </div>
      <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="font-logo text-4xl text-onyx sm:text-5xl">Como funciona</h2>
          <p className="mt-4 max-w-sm font-subtitle text-base font-light leading-relaxed text-onyx/60">
            Marcar a tua sessão é simples. Três passos e ficas despachada.
          </p>
          <Link
            to="/agendar"
            className="group mt-8 inline-flex h-11 items-center gap-1.5 rounded-full bg-onyx pe-4 ps-5 font-subtitle text-sm font-medium text-white transition-colors hover:bg-onyx/85"
          >
            Começar a marcação
            <i
              className="bx bx-right-arrow-alt text-base transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>

        <ol className="border-b border-onyx/10">
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-[3.5rem_1fr] gap-x-4 border-t border-onyx/10 py-8 sm:grid-cols-[5rem_1fr] sm:gap-x-6"
            >
              <span className="font-logo text-4xl leading-none text-onyx/25 sm:text-5xl" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-subtitle text-xl font-medium text-onyx">{step.title}</h3>
                <p className="mt-2 max-w-lg font-subtitle text-[15px] leading-relaxed text-onyx/60">{step.text}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
