import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AccountAuthForm } from '@/components/ui/account-auth-form'
import { api, ApiError } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'
import { success, tap } from '@/lib/haptics'
import { useBusinessInfo, useWhatsapp } from '@/lib/site-config'
import { formatPrice, type AvailabilitySlot, type Service } from '@/lib/types'
import { longDay, timeLabel } from './dates'
import { useHideNav } from './nav-visibility'
import { SlotPicker } from './SlotPicker'

const STEPS = ['Modelo', 'Data', 'Confirmar'] as const

const fieldClass =
  'w-full rounded-2xl border border-gold/30 bg-white px-4 py-3.5 font-subtitle text-onyx outline-none focus-visible:border-gold-deep'

/** Bottom action button: slides up from the bottom edge only once there is something to continue with. */
function Cta({ label, busy, onClick }: { label: string; busy?: boolean; onClick: () => void }) {
  return (
    <motion.div
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 90, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 px-5"
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          void tap('medium')
          onClick()
        }}
        className="pointer-events-auto mx-auto block w-full max-w-md rounded-full bg-gold-deep py-4 font-subtitle text-base text-[#ffffff] shadow-lg shadow-black/20 transition-opacity disabled:opacity-60"
      >
        {busy ? 'A enviar...' : label}
      </button>
    </motion.div>
  )
}

