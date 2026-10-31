import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check } from 'lucide-react'
import { tap } from '@/lib/haptics'
import { useScrollLock } from '@/lib/use-scroll-lock'

/** Remembers on this device that the tour was seen, so it opens by itself only the first time. */
export const TOUR_KEY = 'afro-admin-tour-done'

export function tourSeen() {
  try {
    return localStorage.getItem(TOUR_KEY) === '1'
  } catch {
    return true
  }
}

type Step = {
  /** What to light up (a CSS selector); none for the welcome and the end, shown in the middle. */
  target?: string
  title: string
  text: string
}

const tab = (label: string) => `nav[aria-label="Secções do painel"] button[aria-label="${label}"]`

const STEPS: Step[] = [
  {
    title: 'Bem-vinda ao teu painel',
    text: 'Em um minuto mostro-te onde está tudo. Podes saltar quando quiseres e voltar a ver esta visita no +.',
  },
  {
    target: tab('Horários'),
    title: '1. Abre os teus horários',
    text: 'Começa aqui. Em Horários escolhes os dias e as horas em que atendes (Abrir semanas). As clientes só conseguem marcar nos horários abertos.',
  },
  {
    target: '[data-tour="bell"]',
    title: '2. Os pedidos chegam aqui',
    text: 'Quando uma cliente marca pela app, o pedido aparece no sino. Tocas nele para aceitar ou recusar; ela recebe logo a resposta.',
  },
  {
    target: tab('Agenda'),
    title: '3. A tua agenda',
    text: 'As marcações confirmadas, mês a mês, e o histórico de cada cliente. Daqui também cancelas uma sessão, se precisares.',
  },
  {
    target: '[data-tour="plus"]',
    title: '4. Tudo o resto está no +',
    text: 'Nova marcação, para quem marca por WhatsApp, Instagram ou ao balcão. E os modelos e preços, o portfólio, as promoções, os testemunhos e as definições.',
  },
  {
    target: tab('Clientes'),
    title: '5. As tuas clientes',
    text: 'Todas as clientes, com o contacto, as sessões e o que já gastaram. Daqui ligas, mandas mensagem ou marcas para elas.',
  },
  {
    target: tab('Início'),
    title: '6. O teu dia a dia',
    text: 'O Início mostra a faturação, as próximas marcações e as metas do mês. Em Opções escondes os valores ou organizas os cartões à tua maneira.',
  },
  {
    target: '[data-tour="account"]',
    title: '7. A tua conta',
    text: 'A tua foto, a palavra-passe, as notificações e o tema claro ou escuro.',
  },
  {
    title: 'Está tudo pronto',
    text: 'O primeiro passo é abrir as semanas em que vais atender. A partir daí, as marcações vão chegando ao sino.',
  },
]

const PAD = 6
const SPRING = { type: 'spring', stiffness: 260, damping: 30 } as const

/**
 * The first-time tour of the admin: the screen dims and a soft spotlight moves from one part to the next (the tab bar's
 * tabs, the bell, the "+", the account), each with a short card saying what it is for, Seguinte to go on and Saltar to
 * leave. It ends on the first thing to do, opening the week's times. Seen once, it is kept on the device; the "+" brings
 * it back.
 */
