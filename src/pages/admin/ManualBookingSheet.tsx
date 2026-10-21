import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { api, ApiError } from '@/lib/api'
import { formatPrice, type AvailabilitySlot, type Service } from '@/lib/types'
import type { AdminCustomer } from '@/pages/admin/admin-types'
import { choiceComplete, optionsOf, priceFor, servicePriceLabel } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import { BRAID_COLORS } from '@/lib/braid-colors'

function localDateValue(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/**
 * A date or time row: the label on the left and the value drawn by us, against the right edge, so the rows line up
 * on the iPhone too (its own date box ignores alignment). The real field lies over the row, invisible, and opens the
 * iPhone's picker when tapped.
 */
function DateTimeRow({
  label,
  type,
  value,
  display,
  onChange,
}: {
  label: string
  type: 'date' | 'time'
  value: string
  display: string
  onChange: (value: string) => void
}) {
  return (
    <label className="relative flex h-[52px] items-center gap-3 px-4">
      <span className="flex-1 font-subtitle text-[15px] text-onyx">{label}</span>
      <span className="font-subtitle text-base lining-nums tabular-nums text-onyx">{display}</span>
      <i className={`bx ${type === 'date' ? 'bx-calendar' : 'bx-time-five'} text-lg text-onyx/40`} aria-hidden="true" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  )
}

/**
 * Adds a confirmed booking by hand: for clients who book by WhatsApp, Instagram or in person. A sheet in the
 * app's grouped style: who (an existing client or a name and phone; no account needed), the model as chips with its
 * options and the hair colour as swatches, when (the free slots of the next days in one tap, or any date and time),
 * a note, and a summary line; Cancelar and Guardar always on top.
 */
export function ManualBookingSheet({
  open,
  services,
  presetCustomer,
  presetStartsAt,
  slots = [],
  onClose,
  onDone,
}: {
  open: boolean
  services: Service[]
  presetCustomer?: Pick<AdminCustomer, 'id' | 'name' | 'phone'> | null
  /** A free time picked before opening (e.g. on the Início), already chosen. */
  presetStartsAt?: string | null
  /** The agenda's slots: the free ones in the next days are offered as one-tap times. */
  slots?: AvailabilitySlot[]
  onClose: () => void
  onDone: () => void
}) {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<Pick<AdminCustomer, 'id' | 'name' | 'phone'> | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [serviceId, setServiceId] = useState('')
  // For hairstyles priced by length and/or parting.
  const [length, setLength] = useState('')
  const [parting, setParting] = useState('')
  const [color, setColor] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setNotes('')
    setSearch('')
    if (presetStartsAt) {
      const at = new Date(presetStartsAt)
      setDate(localDateValue(at))
      setTime(`${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`)
    } else {
      setDate(localDateValue(new Date()))
    }
    setLength('')
    setParting('')
    setColor('')
    setServiceId((current) => current || services.find((s) => s.active !== false)?.id || '')
    if (presetCustomer) {
      setMode('existing')
      setPicked(presetCustomer)
    } else {
      // Search the clients first; a new one is a tap away.
      setMode('existing')
      setPicked(null)
      setName('')
      setPhone('')
    }
    api
      .get<AdminCustomer[]>('/admin/customers')
      .then(setCustomers)
      .catch(() => setCustomers([]))
  }, [open, presetCustomer, presetStartsAt, services])

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
    hasClient &&
    Boolean(date) &&
    Boolean(time) &&
    Boolean(serviceId) &&
    (!service || choiceComplete(service, length || null, parting || null))

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await api.post('/admin/bookings/manual', {
        startsAt: new Date(`${date}T${time}:00`).toISOString(),
        serviceId,
        length: length || undefined,
        parting: parting || undefined,
        color: color || undefined,
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

  const freeSlots = slots
    .filter((sl) => sl.status === 'OPEN' && new Date(sl.startsAt).getTime() > Date.now())
    .sort((x, y) => new Date(x.startsAt).getTime() - new Date(y.startsAt).getTime())
    .slice(0, 8)
  const chosenAt = date && time ? new Date(`${date}T${time}:00`) : null
  // What still stops it from being saved, said plainly in the summary.
  const missing = [
    !hasClient && (mode === 'existing' ? 'escolher a cliente' : 'nome e telemóvel'),
    options.lengths.length > 0 && !length && 'o comprimento',
    options.partings.length > 0 && !parting && 'a repartição',
    (!date || !time) && 'a data e a hora',
  ].filter(Boolean) as string[]
  const whenLabel = chosenAt
    ? chosenAt.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${time}`
    : ''

  const section = 'mb-[7px] px-4 text-[13px] uppercase text-[var(--ios-secondary)]'
  const group =
    'divide-y divide-[var(--ios-separator)] overflow-hidden rounded-[10px] bg-[var(--ios-cell)]'
  const plain =
    'field-plain block w-full min-w-0 bg-transparent font-subtitle text-base text-onyx outline-none placeholder:text-onyx/35'
  const chip = (on: boolean) =>
    cn(
      'h-10 shrink-0 rounded-full px-4 font-subtitle text-sm transition-colors',
      on ? 'bg-onyx font-medium text-white' : 'border border-onyx/15 text-onyx',
    )

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={() => !busy && onClose()}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-label="Nova marcação"
            onSubmit={(e) => {
              e.preventDefault()
              if (canSubmit && !busy) void submit()
            }}
            className="relative flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-t-[12px] bg-[var(--ios-bg)] shadow-2xl sm:rounded-[14px]"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 ios-bar ios-hairline-b px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="min-w-20 text-left text-[17px] text-[var(--ios-tint)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <h2 className="font-subtitle text-base font-semibold text-onyx">Nova marcação</h2>
              <button
                type="submit"
                disabled={busy || !canSubmit}
                className="min-w-20 text-right text-[17px] font-semibold text-[var(--ios-tint)] disabled:opacity-30"
              >
                {busy ? 'A guardar…' : 'Guardar'}
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5">
              {error && (
                <p role="alert" className="rounded-xl bg-red-700/10 px-4 py-3 font-subtitle text-sm text-red-700">
                  {error}
                </p>
              )}

              {/* Who. */}
              <section>
                <h3 className={section}>Cliente</h3>
                {!presetCustomer && (
                  <div
                    className="mb-2.5 grid grid-cols-2 rounded-[9px] bg-[var(--ios-fill)] p-[2px]"
                    role="tablist"
                    aria-label="Cliente"
                  >
                    {(
                      [
                        ['existing', 'Já é cliente'],
                        ['new', 'Nova cliente'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={mode === id}
                        onClick={() => setMode(id)}
                        className={cn(
                          'h-9 rounded-[9px] font-subtitle text-sm',
                          mode === id
                            ? 'bg-white font-medium text-onyx shadow-sm shadow-black/10 dark:bg-onyx/[0.14]'
                            : 'text-onyx/55',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {mode === 'new' ? (
                  <div className={group}>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      placeholder="Nome"
                      aria-label="Nome"
                      autoComplete="off"
                      className={`${plain} h-[52px] px-4`}
                    />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      type="tel"
                      maxLength={30}
                      placeholder="Telemóvel"
                      aria-label="Telemóvel"
                      className={`${plain} h-[52px] px-4`}
                    />
                  </div>
                ) : picked ? (
                  <div className={`${group} flex items-center gap-3 px-4 py-3`}>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx font-subtitle text-sm font-semibold text-white">
                      {picked.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-subtitle text-[15px] font-medium text-onyx">
                        {picked.name}
                      </span>
                      <span className="block font-subtitle text-xs text-muted-dark">{picked.phone}</span>
                    </span>
                    {!presetCustomer && (
                      <button
                        type="button"
                        onClick={() => setPicked(null)}
                        className="font-subtitle text-sm text-onyx/60"
                      >
                        Mudar
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={group}>
                    <label className="flex items-center gap-2 px-4">
                      <i className="bx bx-search text-lg text-onyx/40" aria-hidden="true" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Nome ou telemóvel"
                        aria-label="Pesquisar cliente"
                        className={`${plain} h-[52px]`}
                      />
                    </label>
                    {matches.length === 0 ? (
                      <p className="px-4 py-3 font-subtitle text-sm text-muted-dark">
                        Nenhuma cliente encontrada.{' '}
                        <button
                          type="button"
                          onClick={() => setMode('new')}
                          className="text-onyx underline underline-offset-4"
                        >
                          Criar nova
                        </button>
                      </p>
                    ) : (
                      matches.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setPicked(c)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-onyx/[0.04]"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-onyx/10 font-subtitle text-xs font-semibold text-onyx">
                            {c.name.trim().charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-subtitle text-sm font-medium text-onyx">{c.name}</span>
                            <span className="block font-subtitle text-xs text-muted-dark">{c.phone}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </section>

              {/* What: the model, its options and the colour. */}
              <section>
                <h3 className={section}>Modelo</h3>
                <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {services
                    .filter((s) => s.active !== false)
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={serviceId === s.id}
                        onClick={() => {
                          setServiceId(s.id)
                          setLength('')
                          setParting('')
                        }}
                        className={cn(
                          'flex shrink-0 flex-col items-start rounded-2xl px-4 py-2.5 text-left transition-colors',
                          serviceId === s.id ? 'bg-onyx text-white' : 'border border-onyx/15 text-onyx',
                        )}
                      >
                        <span className="whitespace-nowrap font-subtitle text-sm font-medium">{s.name}</span>
                        <span className="whitespace-nowrap font-subtitle text-xs opacity-60">
                          {servicePriceLabel(s)}
                        </span>
                      </button>
                    ))}
                </div>
                {[
                  ['Comprimento', options.lengths, length, setLength] as const,
                  ['Repartição', options.partings, parting, setParting] as const,
                ].map(([label, values, value, set]) =>
                  values.length ? (
                    <div key={label} className="mt-3">
                      <p className="mb-1.5 px-1 font-subtitle text-xs text-muted-dark">{label}</p>
                      <div className="flex flex-wrap gap-2">
                        {values.map((v) => (
                          <button key={v} type="button" onClick={() => set(v)} className={chip(value === v)}>
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
                <div className="mt-3">
                  <p className="mb-1.5 px-1 font-subtitle text-xs text-muted-dark">
                    Cor {color ? `· ${color} ${BRAID_COLORS.find((c) => c.code === color)?.name ?? ''}` : '(opcional)'}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {BRAID_COLORS.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        aria-label={`Cor ${c.code} · ${c.name}`}
                        aria-pressed={color === c.code}
                        onClick={() => setColor(color === c.code ? '' : c.code)}
                        className={cn(
                          'size-9 rounded-full ring-offset-2 ring-offset-white transition-shadow',
                          color === c.code ? 'ring-2 ring-onyx' : 'ring-1 ring-onyx/15',
                        )}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </section>

              {/* When: a free slot in one tap, or any date and time. */}
              <section>
                <h3 className={section}>Quando</h3>
                {freeSlots.length > 0 && (
                  <>
                    <p className="mb-1.5 px-1 font-subtitle text-xs text-muted-dark">Vagas livres</p>
                    <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {freeSlots.map((sl) => {
                        const at = new Date(sl.startsAt)
                        const d = localDateValue(at)
                        const t = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
                        const on = d === date && t === time
                        return (
                          <button
                            key={sl.id}
                            type="button"
                            onClick={() => {
                              setDate(d)
                              setTime(t)
                            }}
                            className={cn(
                              'flex shrink-0 flex-col items-center rounded-2xl px-3.5 py-2 transition-colors',
                              on ? 'bg-onyx text-white' : 'border border-onyx/15 text-onyx',
                            )}
                          >
                            <span className="font-subtitle text-[11px] capitalize opacity-70">
                              {at.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric' })}
                            </span>
                            <span className="font-subtitle text-sm font-semibold lining-nums">{t}</span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
                <div className={group}>
                  <DateTimeRow
                    label="Data"
                    type="date"
                    value={date}
                    display={date ? date.split('-').reverse().join('/') : 'Escolher'}
                    onChange={setDate}
                  />
                  <DateTimeRow label="Hora" type="time" value={time} display={time || 'Escolher'} onChange={setTime} />
                </div>
              </section>

              <section>
                <h3 className={section}>Nota</h3>
                <div className={group}>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Opcional: algo a lembrar para esta sessão"
                    aria-label="Nota"
                    className={`${plain} resize-none px-4 py-3 leading-snug`}
                  />
                </div>
              </section>

              {/* What will be saved, in one line. */}
              {service && (
                <div className="rounded-2xl border border-onyx/10 p-4">
                  <p className="font-subtitle text-xs uppercase tracking-[0.14em] text-muted-dark">Resumo</p>
                  <p className="mt-1 font-subtitle text-[15px] font-medium text-onyx">
                    {[service.name, length, parting].filter(Boolean).join(' · ')}
                    {price !== null && (
                      <span className="text-muted-dark"> · {formatPrice(price).replace(/,00/, '')}</span>
                    )}
                  </p>
                  <p className="font-subtitle text-sm capitalize text-muted-dark">{whenLabel}</p>
                  {missing.length > 0 ? (
                    <p className="mt-2 font-subtitle text-xs font-medium text-red-700">Falta: {missing.join(', ')}.</p>
                  ) : (
                    <p className="mt-2 font-subtitle text-xs text-muted-dark">
                      Fica confirmada logo e o horário deixa de estar livre para as clientes.
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  )
}
