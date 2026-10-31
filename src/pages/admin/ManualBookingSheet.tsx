import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useTransform } from 'motion/react'
import { ArrowRight, CalendarPlus, Check, ChevronLeft, Clock, CalendarDays, Search, UserPlus, X } from 'lucide-react'
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
const STEPS = ['Cliente', 'Modelo', 'Quando', 'Confirmar'] as const
const EASE = [0.22, 1, 0.36, 1] as const

function localDateValue(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

const hhmm = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

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
 * look that goes step by step, one thing per screen, with a progress bar under the title: who (an existing client or a
 * name and phone; no account needed), the model with its options and the hair colour, when (a day from a strip with its
 * free times, or any date and time) and a last look at it all as a ticket, with a note, before confirming.
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
  const [step, setStep] = useState(0)
  // Which way the steps slide: forward from the right, back from the left.
  const [dir, setDir] = useState(1)
  const [mode, setMode] = useState<'new' | 'existing'>('existing')
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<AdminCustomer | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
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
    setDir(1)
    if (presetStartsAt) {
      const at = new Date(presetStartsAt)
      setDate(localDateValue(at))
      setTime(hhmm(at))
    } else {
      setDate(localDateValue(new Date()))
      setTime('')
    }
    setLength('')
    setParting('')
    setColor('')
    setMode('existing')
    setPicked(presetCustomer ?? null)
    setName('')
    setPhone('')
    // A client already chosen: straight to the model.
    setStep(presetCustomer ? 1 : 0)
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

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers.slice(0, 6)
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')))
      .slice(0, 6)
  }, [customers, search])

  const activeServices = services.filter((s) => s.active !== false)
  const hasClient = mode === 'existing' ? Boolean(picked) : name.trim().length >= 2 && phone.trim().length >= 6
  const service = services.find((s) => s.id === serviceId)
  const options = service ? optionsOf(service) : { lengths: [], partings: [], hasOptions: false }
  const price = service ? priceFor(service, length || null, parting || null) : null
  const modelDone = Boolean(serviceId) && (!service || choiceComplete(service, length || null, parting || null))
  const whenDone = Boolean(date) && Boolean(time)
  const canSubmit = hasClient && modelDone && whenDone

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

  // The free times of the next days, by day, for the strip and its times.
  const freeByDay = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const sl of slots) {
      if (sl.status !== 'OPEN' || new Date(sl.startsAt).getTime() <= Date.now()) continue
      const at = new Date(sl.startsAt)
      const key = localDateValue(at)
      map.set(key, [...(map.get(key) ?? []), hhmm(at)].sort())
    }
    return map
  }, [slots])
  const days = useMemo(() => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    return Array.from({ length: 21 }, (_, i) => new Date(today.getTime() + i * 864e5))
  }, [])
  const dayTimes = freeByDay.get(date) ?? []
  // Arriving at Quando with nothing chosen: the first day with a free time, and its first time.
  useEffect(() => {
    if (step !== 2 || time) return
    const first = [...freeByDay.keys()].sort()[0]
    if (first) {
      setDate(first)
      setTime(freeByDay.get(first)![0])
    }
  }, [step, time, freeByDay])

  const chosenAt = whenDone ? new Date(`${date}T${time}:00`) : null
  const whenDay = chosenAt
    ? chosenAt.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }).replace('.', '')
    : ''
  const clientName = mode === 'existing' ? picked?.name ?? '' : name.trim()
  const clientPhone = mode === 'existing' ? picked?.phone ?? '' : phone.trim()
  const colorInfo = BRAID_COLORS.find((c) => c.code === color)

  // What the button says on each step: what is still missing, or what comes next.
  const ready = [hasClient, modelDone, whenDone, canSubmit][step]
  const hint = [
    hasClient ? clientName : mode === 'existing' ? 'Escolhe uma cliente' : 'Escreve o nome e o telemóvel',
    modelDone
      ? [service?.name, length, parting].filter(Boolean).join(' · ')
      : !serviceId
        ? 'Escolhe o modelo'
        : `Falta ${[options.lengths.length && !length && 'o comprimento', options.partings.length && !parting && 'a repartição'].filter(Boolean).join(' e ')}`,
    whenDone ? `${whenDay.charAt(0).toUpperCase()}${whenDay.slice(1)} · ${time}` : 'Escolhe a hora',
    price !== null ? formatPrice(price).replace(/,00/, '') : '',
  ][step]

  const go = (to: number) => {
    void tap()
    setDir(to > step ? 1 : -1)
    setError(null)
    setStep(to)
  }
  const next = () => {
    if (!ready || busy) return
    if (step < 3) go(step + 1)
    else void submit()
  }

  const label = 'mb-2 px-1 font-subtitle text-[12px] font-semibold text-muted-dark'
  const plain = 'field-plain block w-full min-w-0 bg-transparent font-subtitle text-[15px] text-onyx outline-none placeholder:text-onyx/35'
  const pill = (on: boolean) => cn('h-9 shrink-0 rounded-full px-4 font-subtitle text-[13px] transition-[background-color,box-shadow]', on ? RAISED : FLAT)
  const initial = (n: string) => n.trim().charAt(0).toUpperCase()
  const close = () => !busy && onClose()

  /** The iPhone's tick: a green filled circle when chosen, an empty ring otherwise. */
  const tick = (on: boolean) => (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full',
        on ? 'text-white' : 'shadow-[inset_0_0_0_1.5px_rgba(0,0,0,0.18)] dark:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.25)]',
      )}
      style={on ? { background: 'var(--c-confirmed)' } : undefined}
    >
      {on && <Check size={14} strokeWidth={3} />}
    </span>
  )

  const clientStep = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 rounded-full bg-onyx/[0.06] p-1" role="tablist" aria-label="Cliente">
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
            className={cn('h-9 rounded-full font-subtitle text-[13px] transition-[background-color,box-shadow]', mode === id ? RAISED : 'text-muted-dark')}
          >
            {text}
          </button>
        ))}
      </div>

      {mode === 'new' ? (
        <div>
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
          <p className="mt-2 px-1 font-subtitle text-[12px] text-muted-dark">Fica guardada nas Clientes; não precisa de conta.</p>
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
          {matches.map((c) => {
            const on = picked?.id === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setPicked(c)
                  // Chosen: on to the model.
                  setDir(1)
                  setStep(1)
                  void tap()
                }}
                className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left', on && 'bg-onyx/[0.03]')}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-onyx/[0.06] font-subtitle text-xs font-semibold text-onyx">
                  {initial(c.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-subtitle text-sm font-medium text-onyx">{c.name}</span>
                  <span className="block font-subtitle text-xs text-muted-dark">{c.phone}</span>
                </span>
                {tick(on)}
              </button>
            )
          })}
          {matches.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setMode('new')
                if (/\d/.test(search)) setPhone(search.trim())
                else setName(search.trim())
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
                <UserPlus size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-subtitle text-sm font-medium text-onyx">Criar nova cliente</span>
                <span className="block truncate font-subtitle text-xs text-muted-dark">
                  {customers.length ? `Ninguém com "${search.trim()}"` : 'Ainda sem clientes'}
                </span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-muted-dark" />
            </button>
          )}
        </div>
      )}
    </div>
  )

  const modelStep = (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Modelo" className={`divide-y divide-onyx/[0.07] overflow-hidden rounded-[22px] ${CARD}`}>
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
                <img src={photo} alt="" loading="lazy" className="size-12 shrink-0 rounded-[14px] bg-onyx/[0.05] object-cover" />
              ) : (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-onyx/[0.05] font-subtitle text-sm font-semibold text-onyx">
                  {initial(s.name)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate font-subtitle text-[15px] text-onyx', on ? 'font-semibold' : 'font-medium')}>{s.name}</span>
                <span className="block truncate font-subtitle text-[12px] text-muted-dark">
                  {[servicePriceLabel(s), s.durationLabel].filter(Boolean).join(' · ')}
                </span>
              </span>
              {tick(on)}
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
          <section key={title}>
            <p className={label}>{title}</p>
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
          </section>
        ) : null,
      )}

      <section>
        <p className={label}>
          Cor{' '}
          {colorInfo ? (
            <span className="text-onyx">
              · {colorInfo.code} {colorInfo.name}
            </span>
          ) : (
            <span className="font-normal">(opcional)</span>
          )}
        </p>
        <div className={`flex flex-wrap gap-2.5 rounded-[22px] p-3 ${CARD}`}>
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
      </section>
    </div>
  )

  const whenStep = (
    <div className="flex flex-col gap-4">
      {/* The next three weeks as a strip: a green dot under the days with free times. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((d) => {
          const key = localDateValue(d)
          const on = key === date
          const free = freeByDay.get(key)?.length ?? 0
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => {
                void tap()
                setDate(key)
                // A time that is free that day stays; otherwise the first free one, or none.
                const times = freeByDay.get(key) ?? []
                if (!times.includes(time)) setTime(times[0] ?? '')
              }}
              className={cn(
                'flex w-[3.4rem] shrink-0 flex-col items-center gap-0.5 rounded-[18px] py-2.5 transition-[background-color,box-shadow]',
                on ? RAISED : FLAT,
              )}
            >
              <span className="font-subtitle text-[11px] font-normal capitalize text-muted-dark">
                {d.toLocaleDateString('pt-PT', { weekday: 'short' }).replace('.', '').slice(0, 3)}
              </span>
              <span className="font-subtitle text-[18px] font-semibold leading-tight lining-nums">{d.getDate()}</span>
              <span className="size-1.5 rounded-full" style={{ background: free ? 'var(--c-confirmed)' : 'transparent' }} />
            </button>
          )
        })}
      </div>

      <section>
        <p className={label}>
          {dayTimes.length
            ? `${dayTimes.length} ${dayTimes.length === 1 ? 'vaga livre' : 'vagas livres'}`
            : 'Sem vagas livres neste dia'}
        </p>
        {dayTimes.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {dayTimes.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={t === time}
                onClick={() => {
                  void tap()
                  setTime(t)
                }}
                className={cn(
                  'h-11 rounded-full font-subtitle text-[14px] lining-nums transition-[background-color,box-shadow]',
                  t === time ? RAISED : `${FLAT} font-medium`,
                )}
              >
                {t}
              </button>
            ))}
          </div>
        ) : (
          <p className="px-1 font-subtitle text-[13px] text-muted-dark">Podes marcar a qualquer hora abaixo.</p>
        )}
      </section>

      <section>
        <p className={label}>Outra data ou hora</p>
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
    </div>
  )

  // A last look, as a ticket: each part can be tapped to go back and change it.
  const confirmStep = (
    <div className="flex flex-col gap-4">
      <div className={`overflow-hidden rounded-[24px] ${CARD}`}>
        <div className="px-5 pb-4 pt-5 text-center">
          <p className="font-subtitle text-[12px] font-semibold text-muted-dark">{whenDay.charAt(0).toUpperCase() + whenDay.slice(1)}</p>
          <p className="mt-0.5 font-subtitle text-[40px] font-semibold leading-none tracking-tight text-onyx lining-nums">{time}</p>
          {price !== null && <p className="mt-2 font-subtitle text-[15px] font-semibold text-onyx">{formatPrice(price).replace(/,00/, '')}</p>}
        </div>
        {/* The tear line of a ticket. */}
        <div className="relative h-0 border-t border-dashed border-onyx/15">
          <span className="absolute -left-2.5 -top-2.5 size-5 rounded-full bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]" />
          <span className="absolute -right-2.5 -top-2.5 size-5 rounded-full bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]" />
        </div>
        <div className="divide-y divide-onyx/[0.07]">
          {(
            [
              [0, 'Cliente', clientName, clientPhone],
              [1, 'Modelo', [service?.name, length, parting].filter(Boolean).join(' · '), colorInfo ? `Cor ${colorInfo.code} · ${colorInfo.name}` : 'Sem cor escolhida'],
              [2, 'Quando', `${whenDay.charAt(0).toUpperCase() + whenDay.slice(1)}`, `às ${time}`],
            ] as const
          ).map(([to, title, main, sub]) => (
            <button key={title} type="button" onClick={() => go(to)} className="flex w-full items-center gap-3 px-5 py-3 text-left">
              <span className="w-16 shrink-0 font-subtitle text-[12px] text-muted-dark">{title}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-subtitle text-[14px] font-semibold text-onyx">{main}</span>
                <span className="block truncate font-subtitle text-[12px] text-muted-dark">{sub}</span>
              </span>
              <span className="shrink-0 font-subtitle text-[12px] font-medium text-muted-dark">Mudar</span>
            </button>
          ))}
        </div>
      </div>

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
      <p className="px-1 text-center font-subtitle text-[12px] text-muted-dark">
        Fica confirmada logo e o horário deixa de estar livre para as clientes.
      </p>
    </div>
  )

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
                next()
              }}
              className="relative flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-[30px] bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))] shadow-2xl sm:rounded-[30px]"
              style={{ y: pull }}
              // Pulled by its top only, so the steps scroll freely: down far enough or quickly closes, back up stays.
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
              {/* The top: the handle, back (or the icon), the title with the step, X, and the progress. */}
              <div className="shrink-0 touch-none px-5 pb-4 pt-2.5" onPointerDown={(e) => drag.start(e)}>
                <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-onyx/15" aria-hidden="true" />
                <div className="flex items-center gap-3">
                  {step > 0 ? (
                    <button
                      type="button"
                      aria-label="Voltar"
                      onClick={() => go(step - 1)}
                      onPointerDown={(e) => e.stopPropagation()}
                      disabled={busy}
                      className="glass-chip flex size-11 shrink-0 items-center justify-center rounded-full text-onyx"
                    >
                      <ChevronLeft size={20} className="-translate-x-[1px]" />
                    </button>
                  ) : (
                    <span className="glass-chip flex size-11 shrink-0 items-center justify-center rounded-full text-onyx">
                      <CalendarPlus size={18} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-subtitle text-[19px] font-semibold tracking-tight text-onyx">Nova marcação</h2>
                    <p className="truncate font-subtitle text-xs text-muted-dark">
                      Passo {step + 1} de {STEPS.length} · {STEPS[step]}
                    </p>
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
                <div className="mt-4 grid grid-cols-4 gap-1.5" aria-hidden="true">
                  {STEPS.map((s, i) => (
                    <span key={s} className="h-1 overflow-hidden rounded-full bg-onyx/[0.08]">
                      <motion.span
                        className="block h-full rounded-full bg-onyx/70"
                        initial={false}
                        animate={{ width: i <= step ? '100%' : '0%' }}
                        transition={{ duration: 0.45, ease: EASE }}
                      />
                    </span>
                  ))}
                </div>
              </div>

              {/* The steps, sliding in the way they go. */}
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <AnimatePresence initial={false} custom={dir}>
                  <motion.div
                    key={step}
                    custom={dir}
                    variants={{
                      enter: (d: number) => ({ x: `${d * 100}%`, opacity: 0.4 }),
                      center: { x: 0, opacity: 1 },
                      exit: (d: number) => ({ x: `${d * -35}%`, opacity: 0 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.42, ease: EASE }}
                    className="absolute inset-0 overflow-y-auto overscroll-contain px-4 pb-4 pt-0.5"
                  >
                    {error && (
                      <p
                        role="alert"
                        className="mb-4 rounded-2xl px-4 py-3 font-subtitle text-sm text-onyx"
                        style={{ background: 'color-mix(in srgb, var(--c-cancelled) 12%, transparent)' }}
                      >
                        {error}
                      </p>
                    )}
                    {[clientStep, modelStep, whenStep, confirmStep][step]}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* The button: what was chosen in this step (or what is missing), and on to the next; the last one books. */}
              <div className="shrink-0 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]">
                <button
                  type="submit"
                  disabled={busy || !ready}
                  className={`flex h-14 w-full items-center gap-3 rounded-full pe-2 ps-5 text-left transition-[transform,opacity] active:scale-[0.98] disabled:opacity-60 ${CARD}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-subtitle text-[15px] font-semibold leading-tight text-onyx">
                      {busy ? 'A marcar…' : step === 3 ? 'Confirmar marcação' : 'Continuar'}
                    </span>
                    {hint && <span className="block truncate font-subtitle text-[12px] text-muted-dark">{hint}</span>}
                  </span>
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors',
                      step === 3 && ready ? 'text-white' : 'bg-onyx/[0.05] text-onyx',
                    )}
                    style={step === 3 && ready ? { background: 'var(--c-confirmed)' } : undefined}
                  >
                    {step === 3 ? <Check size={18} strokeWidth={2.6} /> : <ArrowRight size={18} />}
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
