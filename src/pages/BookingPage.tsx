import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MotionButton } from '@/components/ui/motion-button'
import { api, ApiError } from '@/lib/api'
import { formatPrice, type AvailabilitySlot, type Service } from '@/lib/types'

const LISBON_TZ = 'Europe/Lisbon'

function dateKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: LISBON_TZ })
}

function formatDateHeading(iso: string) {
  const label = new Date(iso).toLocaleDateString('pt-PT', {
    timeZone: LISBON_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-PT', { timeZone: LISBON_TZ, hour: '2-digit', minute: '2-digit' })
}

function StepHeading({ number, children }: { number: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-logo text-sm text-gold-deep">{number}</span>
      <h2 className="font-subtitle text-xl text-onyx sm:text-2xl">{children}</h2>
    </div>
  )
}

export default function BookingPage() {
  const [searchParams] = useSearchParams()
  const [scrolled, setScrolled] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(searchParams.get('service'))
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const [servicesData, slotsData] = await Promise.all([
          api.get<Service[]>('/services'),
          api.get<AvailabilitySlot[]>('/availability'),
        ])
        setServices(servicesData)
        setSlots(slotsData)
      } catch {
        setLoadError('Não foi possível carregar os dados. Tenta recarregar a página.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const slotsByDate = useMemo(() => {
    const groups = new Map<string, AvailabilitySlot[]>()
    for (const slot of slots) {
      const key = dateKey(slot.startsAt)
      const existing = groups.get(key) ?? []
      existing.push(slot)
      groups.set(key, existing)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [slots])

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null
  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null
  const canSubmit = selectedSlotId && selectedServiceId && customerName.trim().length >= 2 && customerPhone.trim().length >= 6

  async function handleSubmit() {
    if (!selectedSlotId || !selectedServiceId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.post('/bookings', {
        slotId: selectedSlotId,
        serviceId: selectedServiceId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        notes: notes.trim() || undefined,
      })
      setSuccess(true)
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        if (error.status === 409) {
          setSlots((prev) => prev.filter((s) => s.id !== selectedSlotId))
          setSelectedSlotId(null)
        }
      } else {
        setSubmitError('Erro inesperado. Tenta novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const pillClasses = `flex items-center rounded-full bg-white/95 shadow-lg shadow-black/10 backdrop-blur transition-shadow duration-500 ${
    scrolled ? 'shadow-xl shadow-black/15' : ''
  }`

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed inset-x-0 top-0 z-50 mt-4 px-4 sm:mt-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className={`px-5 py-3 sm:px-6 ${pillClasses}`}>
            <span className="font-logo text-2xl leading-none tracking-wide text-gold-deep">AFROGLOW</span>
          </Link>

          <Link
            to="/"
            className={`gap-2 px-5 py-3 text-sm text-onyx transition-colors duration-300 hover:text-gold-deep sm:px-6 ${pillClasses}`}
          >
            <span>Sair</span>
            <i className="bx bx-x text-xl" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
        <h1 className="font-logo text-4xl text-onyx sm:text-5xl">Marcar sessão</h1>
        <p className="mt-4 font-subtitle text-lg font-light text-muted-dark">
          Escolhe uma data, o tipo de trança, e confirma os teus dados.
        </p>

        {success ? (
          <div className="mt-14 flex flex-col items-center rounded-3xl border border-gold/20 bg-cream px-6 py-14 text-center">
            <i className="bx bx-check-circle text-4xl text-gold-deep" aria-hidden="true" />
            <h2 className="mt-4 font-logo text-3xl text-onyx">Pedido enviado!</h2>
            <p className="mt-3 max-w-sm font-subtitle text-base font-light text-muted-dark">
              A tua marcação foi enviada e está pendente de confirmação. Entraremos em contacto em breve.
            </p>
            <div className="mt-8">
              <MotionButton label="Voltar ao início" href="/" size="sm" />
            </div>
          </div>
        ) : loading ? (
          <p className="mt-14 font-subtitle text-muted-dark">A carregar horários disponíveis...</p>
        ) : loadError ? (
          <p className="mt-14 font-subtitle text-red-700">{loadError}</p>
        ) : (
          <div className="mt-14 flex flex-col gap-14">
            <section>
              <StepHeading number="01">Escolhe uma data e hora</StepHeading>
              {slotsByDate.length === 0 ? (
                <p className="mt-5 font-subtitle text-sm font-light text-muted-dark">
                  De momento não há horários disponíveis. Contacta-nos diretamente pelo Instagram ou WhatsApp.
                </p>
              ) : (
                <div className="mt-6 flex flex-col gap-6">
                  {slotsByDate.map(([key, daySlots]) => (
                    <div key={key}>
                      <p className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                        {formatDateHeading(daySlots[0].startsAt)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {daySlots.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setSelectedSlotId(slot.id)}
                            className={`rounded-full border px-5 py-2 font-subtitle text-sm transition-colors duration-300 ${
                              selectedSlotId === slot.id
                                ? 'border-gold-deep bg-gold-deep text-cream'
                                : 'border-gold/30 text-onyx hover:border-gold-deep'
                            }`}
                          >
                            {formatTime(slot.startsAt)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <StepHeading number="02">Escolhe o tipo de trança</StepHeading>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`flex flex-col rounded-2xl border p-5 text-left transition-all duration-300 ${
                      selectedServiceId === service.id
                        ? 'border-gold-deep bg-cream'
                        : 'border-gold/20 hover:border-gold-deep'
                    }`}
                  >
                    <span className="font-subtitle text-lg text-onyx">{service.name}</span>
                    <span className="mt-1 font-logo text-sm tracking-wide text-muted-dark">
                      {service.durationLabel}
                    </span>
                    <span className="mt-3 font-logo text-2xl text-gold-deep">{formatPrice(service.priceCents)}</span>
                  </button>
                ))}
              </div>
            </section>

            {selectedService && selectedSlot && (
              <section className="rounded-2xl border border-gold/20 bg-cream px-6 py-5">
                <p className="font-subtitle text-sm text-onyx">
                  <strong className="font-medium">{selectedService.name}</strong> · {formatDateHeading(selectedSlot.startsAt)}{' '}
                  às {formatTime(selectedSlot.startsAt)}
                </p>
                <p className="mt-1 font-logo text-2xl text-gold-deep">{formatPrice(selectedService.priceCents)}</p>
              </section>
            )}

            <section>
              <StepHeading number="03">Os teus dados</StepHeading>
              <div className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Nome</span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="rounded-xl border border-gold/30 bg-white px-4 py-3 font-subtitle text-onyx outline-none transition-colors duration-300 focus-visible:border-gold-deep"
                    placeholder="O teu nome"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Telemóvel</span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="rounded-xl border border-gold/30 bg-white px-4 py-3 font-subtitle text-onyx outline-none transition-colors duration-300 focus-visible:border-gold-deep"
                    placeholder="912 345 678"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                    Notas (opcional)
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="rounded-xl border border-gold/30 bg-white px-4 py-3 font-subtitle text-onyx outline-none transition-colors duration-300 focus-visible:border-gold-deep"
                    placeholder="Alguma preferência ou informação extra"
                  />
                </label>
              </div>
            </section>

            {submitError && <p className="font-subtitle text-sm text-red-700">{submitError}</p>}

            <div className="flex justify-center sm:justify-start">
              <MotionButton
                label={submitting ? 'A enviar...' : 'Confirmar marcação'}
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
