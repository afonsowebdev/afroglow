import { motion } from 'motion/react'

const STEPS = [
  {
    icon: 'bx bx-list-check',
    title: 'Escolhe o modelo',
    text: 'Vê os modelos de tranças, a duração e o preço de cada um, e escolhe o teu.',
  },
  {
    icon: 'bx bx-calendar-plus',
    title: 'Marca o dia e a hora',
    text: 'Seleciona um horário livre e envia o pedido com a tua conta. Demora poucos minutos.',
  },
  {
    icon: 'bx bx-envelope',
    title: 'Recebe a confirmação',
    text: 'Respondemos por email assim que vermos o pedido, e lembramos-te antes da sessão.',
  },
]

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-white px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-logo text-4xl sm:text-5xl">Como funciona</h2>
        <p className="mx-auto mt-4 max-w-xl text-center font-subtitle text-base font-light text-muted-dark">
          Marcar a tua sessão é simples. Três passos e ficas despachada.
        </p>

        <ol className="mt-16 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl border border-gold/20 bg-white p-7 text-center shadow-sm shadow-black/5"
            >
              <span className="absolute -top-4 left-1/2 flex h-8 min-w-8 -translate-x-1/2 items-center justify-center rounded-full bg-gold-deep px-2 font-logo text-sm text-[#ffffff]">
                {index + 1}
              </span>
              <span className="mx-auto mt-2 flex h-14 w-14 items-center justify-center rounded-full bg-gold-deep/10 text-2xl text-gold-ink">
                <i className={step.icon} aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-logo text-xl text-onyx">{step.title}</h3>
              <p className="mt-2 font-subtitle text-sm leading-relaxed text-muted-dark">{step.text}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
