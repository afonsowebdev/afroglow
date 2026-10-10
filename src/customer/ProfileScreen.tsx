import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ActionButton } from '@/components/ui/action-button'
import { Sheet } from '@/components/ui/sheet'
import { useCustomerAuth } from '@/lib/customer-auth'
import { tap } from '@/lib/haptics'
import { formatPrice } from '@/lib/types'
import { bookPath } from '@/lib/app-mode'
import { TestimonialForm } from './TestimonialForm'
import { dayParts, longDay, timeLabel } from './dates'
import { Fact, Facts, labelClass, panelClass, StatusDot } from './panel'
import { useProfile } from './use-profile'

type TabId = 'resumo' | 'historico' | 'testemunho'
const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'historico', label: 'Histórico' },
  { id: 'testemunho', label: 'Testemunho' },
]

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-[1.5px] border-onyx/25 bg-white px-2 pb-4 pt-4 text-center">
      <span className="flex size-9 items-center justify-center rounded-full bg-gold-ink/10 text-lg text-gold-ink">
        <i className={icon} aria-hidden="true" />
      </span>
      <p className="mt-3 font-subtitle text-xl font-semibold leading-none tracking-tight text-onyx">{value}</p>
      <p className="mt-1.5 font-subtitle text-[10px] uppercase tracking-[0.14em] text-muted-dark">{label}</p>
    </div>
  )
}

