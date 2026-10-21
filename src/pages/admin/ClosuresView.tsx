import { useCallback, useEffect, useState } from 'react'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { api, ApiError } from '@/lib/api'
import { addDays, chip, dayTime, Empty, group, longDay, Notice, pillButton, plural, Row, Section, Segment, shortDay, todayKey } from './admin-ui'

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
 * opened again, and can cancel what was already booked on them (telling the clients).
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

  return (
    <section className="mt-6">
      {notice && <Notice text={notice} onClose={() => setNotice(null)} />}

      <div className="flex items-end justify-between gap-4">
        <p className="font-subtitle text-sm text-muted-dark">Folgas, feriados e férias: ninguém consegue marcar nesses dias.</p>
        <button type="button" onClick={openNew} className={pillButton}>
          <i className="bx bx-plus text-lg" aria-hidden="true" />
          Fechar dias
        </button>
      </div>

      {data === null ? (
        <p className="mt-6 font-subtitle text-muted-dark">A carregar...</p>
      ) : data.current.length === 0 ? (
        <Empty icon="bx bx-calendar-check" title="Sempre aberto" text="Não há dias fechados marcados. Usa “Fechar dias” para uma folga ou umas férias." />
      ) : (
        <Section title="A seguir" className="mt-6" note="Ao reabrir, os horários removidos não voltam sozinhos: abre-os em Horários.">
          <div className={group}>
            {data.current.map((c) => (
              <Row
                key={c.id}
                icon="bx bx-calendar-x"
                title={range(c)}
                text={[c.reason, plural(days(c.startDate, c.endDate), 'dia', 'dias'), c.startDate <= today ? 'a decorrer' : null]
                  .filter(Boolean)
                  .join(' · ')}
                right={
                  <button
                    type="button"
                    onClick={() => (confirmId === c.id ? void reopen(c.id) : setConfirmId(c.id))}
                    onBlur={() => setConfirmId(null)}
                    className={`shrink-0 rounded-full px-3 py-1.5 font-subtitle text-xs ${
                      confirmId === c.id ? 'bg-red-600 font-medium text-[#ffffff]' : 'glass-chip text-onyx'
                    }`}
                  >
                    {confirmId === c.id ? 'Confirmar' : 'Reabrir'}
                  </button>
                }
              />
            ))}
          </div>
        </Section>
      )}

      {data && data.past.length > 0 && (
        <Section title="Anteriores" className="mt-6">
          <div className={group}>
            {data.past.map((c) => (
              <Row key={c.id} title={range(c)} text={[c.reason, plural(days(c.startDate, c.endDate), 'dia', 'dias')].filter(Boolean).join(' · ')} />
            ))}
          </div>
        </Section>
      )}

      <Sheet
        open={open}
        title="Fechar dias"
        description="Os horários livres saem e ninguém consegue marcar nestes dias."
        icon="bx bx-calendar-x"
        busy={busy}
        error={error}
        submitLabel="Fechar"
        submitDisabled={end < start}
        onSubmit={() => void save()}
        onClose={() => setOpen(false)}
      >
        <div className="grid grid-cols-2 gap-3">
          <SheetField label="De">
            <input
              type="date"
              value={start}
              min={today}
              onChange={(e) => {
                const v = e.target.value
                if (!v) return
                setStart(v)
                if (end < v) setEnd(v)
              }}
              className={sheetFieldClass}
            />
          </SheetField>
          <SheetField label="Até">
            <input type="date" value={end} min={start} onChange={(e) => e.target.value && setEnd(e.target.value)} className={sheetFieldClass} />
          </SheetField>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['Só hoje', 0, 0],
              ['Amanhã', 1, 1],
              ['Uma semana', 0, 6],
              ['Duas semanas', 0, 13],
            ] as const
          ).map(([label, from, to]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setStart(addDays(today, from))
                setEnd(addDays(today, to))
              }}
              className={chip}
            >
              {label}
            </button>
          ))}
        </div>

        <SheetField label="Motivo (opcional)">
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder="Ex.: Férias de Natal" className={sheetFieldClass} />
        </SheetField>
        <div className="-mt-2 flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className={chip}>
              {r}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-onyx/5 px-4 py-3 font-subtitle text-sm text-onyx">
          {end < start ? (
            'O último dia não pode ser antes do primeiro.'
          ) : !preview ? (
            'A verificar…'
          ) : (
            <>
              <p>
                {plural(days(start, end), 'dia fechado', 'dias fechados')} · {plural(preview.openSlots, 'horário livre sai', 'horários livres saem')}.
              </p>
              {affected.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-dark">
                  {affected.map((b) => (
                    <li key={b.id}>
                      {b.customerName} · {b.serviceName} · {dayTime(b.startsAt)}
                      {b.status === 'PENDING' ? ' (pedido)' : ''}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {affected.length > 0 && (
          <>
            <SheetField label={`As ${affected.length === 1 ? 'marcação' : 'marcações'} já feitas`}>
              <Segment
                value={handling}
                onChange={setHandling}
                options={[
                  ['KEEP', 'Manter'],
                  ['CANCEL', 'Cancelar e avisar'],
                ]}
              />
            </SheetField>
            {handling === 'CANCEL' && (
              <SheetField label="Mensagem às clientes">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder={`O estúdio está fechado nesse dia${reason ? ` (${reason})` : ''}. Marca outro dia na app.`}
                  className={`${sheetFieldClass} resize-none`}
                />
              </SheetField>
            )}
          </>
        )}
      </Sheet>
    </section>
  )
}
