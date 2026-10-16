import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ActionButton } from '@/components/ui/action-button'
import { AccountAuthForm } from '@/components/ui/account-auth-form'
import { api, ApiError } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'
import { success, tap } from '@/lib/haptics'
import { useBusinessInfo, useWhatsapp } from '@/lib/site-config'
import { downloadBookingIcs } from '@/lib/calendar'
import { formatPrice, type AvailabilitySlot, type Service } from '@/lib/types'
import { longDay, timeLabel } from './dates'
import { useBackButton, useHideNav } from './nav-visibility'
import { serviceImageUrls } from '@/lib/service-images'
import { Fact, Facts, labelClass, panelClass } from './panel'
import { choiceComplete, choiceLabel, optionsOf, priceFor, servicePriceLabel } from '@/lib/pricing'
import { VelocityRow } from '@/components/ui/velocity-marquee'
import { ButtonWithIcon } from '@/components/ui/button-with-icon'
import { ServicePreview } from './ServicePreview'
import { SlotPicker } from './SlotPicker'
import { BRAID_COLORS, colorLabel } from '@/lib/braid-colors'

const STEPS = ['Modelo', 'Data', 'Confirmar'] as const

/** A grouped list, as in the app's settings: rows on one soft surface, separated by hairlines. */
const groupClass =
  'divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]'

