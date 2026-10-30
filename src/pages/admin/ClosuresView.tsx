import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CalendarCheck, CalendarX2, Check, X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { tap } from '@/lib/haptics'
import { useScrollLock } from '@/lib/use-scroll-lock'
import { addDays, dayTime, longDay, plural, shortDay, todayKey } from './admin-ui'

/** The soft shadow of the Painel's cards. */
const CARD_SHADOW = 'var(--card-shadow)'
const label = 'mb-2 px-1 font-subtitle text-[12px] font-semibold text-muted-dark'

interface Closure {
  id: string
  startDate: string
  endDate: string
  reason: string
}

interface Preview {
  openSlots: number
  bookings: Array<{ id: string; customerName: string; serviceName: string; status: 'PENDING' | 'ACCEPTED'; startsAt: string }>
}

const REASONS = ['Férias', 'Feriado', 'Folga', 'Formação']

const days = (start: string, end: string) =>
  Math.round((new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86_400_000) + 1
const range = (c: Closure) => (c.startDate === c.endDate ? longDay(c.startDate) : `${shortDay(c.startDate)} – ${shortDay(c.endDate)}`)

/**
 * Holidays, days off and vacations: closing days in one go removes their free times, keeps them from being booked or
 * opened again, and can cancel what was already booked on them (telling the clients). In the Painel's style: white
 * cards with its shadow, and the closing done in a sheet like Abrir semanas.
 */
export function ClosuresView({ onChanged }: { onChanged: () => void }) {
  const [data, setData] = useState<{ current: Closure[]; past: Closure[] } | null>(null)
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState(todayKey())
  const [end, setEnd] = useState(todayKey())
  const [reason, setReason] = useState('')
  const [handling, setHandling] = useState<'KEEP' | 'CANCEL'>('KEEP')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useScrollLock(open)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy])

  const load = useCallback(async () => {
    try {
      setData(await api.get<{ current: Closure[]; past: Closure[] }>('/admin/closures'))
    } catch {
      setData({ current: [], past: [] })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!open || end < start) return
    setPreview(null)
    const timer = setTimeout(() => {
      api
        .get<Preview>(`/admin/closures/preview?start=${start}&end=${end}`)
        .then(setPreview)
        .catch(() => {})
    }, 250)
    return () => clearTimeout(timer)
  }, [open, start, end])

  function openNew() {
    setStart(todayKey())
    setEnd(todayKey())
    setReason('')
    setHandling('KEEP')
    setMessage('')
    setError(null)
    setOpen(true)
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const result = await api.post<{ removedSlots: number; cancelledBookings: number }>('/admin/closures', {
        startDate: start,
        endDate: end,
        reason: reason.trim(),
        bookings: handling,
        message: handling === 'CANCEL' && message.trim() ? message.trim() : undefined,
      })
      setOpen(false)
      setNotice(
        `Dias fechados: ${plural(result.removedSlots, 'horário removido', 'horários removidos')}${
          result.cancelledBookings ? `, ${plural(result.cancelledBookings, 'marcação cancelada', 'marcações canceladas')}` : ''
        }.`,
      )
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível fechar estes dias.')
    } finally {
      setBusy(false)
    }
  }

  async function reopen(id: string) {
    try {
      await api.delete(`/admin/closures/${id}`)
      setNotice('Dias reabertos. Abre os horários em Horários.')
      await load()
      onChanged()
    } catch {
      setNotice('Não foi possível reabrir.')
    }
  }

  const affected = preview?.bookings ?? []
  const today = todayKey()
  const count = end < start ? 0 : days(start, end)
  const weekdayDay = (key: string) =>
    new Date(`${key}T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
  const quick = [
    ['Só hoje', 0, 0],
    ['Amanhã', 1, 1],
    ['Uma semana', 0, 6],
    ['Duas semanas', 0, 13],
  ] as const

  return (
    <section className="mt-6">
      {notice && (
        <div className="mb-4 flex items-start gap-3 rounded-[22px] bg-card p-4" style={{ boxShadow: CARD_SHADOW }}>
          <Check size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--c-confirmed)' }} />
          <p className="flex-1 font-subtitle text-sm text-onyx">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso" className="text-muted-dark">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Closing days: one plain white button, like Abrir semanas. */}
      <button
        type="button"
        onClick={() => {
          void tap()
          openNew()
        }}
        className="flex h-16 w-full items-center gap-3 rounded-full bg-card pe-2.5 ps-5 text-left transition-transform active:scale-[0.98]"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <CalendarX2 size={20} className="shrink-0 text-onyx" />
        <span className="min-w-0 flex-1">
          <span className="block font-subtitle text-[15px] font-semibold leading-tight text-onyx">Fechar dias</span>
          <span className="block truncate font-subtitle text-[12px] text-muted-dark">Folga, feriado ou férias: ninguém marca nesses dias</span>
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
          <ArrowRight size={18} />
        </span>
      </button>

      {data === null ? (
        <p className="mt-6 px-1 font-subtitle text-sm text-muted-dark">A carregar…</p>
      ) : data.current.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-[22px] bg-card px-6 py-10 text-center" style={{ boxShadow: CARD_SHADOW }}>
          <span className="glass-chip flex size-16 items-center justify-center rounded-full text-onyx">
            <CalendarCheck size={26} />
          </span>
          <p className="mt-5 font-subtitle text-xl font-semibold tracking-tight text-onyx">Sempre aberto</p>
          <p className="mt-1.5 max-w-xs font-subtitle text-sm text-muted-dark">Não há dias fechados marcados. Usa “Fechar dias” para uma folga ou umas férias.</p>
        </div>
      ) : (
        <>
          <h3 className="mb-2.5 mt-7 px-1 font-subtitle text-[15px] font-semibold tracking-tight text-onyx">A seguir</h3>
          <ul className="flex flex-col gap-2.5">
            {data.current.map((c) => {
              const [, m, d] = c.startDate.split('-')
              const now = c.startDate <= today
              const confirming = confirmId === c.id
              return (
                <li key={c.id} className="flex items-center gap-3.5 rounded-[22px] bg-card p-3.5" style={{ boxShadow: CARD_SHADOW }}>
                  {/* The first day as a small calendar leaf. */}
                  <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-onyx/[0.04]">
                    <p className="tabular font-subtitle text-[17px] font-semibold leading-none text-onyx">{Number(d)}</p>
                    <p className="mt-0.5 font-subtitle text-[10px] uppercase text-muted-dark">{shortDay(`2000-${m}-01`).split(' ')[1]}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-subtitle text-[15px] font-semibold text-onyx">{range(c)}</p>
                    <p className="flex items-center gap-1.5 truncate font-subtitle text-xs text-muted-dark">
                      {now && <span className="size-1.5 shrink-0 rounded-full" style={{ background: 'var(--c-waiting)' }} aria-hidden="true" />}
                      {[c.reason, plural(days(c.startDate, c.endDate), 'dia', 'dias'), now ? 'a decorrer' : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void tap()
                      if (confirming) void reopen(c.id)
                      else setConfirmId(c.id)
                    }}
                    onBlur={() => setConfirmId(null)}
                    className={`flex h-9 shrink-0 items-center rounded-full px-3 font-subtitle text-[12px] font-semibold ${confirming ? 'text-[#ffffff]' : 'glass-chip text-onyx'}`}
                    style={confirming ? { background: 'var(--c-cancelled)' } : undefined}
                  >
                    {confirming ? 'Reabrir?' : 'Reabrir'}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-2.5 px-1 font-subtitle text-xs text-muted-dark">Ao reabrir, os horários removidos não voltam sozinhos: abre-os em Horários.</p>
        </>
      )}

      {data && data.past.length > 0 && (
        <>
          <h3 className="mb-2.5 mt-7 px-1 font-subtitle text-[15px] font-semibold tracking-tight text-onyx">Anteriores</h3>
          <div className="overflow-hidden rounded-[22px] bg-card" style={{ boxShadow: CARD_SHADOW }}>
            {data.past.map((c, i) => (
              <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i ? 'border-t border-onyx/[0.06]' : ''}`}>
                <CalendarX2 size={16} className="shrink-0 text-ink-3" />
                <span className="min-w-0 flex-1 truncate font-subtitle text-[14px] text-onyx">{range(c)}</span>
                <span className="shrink-0 font-subtitle text-xs text-muted-dark">
                  {[c.reason, plural(days(c.startDate, c.endDate), 'dia', 'dias')].filter(Boolean).join(' · ')}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* "Fechar dias", in a sheet like Abrir semanas. */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
            <motion.button
              type="button"
              aria-label="Fechar"
              onClick={() => !busy && setOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.form
              role="dialog"
              aria-modal="true"
              aria-label="Fechar dias"
              onSubmit={(e) => {
                e.preventDefault()
                if (!busy && end >= start) void save()
              }}
              className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              <div className="flex items-center gap-3 px-5 pb-3 pt-5">
                <span className="glass-chip flex size-11 shrink-0 items-center justify-center rounded-full text-onyx">
                  <CalendarX2 size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-subtitle text-[19px] font-semibold tracking-tight text-onyx">Fechar dias</h2>
                  <p className="truncate font-subtitle text-xs text-muted-dark">Os horários livres saem e ninguém marca.</p>
                </div>
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full text-onyx"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-4 pt-1">
                {error && (
                  <p role="alert" className="rounded-2xl px-4 py-3 font-subtitle text-sm text-onyx" style={{ background: 'color-mix(in srgb, var(--c-cancelled) 12%, transparent)' }}>
                    {error}
                  </p>
                )}

                {/* When: one tap for the usual ones, or the two days. */}
                <section>
                  <p className={label}>Quando</p>
                  <div className="flex flex-wrap gap-2">
                    {quick.map(([name, from, to]) => {
                      const on = start === addDays(today, from) && end === addDays(today, to)
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            void tap()
                            setStart(addDays(today, from))
                            setEnd(addDays(today, to))
                          }}
                          className={`h-9 rounded-full px-3.5 font-subtitle text-[12px] text-onyx ${on ? 'glass-chip-on font-semibold' : 'glass-chip font-medium'}`}
                        >
                          {name}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {(
                      [
                        ['De', start, today, (v: string) => {
                          setStart(v)
                          if (end < v) setEnd(v)
                        }],
                        ['Até', end, start, (v: string) => setEnd(v)],
                      ] as const
                    ).map(([name, value, min, set]) => (
                      <label key={name} className="glass-chip relative flex h-12 items-center gap-2 rounded-full px-4">
                        <span className="font-subtitle text-[12px] text-muted-dark">{name}</span>
                        <span className="min-w-0 flex-1 truncate text-right font-subtitle text-[14px] font-semibold text-onyx">{weekdayDay(value)}</span>
                        <input
                          type="date"
                          value={value}
                          min={min}
                          onChange={(e) => e.target.value && set(e.target.value)}
                          aria-label={name === 'De' ? 'Primeiro dia' : 'Último dia'}
                          className="absolute inset-0 size-full cursor-pointer opacity-0"
                        />
                      </label>
                    ))}
                  </div>
                </section>

                {/* Why (optional). */}
                <section>
                  <p className={label}>Motivo · opcional</p>
                  <div className="flex flex-wrap gap-2">
                    {REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          void tap()
                          setReason(reason === r ? '' : r)
                        }}
                        className={`h-9 rounded-full px-3.5 font-subtitle text-[12px] text-onyx ${reason === r ? 'glass-chip-on font-semibold' : 'glass-chip font-medium'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <input
                    value={REASONS.includes(reason) ? '' : reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={120}
                    placeholder="Outro motivo, ex.: Férias de Natal"
                    className="glass-chip mt-2.5 h-11 w-full rounded-full !border-0 px-4 font-subtitle text-[14px] text-onyx outline-none placeholder:text-onyx/40"
                  />
                </section>

                {/* What it changes. */}
                <section className="rounded-[20px] bg-onyx/[0.04] px-4 py-3.5 font-subtitle text-sm text-onyx">
                  {end < start ? (
                    'O último dia não pode ser antes do primeiro.'
                  ) : !preview ? (
                    <span className="text-muted-dark">A verificar…</span>
                  ) : (
                    <>
                      <p>
                        <strong className="font-semibold">{plural(count, 'dia fechado', 'dias fechados')}</strong> ·{' '}
                        {plural(preview.openSlots, 'horário livre sai', 'horários livres saem')}
                      </p>
                      {affected.length > 0 && (
                        <ul className="mt-2.5 flex flex-col gap-1.5">
                          {affected.map((b) => (
                            <li key={b.id} className="flex items-center gap-2 text-xs text-muted-dark">
                              <span
                                className="size-1.5 shrink-0 rounded-full"
                                style={{ background: b.status === 'PENDING' ? 'var(--c-waiting)' : 'var(--c-confirmed)' }}
                                aria-hidden="true"
                              />
                              <span className="truncate">
                                <span className="font-semibold text-onyx">{b.customerName}</span> · {b.serviceName} · {dayTime(b.startsAt)}
                                {b.status === 'PENDING' ? ' (pedido)' : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </section>

                {affected.length > 0 && (
                  <section>
                    <p className={label}>{affected.length === 1 ? 'A marcação já feita' : 'As marcações já feitas'}</p>
                    <div className="grid grid-cols-2 rounded-full bg-onyx/[0.06] p-1" role="radiogroup" aria-label="Marcações já feitas">
                      {(
                        [
                          ['KEEP', 'Manter'],
                          ['CANCEL', 'Cancelar e avisar'],
                        ] as const
                      ).map(([id, name]) => (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={handling === id}
                          onClick={() => setHandling(id)}
                          className={`h-9 rounded-full font-subtitle text-[13px] transition-colors ${
                            handling === id
                              ? 'bg-white font-semibold text-onyx shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] dark:bg-onyx/[0.16]'
                              : 'text-muted-dark'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                    {handling === 'CANCEL' && (
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        maxLength={300}
                        placeholder={`O estúdio está fechado nesse dia${reason ? ` (${reason})` : ''}. Marca outro dia na app.`}
                        className="glass-chip mt-2.5 w-full resize-none rounded-[20px] !border-0 px-4 py-3 font-subtitle text-[14px] text-onyx outline-none placeholder:text-onyx/40"
                      />
                    )}
                  </section>
                )}
              </div>

              {/* The button: what it closes. */}
              <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]">
                <button
                  type="submit"
                  disabled={busy || end < start}
                  className="flex h-14 w-full items-center gap-3 rounded-full bg-card pe-2 ps-5 text-left transition-transform active:scale-[0.98] disabled:opacity-45"
                  style={{ boxShadow: CARD_SHADOW }}
                >
                  <CalendarX2 size={19} className="shrink-0 text-onyx" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-subtitle text-[15px] font-semibold leading-tight text-onyx">
                      {busy ? 'A fechar…' : `Fechar ${plural(count, 'dia', 'dias')}`}
                    </span>
                    {end >= start && (
                      <span className="block truncate font-subtitle text-[12px] text-muted-dark">
                        {start === end ? weekdayDay(start) : `${weekdayDay(start)} – ${weekdayDay(end)}`}
                        {handling === 'CANCEL' && affected.length > 0 ? ` · cancela ${plural(affected.length, 'marcação', 'marcações')}` : ''}
                      </span>
                    )}
                  </span>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
                    <ArrowRight size={18} />
                  </span>
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