export function AdminTour({ open, onClose, onOpenSchedule }: { open: boolean; onClose: () => void; onOpenSchedule: () => void }) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })
  useScrollLock(open)

  // Only the steps whose part is on screen (a tab the person cannot use is left out).
  const steps = STEPS.filter((s) => !s.target || document.querySelector(s.target))
  const step = steps[Math.min(index, steps.length - 1)]
  const last = index >= steps.length - 1

  useEffect(() => {
    if (open) {
      setIndex(0)
      window.scrollTo({ top: 0 })
    }
  }, [open])

  const measure = useCallback(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight })
    const el = step?.target ? document.querySelector(step.target) : null
    setRect(el ? el.getBoundingClientRect() : null)
  }, [step?.target])

  useLayoutEffect(() => {
    if (!open) return
    measure()
    // The parts can still be moving (the tab bar coming in, the header settling): follow them each frame, updating only
    // when one has really moved.
    let frame = 0
    let last = ''
    const follow = () => {
      const el = step?.target ? document.querySelector(step.target) : null
      const r = el?.getBoundingClientRect()
      const key = r ? `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}` : ''
      if (key !== last) {
        last = key
        setRect(r ?? null)
      }
      frame = requestAnimationFrame(follow)
    }
    frame = requestAnimationFrame(follow)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
    }
  }, [open, measure, step?.target])

  const finish = (thenSchedule = false) => {
    try {
      localStorage.setItem(TOUR_KEY, '1')
    } catch {
      // only a convenience
    }
    onClose()
    if (thenSchedule) onOpenSchedule()
  }
  const next = () => {
    void tap()
    if (last) finish()
    else setIndex((i) => i + 1)
  }

  // The spotlight: the part's box with a little room, round like the part.
  const spot = rect
    ? {
        x: rect.left - PAD,
        y: rect.top - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
        radius: Math.min(rect.height + PAD * 2, rect.width + PAD * 2) / 2,
      }
    : { x: viewport.w / 2, y: viewport.h / 2, width: 0, height: 0, radius: 0 }

  // The card: under the part when it is in the top half, above it otherwise; in the middle with no part.
  const cardWidth = Math.min(340, viewport.w - 32)
  const below = rect ? rect.top + rect.height / 2 < viewport.h / 2 : false
  const cardLeft = rect ? Math.min(Math.max(16, rect.left + rect.width / 2 - cardWidth / 2), viewport.w - cardWidth - 16) : (viewport.w - cardWidth) / 2
  const cardStyle = rect
    ? below
      ? { top: rect.bottom + PAD + 14, left: cardLeft, width: cardWidth }
      : { bottom: viewport.h - rect.top + PAD + 14, left: cardLeft, width: cardWidth }
    : { top: '50%', left: cardLeft, width: cardWidth, translate: '0 -50%' }

  return createPortal(
    <AnimatePresence>
      {open && step && (
        <motion.div
          key="tour"
          className="app-neutral afro-admin fixed inset-0 z-[120]"
          role="dialog"
          aria-modal="true"
          aria-label="Visita guiada"
          data-no-pull
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* The dim, with the spotlight cut out of it (a ring of shadow around the box). */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0"
            initial={false}
            animate={{ x: spot.x, y: spot.y, width: spot.width, height: spot.height, borderRadius: spot.radius }}
            transition={SPRING}
            style={{
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.58), 0 0 0 2px rgba(255, 255, 255, 0.9), 0 0 24px 6px rgba(255, 255, 255, 0.35)',
            }}
          />
          {/* Taps on the page behind do nothing while the tour is open. */}
          <div className="absolute inset-0" />

          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              className="absolute rounded-[24px] bg-card p-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)]"
              style={cardStyle}
              initial={{ opacity: 0, y: below || !rect ? 8 : -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', visualDuration: 0.35, bounce: 0.15 }}
            >
              <div className="mb-3 flex gap-1" aria-hidden="true">
                {steps.map((s, i) => (
                  <span
                    key={s.title}
                    className={`h-1 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-onyx/70' : 'w-1.5 bg-onyx/15'}`}
                  />
                ))}
              </div>
              <h2 className="font-subtitle text-[18px] font-semibold tracking-tight text-onyx">{step.title}</h2>
              <p className="mt-1.5 font-subtitle text-[14px] leading-relaxed text-muted-dark">{step.text}</p>
              <div className="mt-4 flex items-center gap-2">
                {last ? (
                  <button type="button" onClick={() => finish()} className="h-11 px-3 font-subtitle text-[14px] font-medium text-muted-dark">
                    Fechar
                  </button>
                ) : (
                  <button type="button" onClick={() => finish()} className="h-11 px-3 font-subtitle text-[14px] font-medium text-muted-dark">
                    Saltar
                  </button>
                )}
                <button
                  type="button"
                  onClick={last ? () => finish(true) : next}
                  className="ms-auto flex h-11 items-center gap-2 rounded-full bg-card pe-1.5 ps-4 font-subtitle text-[14px] font-semibold text-onyx shadow-[var(--card-shadow)] ring-1 ring-onyx/[0.06]"
                >
                  {last ? 'Abrir Horários' : index === 0 ? 'Começar' : 'Seguinte'}
                  <span
                    className="flex size-8 items-center justify-center rounded-full"
                    style={last ? { background: 'var(--c-confirmed)', color: '#fff' } : { background: 'color-mix(in srgb, var(--color-onyx) 5%, transparent)' }}
                  >
                    {last ? <Check size={16} strokeWidth={2.6} /> : <ArrowRight size={16} />}
                  </span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