/** Who the customer is and what they have done with us. Account settings live on their own screen. */
export default function ProfileScreen() {
  const navigate = useNavigate()
  const { customer } = useCustomerAuth()
  const [testimonialOpen, setTestimonialOpen] = useState(false)
  // A link can open a given view directly, e.g. /conta?tab=testemunho from the website's testimonials.
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<TabId>(() => TABS.find((t) => t.id === searchParams.get('tab'))?.id ?? 'resumo')
  const [direction, setDirection] = useState(1)

  const goTo = (id: TabId) => {
    if (id === tab) return
    void tap()
    setDirection(TABS.findIndex((t) => t.id === id) > TABS.findIndex((t) => t.id === tab) ? 1 : -1)
    setTab(id)
  }
  const {
    bookings,
    upcoming,
    done,
    spent,
    sinceLabel,
    photo,
    photoBusy,
    photoError,
    photoInput,
    changePhoto,
    removePhoto,
  } = useProfile()

  if (!customer) return <div className="min-h-screen bg-white" />

  const initial = customer.name.trim().charAt(0).toUpperCase() || '?'
  const next = upcoming[0]
  const nextParts = next ? dayParts(next.slot.startsAt) : null

  return (
    <main className="pb-40">
      <header className="relative overflow-hidden bg-gradient-to-b from-cream via-white to-white px-6 pb-8 pt-[calc(1.25rem+env(safe-area-inset-top))] text-center">
        {/* The brand word behind the photo: centred on it, never larger than the screen, a soft gold that fades
            downward and breathes slowly. */}
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: [0.75, 1, 0.75], scale: 1 }}
          transition={{
            opacity: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 1.2, ease: 'easeOut' },
          }}
          className="pointer-events-none absolute left-1/2 top-[calc(9.75rem+env(safe-area-inset-top))] -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap bg-gradient-to-b from-gold/30 via-gold/15 to-transparent bg-clip-text font-logo text-[clamp(5.5rem,28vw,12rem)] leading-none tracking-[0.04em] text-transparent"
        >
          AFROGLOW
        </motion.span>

        <div className="relative flex items-center justify-between">
          <span className="font-subtitle text-[11px] uppercase tracking-[0.28em] text-muted-dark">O meu perfil</span>
          <button
            type="button"
            aria-label="Definições"
            onClick={() => {
              void tap()
              navigate('/definicoes')
            }}
            className="glass-chip flex h-10 w-10 items-center justify-center rounded-full text-xl text-onyx"
          >
            <i className="bx bx-cog" aria-hidden="true" />
          </button>
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="relative mx-auto mt-8 h-32 w-32"
        >
          <button
            type="button"
            aria-label="Alterar foto de perfil"
            disabled={photoBusy}
            onClick={() => {
              void tap()
              photoInput.current?.click()
            }}
            className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-cream to-white font-logo text-6xl text-gold-ink"
          >
            {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initial}
          </button>
          <span
            aria-hidden="true"
            className="glass-chip pointer-events-none absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full text-lg text-onyx"
          >
            <i className={photoBusy ? 'bx bx-loader-alt animate-spin' : 'bx bx-camera'} />
          </span>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void changePhoto(e.target.files?.[0])}
          />
        </motion.div>

        <h1 className="relative mt-6 truncate font-subtitle text-[26px] font-medium tracking-tight text-onyx">
          {customer.name}
        </h1>
        <p className="glass-chip relative mx-auto mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-subtitle text-xs text-muted-dark">
          <span className="size-1.5 rounded-full bg-gold-ink" aria-hidden="true" />
          {sinceLabel ? `Cliente desde ${sinceLabel}` : 'Cliente AFROGLOW'}
        </p>
        <div className="relative mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={photoBusy}
            onClick={() => photoInput.current?.click()}
            className="glass-chip flex items-center gap-1.5 rounded-full px-4 py-2 font-subtitle text-xs text-onyx"
          >
            <i className="bx bx-camera text-base" aria-hidden="true" />
            {photo ? 'Alterar foto' : 'Adicionar foto'}
          </button>
          {photo && (
            <button
              type="button"
              aria-label="Remover foto"
              disabled={photoBusy}
              onClick={() => void removePhoto()}
              className="glass-chip flex size-8 items-center justify-center rounded-full text-base text-onyx"
            >
              <i className="bx bx-trash" aria-hidden="true" />
            </button>
          )}
        </div>
        {photoError && <p className="relative mt-2 font-subtitle text-xs text-red-700">{photoError}</p>}
      </header>

      <div className="mx-auto max-w-2xl px-5">
        <div className="grid grid-cols-3 gap-3">
          <Stat icon="bx bx-check-circle" value={bookings ? String(done.length) : '–'} label="Sessões" />
          <Stat icon="bx bx-calendar" value={nextParts ? `${nextParts.day} ${nextParts.month}` : '–'} label="Próxima" />
          <Stat
            icon="bx bx-wallet"
            value={bookings ? formatPrice(spent).replace(/,00/, '') : '–'}
            label="Investido"
          />
        </div>

        {/* Stays at the top while the page scrolls, so the three views are always one tap away. */}
        <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-5 mt-4 bg-white/75 px-5 py-3 backdrop-blur-xl">
          <div className="flex gap-2" role="tablist">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => goTo(id)}
                className="glass-chip relative flex-1 rounded-full py-2.5 font-subtitle text-sm"
              >
                {tab === id && (
                  <motion.span
                    layoutId="profile-tab"
                    className="glass-chip-on absolute inset-0 rounded-full"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className={`relative ${tab === id ? 'font-medium text-onyx' : 'text-muted-dark'}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={tab}
            custom={direction}
            initial={{ opacity: 0, x: direction * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -28 }}
            transition={{ duration: 0.2 }}
            // Swipe sideways to move to the next or previous view.
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              const at = TABS.findIndex((t) => t.id === tab)
              if (info.offset.x < -70 && at < TABS.length - 1) goTo(TABS[at + 1].id)
              else if (info.offset.x > 70 && at > 0) goTo(TABS[at - 1].id)
            }}
            className="min-h-[50vh]"
          >
            {tab === 'resumo' && (
              <>
                <section className="mt-8">
                  <h2 className={`${labelClass} mb-3 px-1`}>Próxima sessão</h2>
                  {next ? (
                    <button
                      type="button"
                      onClick={() => navigate('/marcacoes')}
                      className={`${panelClass} block w-full text-left`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-subtitle text-xl font-semibold tracking-tight text-onyx">
                          {next.service.name}
                        </p>
                        <StatusDot status={next.status} />
                      </div>
                      <Facts columns="2fr 1fr">
                        <Fact label="Data">{longDay(next.slot.startsAt)}</Fact>
                        <Fact label="Hora">{timeLabel(next.slot.startsAt)}</Fact>
                      </Facts>
                    </button>
                  ) : (
                    <div className={panelClass}>
                      <p className="font-subtitle text-base text-onyx">Sem sessões marcadas.</p>
                      <ActionButton label="Marcar sessão" className="mt-4" onClick={() => navigate(bookPath)} />
                    </div>
                  )}
                </section>
              </>
            )}
            {tab === 'historico' && (
              <>
                <section className="mt-8">
                  <h2 className={`${labelClass} mb-3 px-1`}>Histórico</h2>
                  {done.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-onyx/20 px-5 py-6 text-center font-subtitle text-sm text-muted-dark">
                      As tuas sessões concluídas aparecem aqui.
                    </p>
                  ) : (
                    <ol className="relative ml-2 border-l border-onyx/15">
                      {done.map((b) => {
                        const parts = dayParts(b.slot.startsAt)
                        return (
                          <li key={b.id} className="relative pb-6 pl-6 last:pb-0">
                            <span
                              className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-onyx"
                              aria-hidden="true"
                            />
                            <p className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                              {parts.day} {parts.month}
                            </p>
                            <p className="mt-0.5 font-subtitle text-base font-semibold text-onyx">{b.service.name}</p>
                            <button
                              type="button"
                              onClick={() => {
                                void tap()
                                navigate(`${bookPath}?service=${b.serviceId}`)
                              }}
                              className="mt-1 font-subtitle text-xs text-muted-dark underline underline-offset-4"
                            >
                              Marcar de novo
                            </button>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </section>
              </>
            )}
            {tab === 'testemunho' && (
              <>
                <section className={`${panelClass} mt-8`}>
                  <p className={labelClass}>Testemunho</p>
                  <p className="mt-2 font-subtitle text-xl font-semibold tracking-tight text-onyx">Conta como foi</p>
                  <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">
                    Depois de aprovado, aparece na página principal com o teu nome.
                  </p>
                  <ActionButton label="Escrever testemunho" className="mt-4" onClick={() => setTestimonialOpen(true)} />
                </section>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Sheet
        open={testimonialOpen}
        icon="bx bx-message-rounded-dots"
        title="O teu testemunho"
        description="Depois de aprovado, aparece na página principal com o teu nome."
        hideSubmit
        submitLabel=""
        onSubmit={() => {}}
        onClose={() => setTestimonialOpen(false)}
      >
        <TestimonialForm />
      </Sheet>
    </main>
  )
}
