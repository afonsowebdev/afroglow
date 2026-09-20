import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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

export default function BookingPage() {
  const [searchParams] = useSearchParams()
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

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gold/20 px-5 py-5 sm:px-8">
        <Link to="/" className="font-logo text-2xl leading-none text-gold-deep">
          AfroGlow
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <h1 className="font-display text-4xl italic sm:text-5xl">Marcar sessão</h1>
        <p className="mt-3 font-body text-muted-dark">
          Escolhe uma data, o tipo de trança, e confirma os teus dados.
        </p>

        {success ? (
          <div className="mt-12 border border-gold/30 bg-cream px-6 py-10 text-center">
            <i className="bx bx-check-circle text-4xl text-gold-deep" aria-hidden="true" />
            <h2 className="mt-4 font-display text-2xl italic">Pedido enviado!</h2>
            <p className="mt-2 font-body text-muted-dark">
              A tua marcação foi enviada e está pendente de confirmação. Entraremos em contacto em breve.
            </p>
            <div className="mt-8">
              <Link to="/" className="font-body text-sm tracking-wide text-gold-deep hover:text-onyx">
                &larr; Voltar à página inicial
              </Link>
            </div>
          </div>
        ) : loading ? (
          <p className="mt-12 font-body text-muted-dark">A carregar horários disponíveis...</p>
        ) : loadError ? (
          <p className="mt-12 font-body text-red-700">{loadError}</p>
        ) : (
          <div className="mt-12 flex flex-col gap-12">
            <section>
              <h2 className="font-display text-2xl italic">1. Escolhe uma data e hora</h2>
              {slotsByDate.length === 0 ? (
                <p className="mt-4 font-body text-sm text-muted-dark">
                  De momento não há horários disponíveis. Contacta-nos diretamente pelo Instagram ou WhatsApp.
                </p>
              ) : (
                <div className="mt-5 flex flex-col gap-5">
                  {slotsByDate.map(([key, daySlots]) => (
                    <div key={key}>
                      <p className="font-ui text-xs uppercase tracking-wide text-muted-dark">
                        {formatDateHeading(daySlots[0].startsAt)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {daySlots.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setSelectedSlotId(slot.id)}
                            className={`border px-4 py-2 font-body text-sm transition-colors ${
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
              <h2 className="font-display text-2xl italic">2. Escolhe o tipo de trança</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`flex flex-col border p-4 text-left transition-colors ${
                      selectedServiceId === service.id
                        ? 'border-gold-deep bg-cream'
                        : 'border-gold/30 hover:border-gold-deep'
                    }`}
                  >
                    <span className="font-display text-lg">{service.name}</span>
                    <span className="mt-1 font-body text-xs text-muted-dark">{service.durationLabel}</span>
                    <span className="mt-2 font-display text-xl font-bold text-gold-deep">
                      {formatPrice(service.priceCents)}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {selectedService && selectedSlot && (
              <section className="border border-gold/30 bg-cream px-5 py-4">
                <p className="font-body text-sm text-onyx">
                  <strong>{selectedService.name}</strong> · {formatDateHeading(selectedSlot.startsAt)} às{' '}
                  {formatTime(selectedSlot.startsAt)}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-gold-deep">
                  {formatPrice(selectedService.priceCents)}
                </p>
              </section>
            )}

            <section>
              <h2 className="font-display text-2xl italic">3. Os teus dados</h2>
              <div className="mt-5 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="font-ui text-xs uppercase tracking-wide text-muted-dark">Nome</span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="border border-gold/30 bg-white px-4 py-2.5 font-body text-onyx outline-none focus-visible:border-gold-deep"
                    placeholder="O teu nome"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-ui text-xs uppercase tracking-wide text-muted-dark">Telemóvel</span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="border border-gold/30 bg-white px-4 py-2.5 font-body text-onyx outline-none focus-visible:border-gold-deep"
                    placeholder="912 345 678"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-ui text-xs uppercase tracking-wide text-muted-dark">Notas (opcional)</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="border border-gold/30 bg-white px-4 py-2.5 font-body text-onyx outline-none focus-visible:border-gold-deep"
                    placeholder="Alguma preferência ou informação extra"
                  />
                </label>
              </div>
            </section>

            {submitError && <p className="font-body text-sm text-red-700">{submitError}</p>}

            <Button disabled={!canSubmit || submitting} onClick={handleSubmit} className="w-full justify-center">
              {submitting ? 'A enviar...' : 'Confirmar Marcação'}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
