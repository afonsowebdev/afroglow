import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { instagramDmUrl, siteConfig, useBusinessInfo, useWhatsapp, type BusinessInfo } from '@/lib/site-config'

type Category = 'marcacoes' | 'conta' | 'sessao'

interface Question {
  category: Category
  q: string
  a: string
  /** A shortcut to where the answer happens. */
  action?: { label: string; to: string }
}

const CATEGORIES: Array<{ id: Category | 'todas'; label: string }> = [
  { id: 'todas', label: 'Todas' },
  { id: 'marcacoes', label: 'Marcações' },
  { id: 'conta', label: 'Conta' },
  { id: 'sessao', label: 'Sessão' },
]

// Only things the system really does. Business-specific rules (cancellation window…) come from the admin
// app's settings, so they can change without touching this file.
function buildQuestions(business: BusinessInfo): Question[] {
  return [
    {
      category: 'marcacoes',
      q: 'Como faço uma marcação?',
      a: 'Em três passos: escolhe o modelo (com as fotos e o preço), depois um dia e hora livres, e confirma. Só pedimos que entres ou cries conta no último passo, e a tua escolha fica guardada.',
      action: { label: 'Marcar agora', to: '/agendar' },
    },
    {
      category: 'marcacoes',
      q: 'Quando é que a marcação fica confirmada?',
      a: 'O pedido fica por confirmar até o vermos. Assim que o aceitarmos (ou se não for possível), recebes a resposta por email e na app, e vês o estado em “As minhas marcações”.',
    },
    {
      category: 'marcacoes',
      q: 'Posso reagendar ou cancelar?',
      a: `Sim, em “As minhas marcações”: escolhes outro horário livre ou cancelas, e o horário fica livre para outra pessoa.${
        business.cancellationPolicy ? ` ${business.cancellationPolicy}` : ''
      }`,
      action: { label: 'As minhas marcações', to: '/marcacoes' },
    },
    {
      category: 'marcacoes',
      q: 'Vou receber algum lembrete?',
      a: 'Sim, enviamos-te um lembrete por email antes da sessão. No site podes também adicionar a marcação ao teu calendário.',
    },
    {
      category: 'conta',
      q: 'Preciso de criar conta?',
      a: 'Sim, para enviar o pedido. A conta serve para acompanhares, reagendares ou cancelares as tuas marcações e deixares o teu testemunho. Confirmamos o teu email com um código de 6 dígitos.',
      action: { label: 'Criar conta', to: '/entrar' },
    },
    {
      category: 'conta',
      q: 'Como apago a minha conta e os meus dados?',
      a: 'No site ou na app AFROGLOW, em “Definições” → “Eliminar a minha conta”. Também nos podes pedir por email. Mais detalhes na política de privacidade.',
      action: { label: 'Abrir Definições', to: '/definicoes' },
    },
    {
      category: 'sessao',
      q: 'Quanto tempo demora uma sessão?',
      a: 'Depende do modelo. A duração de cada um está indicada nos serviços e no resumo da marcação.',
      action: { label: 'Ver serviços', to: '/#servicos' },
    },
    {
      category: 'sessao',
      q: 'Como posso falar convosco?',
      a: `Pelo Instagram @${siteConfig.instagramHandle}, pelo WhatsApp (quando disponível) ou pelo email ${siteConfig.email}. Os contactos estão também aqui ao lado.`,
    },
  ]
}

const actionClass =
  'mt-4 inline-flex items-center gap-1 font-subtitle text-sm font-medium text-onyx underline underline-offset-4 hover:no-underline'

const contactClass = 'text-onyx underline underline-offset-4 hover:no-underline'

/**
 * Questions grouped by subject, in black and white: the title and a line to reach us on the left, the questions as
 * a list between hairlines on the right (stacked on phones). Each answer has a shortcut to where it happens.
 */
export default function Faq() {
  const questions = buildQuestions(useBusinessInfo())
  const whatsapp = useWhatsapp()
  const [category, setCategory] = useState<Category | 'todas'>('todas')
  const [open, setOpen] = useState<string | null>(questions[0].q)
  const shown = category === 'todas' ? questions : questions.filter((item) => item.category === category)

  return (
    <section id="perguntas-frequentes" className="flex min-h-[100svh] items-center bg-white px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="font-logo text-4xl text-onyx sm:text-5xl">Perguntas frequentes</h2>
          <p className="mt-4 max-w-sm font-subtitle text-base font-light leading-relaxed text-onyx/60">
            Tudo o que precisas de saber antes de marcar a tua sessão.
          </p>

          {/* For anything not answered here. */}
          <div className="mt-10 max-w-sm border-t border-onyx/10 pt-6">
            <p className="font-subtitle text-sm font-medium text-onyx">Ainda tens dúvidas?</p>
            <p className="mt-1 font-subtitle text-sm text-onyx/60">
              Fala connosco por{' '}
              {whatsapp.enabled && (
                <>
                  <a
                    href={whatsapp.url('Olá! Tenho uma dúvida sobre as vossas tranças.')}
                    target="_blank"
                    rel="noreferrer"
                    className={contactClass}
                  >
                    WhatsApp
                  </a>
                  ,{' '}
                </>
              )}
              <a href={instagramDmUrl()} target="_blank" rel="noreferrer" className={contactClass}>
                Instagram
              </a>{' '}
              ou{' '}
              <a href={`mailto:${siteConfig.email}`} className={contactClass}>
                email
              </a>
              . Respondemos depressa.
            </p>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-x-7 gap-y-2" role="tablist" aria-label="Assunto">
            {CATEGORIES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={category === id}
                onClick={() => setCategory(id)}
                className={`border-b-2 pb-1.5 font-subtitle text-sm transition-colors ${
                  category === id ? 'border-onyx font-medium text-onyx' : 'border-transparent text-onyx/50 hover:text-onyx'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <motion.ul layout className="mt-8 border-b border-onyx/10">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((item) => {
                const isOpen = open === item.q
                const id = `faq-${questions.indexOf(item)}`
                return (
                  <motion.li
                    key={item.q}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-onyx/10"
                  >
                    <h3>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : item.q)}
                        aria-expanded={isOpen}
                        aria-controls={id}
                        className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                      >
                        <span className="font-subtitle text-lg text-onyx">{item.q}</span>
                        {/* A plus that turns into a minus. */}
                        <span className="relative size-4 shrink-0" aria-hidden="true">
                          <span className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-onyx" />
                          <span
                            className={`absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-onyx transition-transform duration-300 ${
                              isOpen ? 'scale-y-0' : ''
                            }`}
                          />
                        </span>
                      </button>
                    </h3>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={id}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="max-w-2xl pb-7 pr-10">
                            <p className="font-subtitle text-[15px] leading-relaxed text-onyx/65">{item.a}</p>
                            {item.action &&
                              (item.action.to.startsWith('/#') ? (
                                // A section of this same page: a plain anchor scrolls to it.
                                <a href={item.action.to.slice(1)} className={actionClass}>
                                  {item.action.label}
                                  <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
                                </a>
                              ) : (
                                <Link to={item.action.to} className={actionClass}>
                                  {item.action.label}
                                  <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
                                </Link>
                              ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </motion.ul>
        </div>
      </div>
    </section>
  )
}