/** The braiding-hair colours as one list: a flat swatch, the name and the code; the chosen one is ticked. */
function ColorPicker({ value, onChange }: { value: string | null; onChange: (code: string) => void }) {
  return (
    <div className={`mt-4 ${groupClass}`} role="radiogroup" aria-label="Cor">
      {BRAID_COLORS.map((c) => {
        const on = c.code === value
        return (
          <button
            key={c.code}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`Cor ${c.code}, ${c.name}`}
            onClick={() => {
              void tap()
              onChange(c.code)
            }}
            className="flex w-full items-center gap-3.5 px-4 py-2.5 text-left active:bg-onyx/[0.04]"
          >
            <span className="size-8 shrink-0 rounded-full ring-1 ring-onyx/15" style={{ background: c.hex }} />
            <span className={`min-w-0 flex-1 font-subtitle text-[15px] text-onyx ${on ? 'font-semibold' : ''}`}>
              {c.name}
            </span>
            <span className="font-subtitle text-sm tabular-nums text-muted-dark">Cor {c.code}</span>
            <span className="flex w-5 shrink-0 justify-end" aria-hidden="true">
              {on && <i className="bx bx-check text-2xl leading-none text-onyx" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** One row of options (lengths or partings) as chips; the chosen one is filled. */
function OptionChips({
  label,
  values,
  value,
  onChange,
  site,
}: {
  label: string
  values: string[]
  value: string | null
  onChange: (value: string) => void
  site: boolean
}) {
  return (
    <div className="mt-5">
      <p className={labelClass}>{label}</p>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {values.map((v) => {
          const on = v === value
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                void tap()
                onChange(v)
              }}
              // Chosen: filled solid (light on dark in the dark theme), so it can't be mistaken for the others.
              className={`h-11 rounded-full px-5 font-subtitle text-sm transition-colors ${
                on
                  ? 'bg-onyx font-medium text-white'
                  : site
                    ? 'border border-onyx/15 bg-white text-onyx hover:border-onyx/40'
                    : 'glass-chip text-onyx/70'
              }`}
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Bottom action button: slides up from the bottom edge only once there is something to continue with. */
function Cta({
  label,
  busy,
  onClick,
  className = '',
}: {
  label: string
  busy?: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <motion.div
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 90, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className={`pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 px-5 ${className}`}
    >
      <div className="pointer-events-auto mx-auto flex max-w-md justify-center">
        <div className="rounded-full">
          {/* Its letters follow what is behind the glass on their own (GlassButton). */}
          <ActionButton label={busy ? 'A enviar...' : label} disabled={busy} onClick={onClick} />
        </div>
      </div>
    </motion.div>
  )
}

/**
 * The booking flow in three steps (model, date, confirm). The customer app shows it as a tab; the website (`site`)
 * shows the same flow under its own header, with the links and wording of the web.
 */
export default function BookScreen({ site = false }: { site?: boolean } = {}) {
  const { customer, loading: authLoading, refresh } = useCustomerAuth()
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
  // Length and parting, for hairstyles priced by them (see lib/pricing).
  const [length, setLength] = useState<string | null>(null)
  const [parting, setParting] = useState<string | null>(null)
  // The braiding-hair colour, by code (lib/braid-colors).
  const [color, setColor] = useState<string | null>(null)
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
      // Coming from a free-slot chip on the home screen: that time is already chosen.
      const wanted = searchParams.get('slot')
      if (wanted && a.some((x) => x.id === wanted)) setSlotId((current) => current ?? wanted)
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
  const options = service ? optionsOf(service) : { lengths: [], partings: [], hasOptions: false }
  const optionsDone = !service || choiceComplete(service, length, parting)
  const price = service ? priceFor(service, length, parting) : null
  const chosenLabel = options.hasOptions ? choiceLabel(length, parting) : null

  // A different hairstyle has its own options: start the choice again.
  useEffect(() => {
    setLength(null)
    setParting(null)
  }, [serviceId])

  // The button only exists once the step has a choice; while it is on screen the tab bar steps aside.
  const ctaVisible =
    !done &&
    Boolean(services && slots) &&
    ((step === 0 && Boolean(service)) ||
      (step === 1 && optionsDone && Boolean(color) && Boolean(slot) && (slots?.length ?? 0) > 0) ||
      (step === 2 && Boolean(customer) && phone.trim().length >= 6))
  // In the app the booking is a clean page of its own: no tab bar at the bottom; on the website, only while its
  // own button is on screen.
  useHideNav(!site || ctaVisible)
  // In the app, the way back is in the top row (in place of the "A"): the previous step, or from the first step the
  // screen the customer came from.
  useBackButton(!site, () => {
    setError(null)
    if (done) navigate('/')
    else if (step > 0) setStep(step - 1)
    else if ((window.history.state as { idx?: number } | null)?.idx) navigate(-1)
    else navigate('/')
  })

  async function submit() {
    if (!slot || !service || !customer) return
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/bookings', {
        slotId: slot.id,
        serviceId: service.id,
        length: length ?? undefined,
        parting: parting ?? undefined,
        color: color ?? undefined,
        customerName: customer.name,
        customerPhone: phone.trim(),
        notes: notes.trim() || undefined,
      })
      void success()
      setDone(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Session expired: refreshing shows the sign-in form again, and the choice stays.
        setError('A tua sessão expirou. Entra novamente para concluir a marcação.')
        void refresh()
      } else if (err instanceof ApiError && err.status === 409) {
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
          className="flex h-24 w-24 items-center justify-center rounded-full bg-onyx/5"
        >
          <i className="bx bx-check text-6xl text-onyx" aria-hidden="true" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h1
            className={
              site
                ? 'mt-8 font-logo text-4xl text-onyx sm:text-5xl'
                : 'mt-8 font-subtitle font-semibold tracking-tight text-4xl text-onyx'
            }
          >
            Pedido enviado!
          </h1>
          <p className="mx-auto mt-4 max-w-xs font-subtitle text-base font-light text-muted-dark">
            {service?.name} · {slot && `${longDay(slot.startsAt)} às ${timeLabel(slot.startsAt)}`}
          </p>
          <p className="mx-auto mt-3 max-w-xs font-subtitle text-sm font-light text-muted-dark">
            {site ? 'Avisamos-te assim que for confirmada.' : 'Vais receber uma notificação assim que for confirmada.'}
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <ActionButton label="Ver as minhas marcações" onClick={() => navigate('/marcacoes')} />
            {site && service && slot && (
              <ActionButton
                label="Adicionar ao calendário"
                variant="secondary"
                onClick={() =>
                  downloadBookingIcs({
                    serviceName: service.name,
                    startsAtIso: slot.startsAt,
                    durationLabel: service.durationLabel,
                  })
                }
              />
            )}
            <ActionButton label="Voltar ao início" variant="secondary" onClick={() => navigate('/')} />
          </div>
        </motion.div>
      </main>
    )
  }

  return (
    <main className={`px-5 pb-32 ${site ? 'pt-10 sm:pt-14 lg:pt-20' : 'pt-[calc(4.5rem+env(safe-area-inset-top))]'}`}>
      {/* Website: the sliding AFROGLOW behind the page, as on the home page's sections. */}
      {site && (
        <div className="pointer-events-none fixed inset-0 flex flex-col justify-center">
          <VelocityRow direction={1} />
        </div>
      )}
      <div className={site ? 'relative mx-auto max-w-6xl sm:px-3' : 'mx-auto max-w-md'}>
        {site ? (
          // The website's heading: the site's display face, aligned left, the back arrow beside it.
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                aria-label="Passo anterior"
                onClick={() => {
                  setError(null)
                  setStep(step - 1)
                }}
                className="glass-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-onyx"
              >
                <i className="bx bx-chevron-left" aria-hidden="true" />
              </button>
            )}
            <h1 className="font-logo text-4xl text-onyx sm:text-5xl">Marcar sessão</h1>
          </div>
        ) : (
          <h1 className="text-center font-subtitle text-2xl font-semibold tracking-tight text-onyx">Marcar sessão</h1>
        )}

        <div
          className={`mt-5 flex gap-2 ${site ? 'max-w-xl' : ''}`}
          aria-label={`Passo ${step + 1} de 3: ${STEPS[step]}`}
        >
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1 overflow-hidden rounded-full ${site ? 'bg-onyx/10' : 'bg-onyx/[0.07]'}`}>
                <motion.div
                  className={`h-full rounded-full ${site ? 'bg-onyx' : 'bg-onyx'}`}
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
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-onyx/5" />
            ))}
          </div>
        )}

        {services && slots && (
          <div className={site ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10' : ''}>
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
                    <div className={site ? 'mt-5 grid gap-4 sm:grid-cols-2' : 'mt-5 flex flex-col gap-3'}>
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
                            {/* App: tapping the card opens the photos; the circle picks the model directly.
                              Website: clicking the card picks the model; "Ver fotos" opens the photos. */}
                            <button
                              type="button"
                              onClick={() => {
                                void tap()
                                if (site) setServiceId(chosen ? null : s.id)
                                else setPreviewId(s.id)
                              }}
                              className="block w-full text-left"
                              aria-label={
                                site
                                  ? chosen
                                    ? `Retirar ${s.name}`
                                    : `Escolher ${s.name}`
                                  : `Ver fotos e detalhes de ${s.name}`
                              }
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
                                  <Fact label="Preço">{servicePriceLabel(s)}</Fact>
                                </Facts>
                                {!site && (
                                  <p className="mt-4 flex items-center gap-1 font-subtitle text-sm font-medium text-onyx">
                                    {photos.length > 0 ? 'Ver fotos' : 'Ver detalhes'}
                                    <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
                                  </p>
                                )}
                              </div>
                            </button>
                            {site && (
                              <button
                                type="button"
                                onClick={() => setPreviewId(s.id)}
                                className="mx-5 mb-5 flex items-center gap-1 font-subtitle text-sm font-medium text-onyx underline-offset-4 hover:underline"
                              >
                                {photos.length > 0 ? 'Ver fotos' : 'Ver detalhes'}
                                <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
                              </button>
                            )}

                            <button
                              type="button"
                              aria-pressed={chosen}
                              aria-label={chosen ? `Retirar ${s.name}` : `Escolher ${s.name}`}
                              onClick={() => {
                                void tap()
                                setServiceId(chosen ? null : s.id)
                              }}
                              // Over the photo: solid, with a shadow, so it reads on any picture and in both themes.
                              className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-md shadow-black/20 transition-colors ${
                                chosen
                                  ? 'bg-onyx text-white'
                                  : 'border border-onyx/15 bg-white/90 text-transparent backdrop-blur-sm'
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
                    {service && options.hasOptions && (
                      <section className="mb-10">
                        <h2 className="font-subtitle text-xl text-onyx">Como queres as tuas {service.name}?</h2>
                        <p className="mt-1 font-subtitle text-sm font-light text-onyx/60">
                          O preço depende{' '}
                          {options.lengths.length && options.partings.length
                            ? 'do comprimento e da repartição'
                            : options.lengths.length
                              ? 'do comprimento'
                              : 'da repartição'}
                          . Tudo incluído.
                        </p>
                        {options.lengths.length > 0 && (
                          <OptionChips
                            label="Comprimento"
                            values={options.lengths}
                            value={length}
                            onChange={setLength}
                            site={site}
                          />
                        )}
                        {options.partings.length > 0 && (
                          <OptionChips
                            label="Repartição"
                            values={options.partings}
                            value={parting}
                            onChange={setParting}
                            site={site}
                          />
                        )}
                        <p className="mt-5 font-subtitle text-sm text-onyx">
                          {price !== null ? (
                            <>
                              Preço: <strong className="font-semibold">{formatPrice(price)}</strong>
                            </>
                          ) : (
                            <span className="text-onyx/55">Escolhe para veres o preço.</span>
                          )}
                        </p>
                      </section>
                    )}
                    {service && (
                      <section className="mb-10">
                        <h2 className="font-subtitle text-xl text-onyx">Que cor queres?</h2>
                        <p className="mt-1 font-subtitle text-sm font-light text-onyx/60">
                          Escolhe pelo código da cor do cabelo.
                        </p>
                        <ColorPicker value={color} onChange={setColor} />
                      </section>
                    )}
                    <h2 className="font-subtitle text-xl text-onyx">Quando queres vir?</h2>
                    {slots.length === 0 ? (
                      <div className="mt-8 text-center">
                        <i className="bx bx-calendar-x text-5xl text-onyx/25" aria-hidden="true" />
                        <p className="mt-3 font-subtitle text-base text-onyx">Sem horários livres de momento</p>
                        <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">
                          Fala connosco e arranjamos uma data.
                        </p>
                        {whatsapp.enabled && (
                          <a
                            href={whatsapp.url('Olá! Gostaria de marcar uma sessão de tranças.')}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-5 inline-block rounded-full border border-onyx/20 px-6 py-3 font-subtitle text-sm text-onyx"
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

                    {/* Summary (on the website's wide screens it is in the column beside). */}
                    <div className={`${panelClass} mt-5 ${site ? 'lg:hidden' : ''}`}>
                      <div className="flex items-center justify-between">
                        <p className={labelClass}>Resumo</p>
                        <span className="font-subtitle text-xs text-muted-dark">Por confirmar</span>
                      </div>
                      <p className="mt-2 font-subtitle text-xl font-semibold tracking-tight text-onyx">
                        {service.name}
                      </p>
                      {(chosenLabel || color) && (
                        <p className="mt-0.5 font-subtitle text-sm text-muted-dark">
                          {[chosenLabel, colorLabel(color)].filter(Boolean).join(' · ')}
                        </p>
                      )}

                      <Facts columns="2fr 1fr">
                        <Fact label="Data">{longDay(slot.startsAt)}</Fact>
                        <Fact label="Hora">{timeLabel(slot.startsAt)}</Fact>
                      </Facts>
                      <Facts columns="1fr 1fr">
                        <Fact label="Duração">{service.durationLabel}</Fact>
                        <Fact label="Preço">{formatPrice(price ?? service.priceCents)}</Fact>
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
                          O pedido fica <strong className="font-semibold text-onyx">por confirmar</strong>.{' '}
                          {site
                            ? 'Avisamos-te assim que for aceite. Não há pagamentos online.'
                            : 'Avisamos-te na app assim que for aceite. Não há pagamentos na app.'}
                        </p>

                        {/* The customer's details and the notes as grouped rows: the label on the left, the value on the right. */}
                        <div>
                          <p className={`${labelClass} mb-2 px-1`}>Os teus dados</p>
                          <div className={groupClass}>
                            <div className="flex h-[52px] items-center gap-3 px-4">
                              <span className="w-24 shrink-0 font-subtitle text-[15px] text-onyx">Nome</span>
                              <span className="min-w-0 flex-1 truncate text-right font-subtitle text-[15px] text-onyx/65">
                                {customer.name}
                              </span>
                            </div>
                            <label className="flex h-[52px] items-center gap-3 px-4">
                              <span className="w-24 shrink-0 font-subtitle text-[15px] text-onyx">Telemóvel</span>
                              <input
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="912 345 678"
                                className="field-plain min-w-0 flex-1 bg-transparent text-right font-subtitle text-base text-onyx outline-none placeholder:text-onyx/35"
                              />
                            </label>
                          </div>
                        </div>

                        <label className="block">
                          <span className={`${labelClass} mb-2 block px-1`}>Notas (opcional)</span>
                          <span className={`block px-4 py-3 ${groupClass}`}>
                            <textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              rows={3}
                              maxLength={500}
                              placeholder="Tamanho, comprimento, cor… ou qualquer informação extra"
                              className="field-plain block w-full resize-none bg-transparent font-subtitle text-base leading-snug text-onyx outline-none placeholder:text-onyx/35"
                            />
                          </span>
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

            {/* Website, wide screens: what has been chosen so far, with the button to go on, beside the steps. */}
            {site && (
              <aside className="mt-8 hidden lg:sticky lg:top-28 lg:block">
                <div className="rounded-3xl border border-onyx/10 bg-white p-6 shadow-sm shadow-black/5">
                  <p className={labelClass}>A tua marcação</p>
                  <dl className="mt-4 flex flex-col gap-4 font-subtitle text-sm">
                    <div>
                      <dt className="text-onyx/55">Modelo</dt>
                      <dd className="mt-0.5 text-base font-medium text-onyx">{service?.name ?? 'Por escolher'}</dd>
                    </div>
                    {service && (
                      <div>
                        <dt className="text-onyx/55">Cor</dt>
                        <dd className="mt-0.5 text-base font-medium text-onyx">
                          {colorLabel(color) ?? 'Por escolher'}
                        </dd>
                      </div>
                    )}
                    {service && options.hasOptions && (
                      <div>
                        <dt className="text-onyx/55">Opções</dt>
                        <dd className="mt-0.5 text-base font-medium text-onyx">{chosenLabel ?? 'Por escolher'}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-onyx/55">Data e hora</dt>
                      <dd className="mt-0.5 text-base font-medium text-onyx">
                        {slot ? `${longDay(slot.startsAt)}, ${timeLabel(slot.startsAt)}` : 'Por escolher'}
                      </dd>
                    </div>
                    {service && (
                      <div className="flex justify-between border-t border-onyx/10 pt-4">
                        <div>
                          <dt className="text-onyx/55">Duração</dt>
                          <dd className="mt-0.5 font-medium text-onyx">{service.durationLabel}</dd>
                        </div>
                        <div className="text-right">
                          <dt className="text-onyx/55">Preço</dt>
                          <dd className="mt-0.5 font-logo text-2xl leading-tight text-onyx">
                            {price !== null ? formatPrice(price) : servicePriceLabel(service)}
                          </dd>
                        </div>
                      </div>
                    )}
                  </dl>
                  {/* The site's button with the sliding arrow disc, as "Agendar" in the header. */}
                  <ButtonWithIcon
                    label={submitting ? 'A enviar...' : step === 2 ? 'Enviar pedido' : 'Continuar'}
                    solid
                    large
                    disabled={!ctaVisible || submitting}
                    onClick={() => (step === 2 ? void submit() : setStep(step + 1))}
                    className="mt-6 w-full disabled:cursor-not-allowed disabled:opacity-30"
                  />
                  <p className="mt-3 font-subtitle text-xs font-light text-onyx/55">
                    {step === 0 && !service
                      ? 'Escolhe um modelo para continuar.'
                      : step === 1 && !optionsDone
                        ? 'Escolhe o comprimento e a repartição.'
                        : step === 1 && !color
                          ? 'Escolhe a cor.'
                          : step === 1 && !slot
                            ? 'Escolhe o dia e a hora.'
                            : step === 2 && !customer
                              ? 'Entra na tua conta para enviar o pedido.'
                              : 'Sem pagamentos online. Pagas no dia.'}
                  </p>
                </div>
              </aside>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {ctaVisible && (
          <Cta
            key={`cta-${step}`}
            label={step === 2 && service ? `Enviar pedido · ${formatPrice(price ?? service.priceCents)}` : 'Continuar'}
            busy={submitting}
            onClick={() => (step === 2 ? void submit() : setStep(step + 1))}
            className={site ? 'lg:hidden' : ''}
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