export default function BookScreen() {
  const { customer, loading: authLoading } = useCustomerAuth()
  const business = useBusinessInfo()
  const whatsapp = useWhatsapp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [services, setServices] = useState<Service[] | null>(null)
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  const [step, setStep] = useState(0)
  const [serviceId, setServiceId] = useState<string | null>(searchParams.get('service'))
  const [slotId, setSlotId] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const [s, a] = await Promise.all([api.get<Service[]>('/services'), api.get<AvailabilitySlot[]>('/availability')])
      setServices(s)
      setSlots(a)
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (customer) setPhone((p) => p || customer.phone)
  }, [customer])

  // Coming from a service card on the home screen: skip straight to choosing the date.
  useEffect(() => {
    if (
      services &&
      serviceId &&
      step === 0 &&
      services.some((s) => s.id === serviceId) &&
      searchParams.get('service')
    ) {
      setStep(1)
    }
    // only on first load of the services
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services])

  const service = services?.find((s) => s.id === serviceId) ?? null
  const slot = slots?.find((s) => s.id === slotId) ?? null

  // The button only exists once the step has a choice; while it is on screen the tab bar steps aside.
  const ctaVisible =
    !done &&
    Boolean(services && slots) &&
    ((step === 0 && Boolean(service)) ||
      (step === 1 && Boolean(slot) && (slots?.length ?? 0) > 0) ||
      (step === 2 && Boolean(customer) && phone.trim().length >= 6))
  useHideNav(ctaVisible)

  async function submit() {
    if (!slot || !service || !customer) return
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/bookings', {
        slotId: slot.id,
        serviceId: service.id,
        customerName: customer.name,
        customerPhone: phone.trim(),
        notes: notes.trim() || undefined,
      })
      void success()
      setDone(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Esse horário acabou de ser ocupado. Escolhe outro.')
        setSlotId(null)
        setStep(1)
        void load()
      } else {
        setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-8 pb-32 text-center">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-gold-deep/10"
        >
          <i className="bx bx-check text-6xl text-gold-ink" aria-hidden="true" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h1 className="mt-8 font-subtitle font-semibold tracking-tight text-4xl text-onyx">Pedido enviado!</h1>
          <p className="mx-auto mt-4 max-w-xs font-subtitle text-base font-light text-muted-dark">
            {service?.name} · {slot && `${longDay(slot.startsAt)} às ${timeLabel(slot.startsAt)}`}
          </p>
          <p className="mx-auto mt-3 max-w-xs font-subtitle text-sm font-light text-muted-dark">
            Vais receber uma notificação assim que for confirmada.
          </p>
          <div className="mt-10 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => navigate('/marcacoes')}
              className="rounded-full bg-gold-deep px-8 py-3.5 font-subtitle text-sm text-[#ffffff]"
            >
              Ver as minhas marcações
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="font-subtitle text-sm text-gold-ink underline"
            >
              Voltar ao início
            </button>
          </div>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="px-5 pb-32 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              aria-label="Passo anterior"
              onClick={() => {
                void tap()
                setError(null)
                setStep(step - 1)
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 text-xl text-onyx"
            >
              <i className="bx bx-chevron-left" aria-hidden="true" />
            </button>
          ) : (
            <span className="h-10 w-10" />
          )}
          <h1 className="flex-1 text-center font-subtitle font-semibold tracking-tight text-2xl text-onyx">
            Marcar sessão
          </h1>
          <span className="h-10 w-10" />
        </div>

        <div className="mt-5 flex gap-2" aria-label={`Passo ${step + 1} de 3: ${STEPS[step]}`}>
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className="h-1 overflow-hidden rounded-full bg-gold/20">
                <motion.div
                  className="h-full rounded-full bg-gold-deep"
                  initial={false}
                  animate={{ width: i <= step ? '100%' : '0%' }}
                  transition={{ duration: 0.35 }}
                />
              </div>
              <p
                className={`mt-1.5 text-center font-subtitle text-[10px] uppercase tracking-wide ${i === step ? 'text-onyx' : 'text-muted-dark/70'}`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {loadError && (
          <p className="mt-10 text-center font-subtitle text-sm text-red-700">
            Não foi possível carregar.{' '}
            <button type="button" onClick={() => void load()} className="underline">
              Tentar de novo
            </button>
          </p>
        )}
        {!loadError && (!services || !slots) && (
          <div className="mt-8 flex flex-col gap-3" aria-label="A carregar">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-gold/10" />
            ))}
          </div>
        )}

        {services && slots && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
              className="mt-8"
            >
              {step === 0 && (
                <>
                  <h2 className="font-subtitle text-xl text-onyx">Que tranças queres?</h2>
                  <div className="mt-5 flex flex-col gap-3">
                    {services.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          void tap()
                          setServiceId(s.id)
                        }}
                        className={`rounded-3xl border p-5 text-left transition-colors ${
                          serviceId === s.id ? 'border-gold-deep bg-cream' : 'border-gold/25 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-subtitle font-semibold tracking-tight text-xl text-onyx">{s.name}</p>
                            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-gold-deep/10 px-2.5 py-1 font-subtitle text-[11px] text-gold-ink">
                              <i className="bx bx-time-five text-sm" aria-hidden="true" />
                              {s.durationLabel}
                            </span>
                          </div>
                          <p className="font-subtitle font-semibold tracking-tight text-xl text-onyx">
                            {formatPrice(s.priceCents)}
                          </p>
                        </div>
                        <p className="mt-3 line-clamp-2 font-subtitle text-sm font-light text-muted-dark">
                          {s.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className="font-subtitle text-xl text-onyx">Quando queres vir?</h2>
                  {slots.length === 0 ? (
                    <div className="mt-8 text-center">
                      <i className="bx bx-calendar-x text-5xl text-gold-deep/40" aria-hidden="true" />
                      <p className="mt-3 font-subtitle text-base text-onyx">Sem horários livres de momento</p>
                      <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">
                        Fala connosco e arranjamos uma data.
                      </p>
                      {whatsapp.enabled && (
                        <a
                          href={whatsapp.url('Olá! Gostaria de marcar uma sessão de tranças.')}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 inline-block rounded-full border border-gold/40 px-6 py-3 font-subtitle text-sm text-onyx"
                        >
                          Falar no WhatsApp
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5">
                      <SlotPicker slots={slots} value={slotId} onChange={setSlotId} />
                    </div>
                  )}
                  {error && <p className="mt-5 font-subtitle text-sm text-red-700">{error}</p>}
                </>
              )}

              {step === 2 && service && slot && (
                <>
                  <h2 className="font-subtitle text-xl text-onyx">Confirma o teu pedido</h2>
                  <div className="mt-5 rounded-3xl border border-gold/25 bg-cream p-5">
                    <p className="font-subtitle font-semibold tracking-tight text-xl text-onyx">{service.name}</p>
                    <p className="mt-2 font-subtitle text-sm text-onyx">
                      {longDay(slot.startsAt)} às {timeLabel(slot.startsAt)}
                    </p>
                    <p className="mt-1 font-subtitle text-xs text-muted-dark">Duração: {service.durationLabel}</p>
                    <p className="mt-3 font-subtitle font-semibold tracking-tight text-2xl text-gold-ink">
                      {formatPrice(service.priceCents)}
                    </p>
                  </div>

                  {authLoading ? null : !customer ? (
                    <div className="mt-8">
                      <p className="mb-4 font-subtitle text-sm font-light text-muted-dark">
                        Entra ou cria conta para enviar o pedido. Guardamos a tua escolha.
                      </p>
                      <AccountAuthForm />
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-col gap-4">
                      <label className="block">
                        <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                          Telemóvel
                        </span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                          Notas (opcional)
                        </span>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          maxLength={500}
                          placeholder="Alguma preferência ou informação extra"
                          className={`${fieldClass} resize-none`}
                        />
                      </label>
                      {business.cancellationPolicy && (
                        <p className="font-subtitle text-xs font-light text-muted-dark">
                          <strong className="font-medium text-onyx">Cancelamentos:</strong>{' '}
                          {business.cancellationPolicy}
                        </p>
                      )}
                      {error && <p className="font-subtitle text-sm text-red-700">{error}</p>}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {ctaVisible && (
          <Cta
            key={`cta-${step}`}
            label={step === 2 ? 'Enviar pedido' : 'Continuar'}
            busy={submitting}
            onClick={() => (step === 2 ? void submit() : setStep(step + 1))}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
