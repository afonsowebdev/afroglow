import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useTransform } from 'motion/react'
import { ArrowRight, CalendarPlus, Check, Clock, CalendarDays, Search, UserRound, X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { formatPrice, type AvailabilitySlot, type Service } from '@/lib/types'
import type { AdminCustomer } from '@/pages/admin/admin-types'
import { choiceComplete, optionsOf, priceFor, servicePriceLabel } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import { BRAID_COLORS } from '@/lib/braid-colors'
import { success, tap } from '@/lib/haptics'
import { useScrollLock } from '@/lib/use-scroll-lock'
import { serviceImageUrls } from '@/lib/service-images'

const CARD = 'bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_20px_-12px_rgba(0,0,0,0.18)]'
/** The raised white pill of a chosen option (the iPhone's segmented control), and the plain look of the others. */
const RAISED = 'bg-card font-semibold text-onyx shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)]'
const FLAT = 'bg-onyx/[0.05] text-onyx/70'

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
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
        {type === 'date' ? <CalendarDays size={15} /> : <Clock size={15} />}
      </span>
      <span className="flex-1 font-subtitle text-[15px] text-onyx">{label}</span>
      <span className="font-subtitle text-[15px] font-semibold lining-nums tabular-nums text-onyx">{display}</span>
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
 * Adds a confirmed booking by hand: for clients who book by WhatsApp, Instagram or in person. A sheet in the iPhone's
 * look, rising from the bottom on a light grey with white cards: who (an existing client or a name and phone; no account
 * needed), the model with its options and the hair colour as swatches, when (the free slots of the next days in one tap,
 * or any date and time) and a note. At the bottom, one white pill says what will be saved (or what is missing) and saves.
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
  presetCustomer?: AdminCustomer | null
  /** A free time picked before opening (on the Início), already chosen. */
  presetStartsAt?: string | null
  /** The agenda's slots: the free ones in the next days are offered as one-tap times. */
  slots?: AvailabilitySlot[]
  onClose: () => void
  onDone: () => void
}) {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [mode, setMode] = useState<'new' | 'existing'>('existing')
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
  const [color, setColor] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The page behind stays still; the sheet is pulled down by its top (the rest scrolls) and the dim fades as it goes.
  useScrollLock(open)
  const drag = useDragControls()
  const pull = useMotionValue(0)
  const dim = useTransform(pull, [0, 320], [1, 0])

  useEffect(() => {
    if (!open) return
    pull.set(0)
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
    // Only when it opens (or its presets change): the dashboard refreshes every few seconds and hands new lists, which
    // must not wipe what is being filled in.
  }, [open, presetCustomer, presetStartsAt, pull])

  // A model chosen from the start, and a new one if the chosen one is gone after a refresh.
  useEffect(() => {
    if (!open) return
    setServiceId((current) =>
      services.some((s) => s.id === current && s.active !== false) ? current : services.find((s) => s.active !== false)?.id || '',
    )
  }, [open, services])

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
      void success()
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
  const whenDay = chosenAt
    ? chosenAt.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', '')
    : ''
  const whenLabel = whenDay ? `${whenDay.charAt(0).toUpperCase()}${whenDay.slice(1)} · ${time}` : ''

  const label = 'mb-2 px-1 font-subtitle text-[12px] font-semibold text-muted-dark'
  const plain = 'field-plain block w-full min-w-0 bg-transparent font-subtitle text-[15px] text-onyx outline-none placeholder:text-onyx/35'
  const pill = (on: boolean) => cn('h-9 shrink-0 rounded-full px-4 font-subtitle text-[13px] transition-[background-color,box-shadow]', on ? RAISED : FLAT)
  const initial = (n: string) => n.trim().charAt(0).toUpperCase()
  const close = () => !busy && onClose()
  const activeServices = services.filter((s) => s.active !== false)

  return (
    <AnimatePresence>
      {open && (
        <div className="app-neutral fixed inset-0 z-[90] flex items-end justify-center sm:items-center" data-no-pull>
          <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="absolute inset-0" style={{ opacity: dim }}>
              <button type="button" aria-label="Fechar" onClick={close} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            </motion.div>
          </motion.div>
          <motion.div
            className="relative w-full max-w-md"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%', transition: { type: 'spring', stiffness: 300, damping: 34 } }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
          >
            <motion.form
              role="dialog"
              aria-modal="true"
              aria-label="Nova marcação"
              onSubmit={(e) => {
                e.preventDefault()
                if (canSubmit && !busy) void submit()
              }}
              className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[30px] bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))] shadow-2xl sm:rounded-[30px]"
              style={{ y: pull }}
              // Pulled by its top only, so the fields scroll freely: down far enough or quickly closes, back up stays.
              drag="y"
              dragControls={drag}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0.06, bottom: 1 }}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                const goingUp = info.velocity.y < -50
                if (!busy && !goingUp && (info.offset.y > 130 || info.velocity.y > 650)) onClose()
                else animate(pull, 0, { type: 'spring', stiffness: 420, damping: 34 })
              }}
            >
              {/* The top: the handle and the title; pull it down to close. */}
              <div className="shrink-0 touch-none px-5 pb-3 pt-2.5" onPointerDown={(e) => drag.start(e)}>
                <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-onyx/15" aria-hidden="true" />
                <div className="flex items-center gap-3">
                  <span className="glass-chip flex size-11 shrink-0 items-center justify-center rounded-full text-onyx">
                    <CalendarPlus size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-subtitle text-[19px] font-semibold tracking-tight text-onyx">Nova marcação</h2>
                    <p className="truncate font-subtitle text-xs text-muted-dark">Fica confirmada logo, sem conta.</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Fechar"
                    onClick={close}
                    onPointerDown={(e) => e.stopPropagation()}
                    disabled={busy}
                    className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full text-onyx"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 pb-4 pt-1">
                {error && (
                  <p
                    role="alert"
                    className="rounded-2xl px-4 py-3 font-subtitle text-sm text-onyx"
                    style={{ background: 'color-mix(in srgb, var(--c-cancelled) 12%, transparent)' }}
                  >
                    {error}
                  </p>
                )}

                {/* Who. */}
                <section>
                  <p className={label}>Cliente</p>
                  {!presetCustomer && !picked && (
                    <div className="mb-2.5 grid grid-cols-2 rounded-full bg-onyx/[0.06] p-1" role="tablist" aria-label="Cliente">
                      {(
                        [
                          ['existing', 'Já é cliente'],
                          ['new', 'Nova cliente'],
                        ] as const
                      ).map(([id, text]) => (
                        <button
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={mode === id}
                          onClick={() => setMode(id)}
                          className={cn(
                            'h-9 rounded-full font-subtitle text-[13px] transition-[background-color,box-shadow]',
                            mode === id ? RAISED : 'text-muted-dark',
                          )}
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  )}
                  {mode === 'new' ? (
                    <div className={`divide-y divide-onyx/[0.07] overflow-hidden rounded-[22px] ${CARD}`}>
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
                    <div className={`flex items-center gap-3 rounded-[22px] px-4 py-3 ${CARD}`}>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx/[0.06] font-subtitle text-sm font-semibold text-onyx">
                        {initial(picked.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-subtitle text-[15px] font-semibold text-onyx">{picked.name}</span>
                        <span className="block font-subtitle text-xs text-muted-dark">{picked.phone}</span>
                      </span>
                      {presetCustomer ? (
                        <Check size={18} className="shrink-0" style={{ color: 'var(--c-confirmed)' }} />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPicked(null)}
                          className="glass-chip h-8 shrink-0 rounded-full px-3.5 font-subtitle text-[12px] font-semibold text-onyx"
                        >
                          Mudar
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className={`divide-y divide-onyx/[0.07] overflow-hidden rounded-[22px] ${CARD}`}>
                      <label className="flex items-center gap-2.5 px-4">
                        <Search size={17} className="shrink-0 text-muted-dark" />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Nome ou telemóvel"
                          aria-label="Pesquisar cliente"
                          className={`${plain} h-[52px]`}
                        />
                      </label>
                      {matches.length === 0 ? (
                        <div className="flex items-center gap-3 px-4 py-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-muted-dark">
                            <UserRound size={16} />
                          </span>
                          <span className="flex-1 font-subtitle text-[13px] text-muted-dark">
                            {customers.length ? 'Nenhuma cliente encontrada.' : 'Ainda sem clientes.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setMode('new')
                              if (/\d/.test(search)) setPhone(search.trim())
                              else setName(search.trim())
                            }}
                            className="glass-chip h-8 shrink-0 rounded-full px-3.5 font-subtitle text-[12px] font-semibold text-onyx"
                          >
                            Criar nova
                          </button>
                        </div>
                      ) : (
                        matches.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              void tap()
                              setPicked(c)
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-onyx/[0.04]"
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-onyx/[0.06] font-subtitle text-xs font-semibold text-onyx">
                              {initial(c.name)}
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

                {/* What: the models as a list with their photo, the chosen one ticked; its options and the colour below it. */}
                <section>
                  <p className={label}>Modelo</p>
                  <div className={`overflow-hidden rounded-[22px] ${CARD}`}>
                    <div role="radiogroup" aria-label="Modelo" className="divide-y divide-onyx/[0.07]">
                      {activeServices.map((s) => {
                        const on = serviceId === s.id
                        const photo = serviceImageUrls(s)[0]
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => {
                              if (on) return
                              void tap()
                              setServiceId(s.id)
                              setLength('')
                              setParting('')
                            }}
                            className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors', on && 'bg-onyx/[0.03]')}
                          >
                            {photo ? (
                              <img src={photo} alt="" loading="lazy" className="size-11 shrink-0 rounded-[14px] bg-onyx/[0.05] object-cover" />
                            ) : (
                              <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-onyx/[0.05] font-subtitle text-sm font-semibold text-onyx">
                                {initial(s.name)}
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className={cn('block truncate font-subtitle text-[15px] text-onyx', on ? 'font-semibold' : 'font-medium')}>
                                {s.name}
                              </span>
                              <span className="block truncate font-subtitle text-[12px] text-muted-dark">
                                {[servicePriceLabel(s), s.durationLabel].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                            {/* The iPhone's tick: a green filled circle when chosen, an empty ring otherwise. */}
                            <span
                              className={cn(
                                'flex size-6 shrink-0 items-center justify-center rounded-full transition-colors',
                                on ? 'text-white' : 'shadow-[inset_0_0_0_1.5px_rgba(0,0,0,0.18)] dark:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.25)]',
                              )}
                              style={on ? { background: 'var(--c-confirmed)' } : undefined}
                            >
                              {on && <Check size={14} strokeWidth={3} />}
                            </span>
                          </button>
                        )
                      })}
                      {activeServices.length === 0 && (
                        <p className="px-4 py-4 font-subtitle text-[13px] text-muted-dark">Ainda não há modelos ativos nos Serviços.</p>
                      )}
                    </div>

                    {/* Options of the chosen model: a segmented control when they fit, chips otherwise. */}
                    {[
                      ['Comprimento', options.lengths, length, setLength] as const,
                      ['Repartição', options.partings, parting, setParting] as const,
                    ].map(([title, values, value, set]) =>
                      values.length ? (
                        <div key={title} className="border-t border-onyx/[0.07] px-3 pb-3 pt-2.5">
                          <p className="mb-2 px-1 font-subtitle text-[12px] text-muted-dark">
                            {title}
                            {!value && <span className="text-onyx/40"> · escolher</span>}
                          </p>
                          {values.length <= 4 ? (
                            <div
                              className="grid rounded-full bg-onyx/[0.06] p-1"
                              style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}
                              role="radiogroup"
                              aria-label={title}
                            >
                              {values.map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  role="radio"
                                  aria-checked={value === v}
                                  onClick={() => set(v)}
                                  className={cn(
                                    'h-9 truncate rounded-full px-2 font-subtitle text-[13px] transition-[background-color,box-shadow]',
                                    value === v ? RAISED : 'text-muted-dark',
                                  )}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {values.map((v) => (
                                <button key={v} type="button" onClick={() => set(v)} className={pill(value === v)}>
                                  {v}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null,
                    )}

                    <div className="border-t border-onyx/[0.07] px-3 pb-3.5 pt-2.5">
                      <p className="mb-2 px-1 font-subtitle text-[12px] text-muted-dark">
                        Cor{' '}
                        {color ? (
                          <span className="font-semibold text-onyx">
                            · {color} {BRAID_COLORS.find((c) => c.code === color)?.name ?? ''}
                          </span>
                        ) : (
                          '(opcional)'
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2.5 px-1">
                        {BRAID_COLORS.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            aria-label={`Cor ${c.code} · ${c.name}`}
                            aria-pressed={color === c.code}
                            onClick={() => setColor(color === c.code ? '' : c.code)}
                            className={cn(
                              'size-9 rounded-full ring-offset-2 ring-offset-card transition-shadow',
                              color === c.code ? 'ring-2 ring-onyx/70' : 'ring-1 ring-onyx/15',
                            )}
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* When: a free slot in one tap, or any date and time. */}
                <section>
                  <p className={label}>Quando</p>
                  {freeSlots.length > 0 && (
                    <div className="-mx-4 mb-2.5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {freeSlots.map((sl) => {
                        const at = new Date(sl.startsAt)
                        const d = localDateValue(at)
                        const t = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
                        const on = d === date && t === time
                        return (
                          <button
                            key={sl.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              void tap()
                              setDate(d)
                              setTime(t)
                            }}
                            className={cn(
                              'flex shrink-0 flex-col items-center rounded-2xl px-3.5 py-2 transition-[background-color,box-shadow]',
                              on ? RAISED : 'glass-chip text-onyx',
                            )}
                          >
                            <span className="font-subtitle text-[11px] font-normal capitalize text-muted-dark">
                              {at.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric' }).replace('.', '')}
                            </span>
                            <span className="flex items-center gap-1 font-subtitle text-sm font-semibold lining-nums">
                              {on && <span className="size-1.5 rounded-full" style={{ background: 'var(--c-confirmed)' }} />}
                              {t}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <div className={`divide-y divide-onyx/[0.07] overflow-hidden rounded-[22px] ${CARD}`}>
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
                  <p className={label}>Nota</p>
                  <div className={`overflow-hidden rounded-[22px] ${CARD}`}>
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
              </div>

              {/* The button says what will be saved (or what is still missing): a white pill, the arrow in a round chip. */}
              <div className="shrink-0 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]">
                <button
                  type="submit"
                  disabled={busy || !canSubmit}
                  className={`flex h-14 w-full items-center gap-3 rounded-full pe-2 ps-5 text-left transition-transform active:scale-[0.98] disabled:opacity-60 ${CARD}`}
                >
                  <CalendarPlus size={19} className="shrink-0 text-onyx" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-subtitle text-[15px] font-semibold leading-tight text-onyx">
                      {busy
                        ? 'A marcar…'
                        : service
                          ? [service.name, length, parting].filter(Boolean).join(' · ') +
                            (price !== null ? ` · ${formatPrice(price).replace(/,00/, '')}` : '')
                          : 'Escolhe o modelo'}
                    </span>
                    <span className="block truncate font-subtitle text-[12px] text-muted-dark">
                      {missing.length > 0 ? `Falta ${missing.join(', ')}` : whenLabel}
                    </span>
                  </span>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
                    <ArrowRight size={18} />
                  </span>
                </button>
              </div>
            </motion.form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
