import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ActionButton } from '@/components/ui/action-button'
import { AccountAuthForm } from '@/components/ui/account-auth-form'
import { api, ApiError } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'
import { success, tap } from '@/lib/haptics'
import { useBusinessInfo, useWhatsapp } from '@/lib/site-config'
import { formatPrice, type AvailabilitySlot, type Service } from '@/lib/types'
import { longDay, timeLabel } from './dates'
import { useHideNav } from './nav-visibility'
import { serviceImageUrls } from '@/lib/service-images'
import { Fact, Facts, labelClass, panelClass } from './panel'
import { ServicePreview } from './ServicePreview'
import { SlotPicker } from './SlotPicker'

const STEPS = ['Modelo', 'Data', 'Confirmar'] as const

const fieldClass =
  'w-full rounded-xl border border-onyx/20 bg-white px-4 py-3.5 font-subtitle text-onyx outline-none focus-visible:border-onyx'

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
      <div className="pointer-events-auto mx-auto flex max-w-md justify-center">
        <div className="rounded-full">
          <ActionButton label={busy ? 'A enviar...' : label} disabled={busy} onClick={onClick} />
        </div>
      </div>
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
  const [previewId, setPreviewId] = useState<string | null>(searchParams.get('preview'))
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
          <div className="mt-10 flex flex-col items-center gap-3">
            <ActionButton label="Ver as minhas marcações" onClick={() => navigate('/marcacoes')} />
            <ActionButton label="Voltar ao início" variant="secondary" onClick={() => navigate('/')} />
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
              className="glass-chip flex h-10 w-10 items-center justify-center rounded-full text-xl text-onyx"
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
                  className="h-full rounded-full bg-brand"
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
                    {services.map((s) => {
                      const chosen = serviceId === s.id
                      const photos = serviceImageUrls(s)
                      return (
                        <div
                          key={s.id}
                          className={`relative overflow-hidden rounded-2xl border bg-white transition-colors ${
                            chosen ? 'border-onyx ring-1 ring-onyx' : 'border-onyx/15'
                          }`}
                        >
                          {/* Tapping the card opens the photos; the circle picks the model directly. */}
                          <button
                            type="button"
                            onClick={() => {
                              void tap()
                              setPreviewId(s.id)
                            }}
                            className="block w-full text-left"
                            aria-label={`Ver fotos e detalhes de ${s.name}`}
                          >
                            {photos.length > 0 && (
                              <div className="relative">
                                <img
                                  src={photos[0]}
                                  alt=""
                                  loading="lazy"
                                  className="aspect-[16/10] w-full object-cover"
                                />
                                {photos.length > 1 && (
                                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 font-subtitle text-[11px] text-[#ffffff] backdrop-blur-md">
                                    <i className="bx bx-images text-sm" aria-hidden="true" />
                                    {photos.length} fotos
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="p-5">
                              <p className={labelClass}>Modelo</p>
                              <p className="mt-2 pr-8 font-subtitle text-xl font-semibold tracking-tight text-onyx">
                                {s.name}
                              </p>
                              {s.description && (
                                <p className="mt-1 line-clamp-2 font-subtitle text-sm font-light text-muted-dark">
                                  {s.description}
                                </p>
                              )}
                              <Facts columns="1fr 1fr">
                                <Fact label="Duração">{s.durationLabel}</Fact>
                                <Fact label="Preço">{formatPrice(s.priceCents)}</Fact>
                              </Facts>
                              <p className="mt-4 flex items-center gap-1 font-subtitle text-sm font-medium text-onyx">
                                {photos.length > 0 ? 'Ver fotos' : 'Ver detalhes'}
                                <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            aria-pressed={chosen}
                            aria-label={chosen ? `Retirar ${s.name}` : `Escolher ${s.name}`}
                            onClick={() => {
                              void tap()
                              setServiceId(chosen ? null : s.id)
                            }}
                            className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full ${
                              chosen ? 'glass-chip-on text-onyx' : 'glass-chip text-transparent'
                            }`}
                          >
                            <i className="bx bx-check text-xl" aria-hidden="true" />
                          </button>
                        </div>
                      )
                    })}
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

                  {/* Summary */}
                  <div className={`${panelClass} mt-5`}>
                    <div className="flex items-center justify-between">
                      <p className={labelClass}>Resumo</p>
                      <span className="font-subtitle text-xs text-muted-dark">Por confirmar</span>
                    </div>
                    <p className="mt-2 font-subtitle text-xl font-semibold tracking-tight text-onyx">{service.name}</p>

                    <Facts columns="2fr 1fr">
                      <Fact label="Data">{longDay(slot.startsAt)}</Fact>
                      <Fact label="Hora">{timeLabel(slot.startsAt)}</Fact>
                    </Facts>
                    <Facts columns="1fr 1fr">
                      <Fact label="Duração">{service.durationLabel}</Fact>
                      <Fact label="Preço">{formatPrice(service.priceCents)}</Fact>
                    </Facts>
                    {business.address && (
                      <Facts columns="1fr">
                        <Fact label="Local">{business.address}</Fact>
                      </Facts>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-onyx/15 pt-4 font-subtitle text-sm font-medium text-onyx">
                      <button type="button" onClick={() => setStep(0)} className="underline underline-offset-4">
                        Alterar modelo
                      </button>
                      <button type="button" onClick={() => setStep(1)} className="underline underline-offset-4">
                        Alterar data
                      </button>
                    </div>
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
                      <p className="font-subtitle text-sm font-light text-muted-dark">
                        O pedido fica <strong className="font-semibold text-onyx">por confirmar</strong>. Avisamos-te na
                        app assim que for aceite. Não há pagamentos na app.
                      </p>

                      <div className={panelClass}>
                        <p className={labelClass}>Os teus dados</p>
                        <p className="mt-2 flex items-center gap-2 font-subtitle text-sm text-onyx">
                          <i className="bx bx-user text-lg text-muted-dark" aria-hidden="true" />
                          {customer.name}
                        </p>
                        <label className="mt-3 flex items-center gap-2 rounded-xl border border-onyx/20 px-3 focus-within:border-onyx">
                          <i className="bx bx-phone text-lg text-muted-dark" aria-hidden="true" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            aria-label="Telemóvel"
                            placeholder="O teu telemóvel"
                            className="w-full bg-transparent py-3 font-subtitle text-onyx outline-none"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className={`${labelClass} mb-1.5 block`}>Notas (opcional)</span>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          maxLength={500}
                          placeholder="Tamanho, comprimento, cor… ou qualquer informação extra"
                          className={`${fieldClass} resize-none`}
                        />
                      </label>

                      {business.cancellationPolicy && (
                        <p className="flex items-start gap-2 font-subtitle text-xs font-light text-muted-dark">
                          <i className="bx bx-calendar-x mt-0.5 text-base text-muted-dark" aria-hidden="true" />
                          <span>
                            <strong className="font-medium text-onyx">Cancelamentos:</strong>{' '}
                            {business.cancellationPolicy}
                          </span>
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
            label={step === 2 && service ? `Enviar pedido · ${formatPrice(service.priceCents)}` : 'Continuar'}
            busy={submitting}
            onClick={() => (step === 2 ? void submit() : setStep(step + 1))}
          />
        )}
      </AnimatePresence>

      <ServicePreview
        service={services?.find((x) => x.id === previewId) ?? null}
        chosen={Boolean(previewId) && serviceId === previewId}
        onClose={() => setPreviewId(null)}
        onChoose={() => {
          setServiceId(serviceId === previewId ? null : previewId)
          setPreviewId(null)
        }}
      />
    </main>
  )
}
