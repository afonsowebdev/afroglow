import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { instagramDmUrl, siteConfig, useBusinessInfo, useWhatsapp, type BusinessInfo } from '@/lib/site-config'

type Category = 'marcacoes' | 'conta' | 'sessao'

interface Question {
  category: Category
  icon: string
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
      icon: 'bx bx-calendar-plus',
      q: 'Como faço uma marcação?',
      a: 'Em três passos: escolhe o modelo (com as fotos e o preço), depois um dia e hora livres, e confirma. Só pedimos que entres ou cries conta no último passo, e a tua escolha fica guardada.',
      action: { label: 'Marcar agora', to: '/agendar' },
    },
    {
      category: 'marcacoes',
      icon: 'bx bx-time-five',
      q: 'Quando é que a marcação fica confirmada?',
      a: 'O pedido fica por confirmar até o vermos. Assim que o aceitarmos (ou se não for possível), recebes a resposta por email e na app, e vês o estado em “As minhas marcações”.',
    },
    {
      category: 'marcacoes',
      icon: 'bx bx-revision',
      q: 'Posso reagendar ou cancelar?',
      a: `Sim, em “As minhas marcações”: escolhes outro horário livre ou cancelas, e o horário fica livre para outra pessoa.${
        business.cancellationPolicy ? ` ${business.cancellationPolicy}` : ''
      }`,
      action: { label: 'As minhas marcações', to: '/marcacoes' },
    },
    {
      category: 'marcacoes',
      icon: 'bx bx-bell',
      q: 'Vou receber algum lembrete?',
      a: 'Sim, enviamos-te um lembrete por email antes da sessão. No site podes também adicionar a marcação ao teu calendário.',
    },
    {
      category: 'conta',
      icon: 'bx bx-user-circle',
      q: 'Preciso de criar conta?',
      a: 'Sim, para enviar o pedido. A conta serve para acompanhares, reagendares ou cancelares as tuas marcações e deixares o teu testemunho. Confirmamos o teu email com um código de 6 dígitos.',
      action: { label: 'Criar conta', to: '/entrar' },
    },
    {
      category: 'conta',
      icon: 'bx bx-trash',
      q: 'Como apago a minha conta e os meus dados?',
      a: 'No site ou na app AFROGLOW, em “Definições” → “Eliminar a minha conta”. Também nos podes pedir por email. Mais detalhes na política de privacidade.',
      action: { label: 'Abrir Definições', to: '/definicoes' },
    },
    {
      category: 'sessao',
      icon: 'bx bx-hourglass',
      q: 'Quanto tempo demora uma sessão?',
      a: 'Depende do modelo. A duração de cada um está indicada nos serviços e no resumo da marcação.',
      action: { label: 'Ver serviços', to: '/#servicos' },
    },
    {
      category: 'sessao',
      icon: 'bx bx-message-rounded-dots',
      q: 'Como posso falar convosco?',
      a: `Pelo Instagram @${siteConfig.instagramHandle}, pelo WhatsApp (quando disponível) ou pelo email ${siteConfig.email}. Os botões estão aqui ao lado.`,
    },
  ]
}

const actionClass =
  'mt-3 inline-flex items-center gap-1 font-subtitle text-sm font-medium text-onyx underline-offset-4 hover:underline'

/**
 * Questions grouped by subject, each answer with a shortcut to where it happens, and a card to reach us for
 * anything else. Side by side on wide screens, stacked on phones.
 */
export default function Faq() {
  const questions = buildQuestions(useBusinessInfo())
  const whatsapp = useWhatsapp()
  const [category, setCategory] = useState<Category | 'todas'>('todas')
  const [open, setOpen] = useState<string | null>(questions[0].q)
  const shown = category === 'todas' ? questions : questions.filter((item) => item.category === category)

  return (
    <section id="perguntas-frequentes" className="bg-cream px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Ajuda</p>
          <h2 className="mt-2 font-logo text-4xl sm:text-5xl">Perguntas frequentes</h2>
          <p className="mt-4 max-w-sm font-subtitle text-base font-light leading-relaxed text-muted-dark">
            Tudo o que precisas de saber antes de marcar a tua sessão.
          </p>

          {/* For anything not answered here. */}
          <div className="mt-8 max-w-sm rounded-[2rem] border-[1.5px] border-onyx/15 bg-white p-6">
            <p className="font-subtitle text-lg font-semibold tracking-tight text-onyx">Ainda tens dúvidas?</p>
            <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">Fala connosco, respondemos depressa.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {whatsapp.enabled && (
                <a
                  href={whatsapp.url('Olá! Tenho uma dúvida sobre as vossas tranças.')}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-full bg-onyx px-4 py-2.5 font-subtitle text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-85 dark:bg-gold-deep"
                >
                  <i className="bx bxl-whatsapp text-lg" aria-hidden="true" />
                  WhatsApp
                </a>
              )}
              <a
                href={instagramDmUrl()}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full border-[1.5px] border-onyx/20 px-4 py-2.5 font-subtitle text-sm font-medium text-onyx transition-colors hover:border-onyx/50"
              >
                <i className="bx bxl-instagram text-lg" aria-hidden="true" />
                Instagram
              </a>
              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-center gap-2 rounded-full border-[1.5px] border-onyx/20 px-4 py-2.5 font-subtitle text-sm font-medium text-onyx transition-colors hover:border-onyx/50"
              >
                <i className="bx bx-envelope text-lg" aria-hidden="true" />
                Email
              </a>
            </div>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Assunto">
            {CATEGORIES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={category === id}
                onClick={() => setCategory(id)}
                className={`rounded-full px-4 py-2 font-subtitle text-sm transition-colors ${
                  category === id
                    ? 'bg-onyx text-[#ffffff] dark:bg-gold-deep'
                    : 'border-[1.5px] border-onyx/15 bg-white text-onyx/70 hover:text-onyx'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <motion.ul layout className="mt-6 flex flex-col gap-3">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((item) => {
                const isOpen = open === item.q
                const id = `faq-${questions.indexOf(item)}`
                return (
                  <motion.li
                    key={item.q}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className={`overflow-hidden rounded-2xl border-[1.5px] bg-white transition-colors ${
                      isOpen ? 'border-onyx/30' : 'border-onyx/10'
                    }`}
                  >
                    <h3>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : item.q)}
                        aria-expanded={isOpen}
                        aria-controls={id}
                        className="flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-ink/10 text-xl text-gold-ink">
                          <i className={item.icon} aria-hidden="true" />
                        </span>
                        <span className="flex-1 font-subtitle text-base font-medium text-onyx">{item.q}</span>
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] text-lg transition-all duration-300 ${
                            isOpen ? 'rotate-45 border-onyx bg-onyx text-[#ffffff] dark:border-gold-deep dark:bg-gold-deep' : 'border-onyx/20 text-onyx'
                          }`}
                        >
                          <i className="bx bx-plus" aria-hidden="true" />
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
                          <div className="pb-5 pl-[4.75rem] pr-5 sm:pl-20 sm:pr-6">
                            <p className="font-subtitle text-[15px] leading-relaxed text-muted-dark">{item.a}</p>
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
