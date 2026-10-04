import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { siteConfig, useBusinessInfo, hasWhatsappNumber, type BusinessInfo } from '@/lib/site-config'

interface Question {
  q: string
  a: string
}

// Only things the system really does. Business-specific rules (prices, cancellation window…)
// come from siteConfig so the client can fill them in without touching this file.
export function buildQuestions(business: BusinessInfo): Question[] {
  const contact = [
    `Instagram @${siteConfig.instagramHandle}`,
    hasWhatsappNumber(business.whatsappNumber) ? 'WhatsApp' : null,
    `email ${siteConfig.email}`,
  ]
    .filter(Boolean)
    .join(', ')

  return [
    {
      q: 'Como faço uma marcação?',
      a: 'Carrega em “Agendar”, escolhe o modelo e um horário livre, e envia o pedido. Precisas de ter conta para o fazer.',
    },
    {
      q: 'Preciso de criar conta?',
      a: 'Sim. A conta serve para acompanhares, reagendares ou cancelares as tuas marcações. Confirmamos o teu email com um código de 6 dígitos.',
    },
    {
      q: 'Quando é que a marcação fica confirmada?',
      a: 'O pedido fica pendente até o vermos. Assim que o aceitarmos (ou se não for possível), recebes um email com a resposta.',
    },
    {
      q: 'Quanto tempo demora uma sessão?',
      a: 'Depende do modelo. A duração de cada um está indicada na secção de serviços e na altura da marcação.',
    },
    {
      q: 'Posso reagendar ou cancelar?',
      a: `Sim, na tua conta, em “As minhas marcações”.${business.cancellationPolicy ? ` ${business.cancellationPolicy}` : ''}`,
    },
    {
      q: 'Vou receber algum lembrete?',
      a: 'Sim, enviamos-te um email de lembrete antes da sessão.',
    },
    {
      q: 'Como apago a minha conta e os meus dados?',
      a: 'Na app AFROGLOW, no teu perfil, em “Eliminar conta”. Podes também pedir-nos por email. Mais detalhes na política de privacidade.',
    },
    {
      q: 'Como posso falar convosco?',
      a: `Por ${contact}.`,
    },
  ]
}

export default function Faq({ app = false }: { app?: boolean }) {
  const questions = buildQuestions(useBusinessInfo())
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="perguntas-frequentes" className={app ? 'bg-white px-5 pt-14' : 'bg-cream px-5 py-24 sm:px-8 md:py-32'}>
      <div className={app ? 'mx-auto max-w-2xl' : 'mx-auto max-w-3xl'}>
        <h2
          className={
            app
              ? 'font-subtitle text-2xl font-semibold tracking-tight text-onyx'
              : 'text-center font-logo text-4xl sm:text-5xl'
          }
        >
          Perguntas frequentes
        </h2>

        <div
          className={`${app ? 'mt-5' : 'mt-14'} divide-y divide-gold/20 overflow-hidden rounded-2xl border border-gold/20 bg-white`}
        >
          {questions.map((item, index) => {
            const isOpen = open === index
            return (
              <div key={item.q}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-${index}`}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-subtitle text-base text-onyx transition-colors hover:text-gold-ink sm:px-6"
                  >
                    {item.q}
                    <i
                      className={`bx bx-chevron-down shrink-0 text-2xl text-gold-ink transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-6 font-subtitle text-[15px] leading-relaxed text-muted-dark sm:px-6">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
