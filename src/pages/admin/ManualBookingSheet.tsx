import { useEffect, useMemo, useState } from 'react'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { api, ApiError } from '@/lib/api'
import { formatPrice, type Service } from '@/lib/types'
import type { AdminCustomer } from '@/pages/admin/admin-types'
import { choiceComplete, optionsOf, priceFor, servicePriceLabel } from '@/lib/pricing'

function localDateValue(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/**
 * Adds a confirmed booking by hand: for clients who book by WhatsApp, Instagram or in person.
 * Pick an existing client or type a name + phone; no account or email is needed.
 */
export function ManualBookingSheet({
  open,
  services,
  presetCustomer,
  onClose,
  onDone,
}: {
  open: boolean
  services: Service[]
  presetCustomer?: AdminCustomer | null
  onClose: () => void
  onDone: () => void
}) {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<AdminCustomer | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [serviceId, setServiceId] = useState('')
  // For hairstyles priced by length and/or parting.
  const [length, setLength] = useState('')
  const [parting, setParting] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setNotes('')
    setSearch('')
    setDate(localDateValue(new Date()))
    setServiceId((current) => current || services.find((s) => s.active !== false)?.id || '')
    if (presetCustomer) {
      setMode('existing')
      setPicked(presetCustomer)
    } else {
      setMode('new')
      setPicked(null)
      setName('')
      setPhone('')
    }
    api
      .get<AdminCustomer[]>('/admin/customers')
      .then(setCustomers)
      .catch(() => setCustomers([]))
  }, [open, presetCustomer, services])

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers.slice(0, 5)
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')))
      .slice(0, 5)
  }, [customers, search])

  const hasClient = mode === 'existing' ? Boolean(picked) : name.trim().length >= 2 && phone.trim().length >= 6
  const service = services.find((s) => s.id === serviceId)
  const options = service ? optionsOf(service) : { lengths: [], partings: [], hasOptions: false }
  const price = service ? priceFor(service, length || null, parting || null) : null
  const canSubmit =
    hasClient && Boolean(date) && Boolean(time) && Boolean(serviceId) && (!service || choiceComplete(service, length || null, parting || null))

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await api.post('/admin/bookings/manual', {
        startsAt: new Date(`${date}T${time}:00`).toISOString(),
        serviceId,
        length: length || undefined,
        parting: parting || undefined,
        ...(mode === 'existing' && picked
          ? { customerId: picked.id }
          : { customerName: name.trim(), customerPhone: phone.trim() }),
        notes: notes.trim() || undefined,
      })
      onDone()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      title="Nova marcação"
      description="Fica confirmada logo, e o horário deixa de estar disponível para os clientes."
      icon="bx bx-calendar-plus"
      busy={busy}
      error={error}
      submitLabel="Guardar marcação"
      submitDisabled={!canSubmit}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="flex rounded-full glass-chip p-1">
        {(
          [
            ['new', 'Novo cliente'],
            ['existing', 'Cliente existente'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`flex-1 rounded-full py-2 font-subtitle text-sm transition-colors ${
              mode === id ? 'glass-chip-on text-onyx' : 'text-onyx/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'new' ? (
        <>
          <SheetField label="Nome">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={sheetFieldClass} />
          </SheetField>
          <SheetField label="Telemóvel">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              maxLength={30}
              placeholder="912 345 678"
              className={sheetFieldClass}
            />
          </SheetField>
        </>
      ) : (
        <div>
          {picked ? (
            <div className="flex items-center justify-between rounded-xl border border-gold-deep bg-cream px-4 py-3">
              <div>
                <p className="font-subtitle text-sm font-semibold text-onyx">{picked.name}</p>
                <p className="font-subtitle text-xs text-muted-dark">{picked.phone}</p>
              </div>
              {!presetCustomer && (
                <button
                  type="button"
                  onClick={() => setPicked(null)}
                  className="font-subtitle text-sm text-gold-deep underline"
                >
                  Mudar
                </button>
              )}
            </div>
          ) : (
            <>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome ou telemóvel"
                className={sheetFieldClass}
              />
              <div className="mt-2 flex flex-col gap-1">
                {matches.length === 0 && (
                  <p className="px-1 py-2 font-subtitle text-sm text-muted-dark">Nenhum cliente encontrado.</p>
                )}
                {matches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPicked(c)}
                    className="rounded-xl glass-chip px-4 py-2.5 text-left"
                  >
                    <span className="block font-subtitle text-sm font-semibold text-onyx">{c.name}</span>
                    <span className="block font-subtitle text-xs text-muted-dark">{c.phone}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <SheetField label="Modelo">
        <select
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value)
            setLength('')
            setParting('')
          }}
          className={sheetFieldClass}
        >
          {services
            .filter((s) => s.active !== false)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {servicePriceLabel(s)}
              </option>
            ))}
        </select>
      </SheetField>

      {options.hasOptions && (
        <div className="grid grid-cols-2 gap-3">
          {options.lengths.length > 0 && (
            <SheetField label="Comprimento">
              <select value={length} onChange={(e) => setLength(e.target.value)} className={sheetFieldClass}>
                <option value="">Escolher</option>
                {options.lengths.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </SheetField>
          )}
          {options.partings.length > 0 && (
            <SheetField label="Repartição">
              <select value={parting} onChange={(e) => setParting(e.target.value)} className={sheetFieldClass}>
                <option value="">Escolher</option>
                {options.partings.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </SheetField>
          )}
          {price !== null && (
            <p className="col-span-2 font-subtitle text-sm text-onyx">Preço: {formatPrice(price)}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <SheetField label="Data">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={sheetFieldClass} />
        </SheetField>
        <SheetField label="Hora">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={sheetFieldClass} />
        </SheetField>
      </div>

      <SheetField label="Notas (opcional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
          className={`${sheetFieldClass} resize-none`}
        />
      </SheetField>
    </Sheet>
  )
}
