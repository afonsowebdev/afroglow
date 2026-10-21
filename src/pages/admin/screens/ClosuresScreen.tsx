import { useCallback, useEffect, useState } from 'react'
import { CalendarCheck2, Plus } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAdmin } from '../admin-context'
import { addDaysKey, dateParts, dayTitle, longDate, plural, shortDate, todayKey } from '../format'
import {
  ActionSheet,
  BarButton,
  Cell,
  DateCell,
  EmptyState,
  IOSSheet,
  InputCell,
  Screen,
  Section,
  Segmented,
  TextAreaCell,
  useToast,
} from '../ios'
import type { Closure } from './AgendaScreen'

interface Preview {
  openSlots: number
  bookings: Array<{ id: string; customerName: string; serviceName: string; status: 'PENDING' | 'ACCEPTED'; startsAt: string }>
}

const REASONS = ['Férias', 'Feriado', 'Folga', 'Formação', 'Doença']

function daysBetween(start: string, end: string) {
  return Math.round((new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86_400_000) + 1
}

function rangeLabel(c: Closure) {
  return c.startDate === c.endDate ? longDate(c.startDate) : `${shortDate(c.startDate)} – ${shortDate(c.endDate)}`
}

/** Holidays, days off and vacations: close days in one go and decide what happens to what was booked on them. */
export function ClosuresScreen({ backLabel }: { backLabel: string }) {
  const { pop, reload } = useAdmin()
  const toast = useToast()
  const [data, setData] = useState<{ current: Closure[]; past: Closure[] } | null>(null)
  const [creating, setCreating] = useState(false)
  const [start, setStart] = useState(todayKey())
  const [end, setEnd] = useState(todayKey())
  const [reason, setReason] = useState('')
  const [handling, setHandling] = useState<'KEEP' | 'CANCEL'>('KEEP')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState<Closure | null>(null)

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

  // What closing these days would touch, refreshed as the dates change.
  useEffect(() => {
    if (!creating || end < start) return
    setPreview(null)
    const timer = setTimeout(() => {
      api
        .get<Preview>(`/admin/closures/preview?start=${start}&end=${end}`)
        .then(setPreview)
        .catch(() => {})
    }, 250)
    return () => clearTimeout(timer)
  }, [creating, start, end])

  function openNew() {
    const today = todayKey()
    setStart(today)
    setEnd(today)
    setReason('')
    setHandling('KEEP')
    setMessage('')
    setCreating(true)
  }

  async function save() {
    setBusy(true)
    try {
      const result = await api.post<{ removedSlots: number; cancelledBookings: number; keptBookings: number }>('/admin/closures', {
        startDate: start,
        endDate: end,
        reason: reason.trim(),
        bookings: handling,
        message: handling === 'CANCEL' && message.trim() ? message.trim() : undefined,
      })
      setCreating(false)
      toast(
        result.cancelledBookings
          ? `Fechado · ${plural(result.cancelledBookings, 'marcação cancelada', 'marcações canceladas')}`
          : `Fechado · ${plural(result.removedSlots, 'horário removido', 'horários removidos')}`,
      )
      await Promise.all([load(), reload()])
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível fechar estes dias.', true)
    } finally {
      setBusy(false)
    }
  }

  async function reopen(closure: Closure) {
    try {
      await api.delete(`/admin/closures/${closure.id}`)
      toast('Dias reabertos. Abre horários na Agenda.')
      await Promise.all([load(), reload()])
    } catch {
      toast('Não foi possível reabrir.', true)
    }
  }

  const affected = preview?.bookings ?? []
  const today = todayKey()

  return (
    <Screen title="Dias fechados" back={{ label: backLabel, onClick: pop }} trailing={<BarButton label="Fechar dias" Icon={Plus} onClick={openNew} />}>
      {data === null ? (
        <p className="py-10 text-center text-[15px] text-[var(--ios-secondary)]">A carregar…</p>
      ) : (
        <>
          {data.current.length === 0 ? (
            <EmptyState
              Icon={CalendarCheck2}
              title="Sempre aberto"
              text="Fecha um dia ou umas férias de uma vez: os horários livres saem e ninguém consegue marcar nesses dias."
              action={{ label: 'Fechar dias', onClick: openNew }}
            />
          ) : (
            <Section header="A seguir" footer="Toca para reabrir. Os horários removidos não voltam sozinhos: abre-os na Agenda.">
              {data.current.map((c) => (
                <Cell
                  key={c.id}
                  title={rangeLabel(c)}
                  subtitle={[
                    c.reason,
                    c.startDate <= today ? 'a decorrer' : `daqui a ${plural(daysBetween(today, c.startDate) - 1, 'dia', 'dias')}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  detail={plural(daysBetween(c.startDate, c.endDate), 'dia', 'dias')}
                  onClick={() => setMenu(c)}
                  accessory="none"
                />
              ))}
            </Section>
          )}
          {data.past.length > 0 && (
            <Section header="Anteriores">
              {data.past.map((c) => (
                <Cell key={c.id} title={rangeLabel(c)} subtitle={c.reason || undefined} detail={plural(daysBetween(c.startDate, c.endDate), 'dia', 'dias')} />
              ))}
            </Section>
          )}
        </>
      )}

      <IOSSheet
        open={creating}
        title="Fechar dias"
        onClose={() => setCreating(false)}
        busy={busy}
        done={{ label: 'Fechar', onClick: () => void save(), disabled: end < start }}
      >
        <Section footer={end < start ? 'O último dia não pode ser antes do primeiro.' : `${plural(daysBetween(start, end), 'dia', 'dias')} fechado${daysBetween(start, end) === 1 ? '' : 's'}.`}>
          <DateCell
            label="De"
            type="date"
            value={start}
            min={today}
            display={longDate(start)}
            onChange={(v) => {
              if (!v) return
              setStart(v)
              if (end < v) setEnd(v)
            }}
          />
          <DateCell label="Até" type="date" value={end} min={start} display={longDate(end)} onChange={(v) => v && setEnd(v)} />
        </Section>
        <div className="mt-3 flex flex-wrap gap-2 px-4">
          {[
            ['Só hoje', 0, 0],
            ['Amanhã', 1, 1],
            ['Uma semana', 0, 6],
            ['Duas semanas', 0, 13],
          ].map(([label, from, to]) => (
            <button
              key={label as string}
              type="button"
              onClick={() => {
                setStart(addDaysKey(today, from as number))
                setEnd(addDaysKey(today, to as number))
              }}
              className="h-8 rounded-full bg-[var(--ios-fill)] px-3.5 text-[15px] text-[var(--ios-tint)] active:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>

        <Section header="Motivo">
          <InputCell value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder="Ex.: Férias de Natal (opcional)" />
        </Section>
        <div className="mt-2 flex flex-wrap gap-2 px-4">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className="h-8 rounded-full bg-[var(--ios-fill)] px-3.5 text-[15px] active:opacity-50"
            >
              {r}
            </button>
          ))}
        </div>

        <Section header="O que acontece">
          <Cell
            title={preview ? plural(preview.openSlots, 'horário livre sai', 'horários livres saem') : 'A verificar…'}
            subtitle="Deixam de aparecer às clientes."
          />
          <Cell
            title={preview ? (affected.length ? plural(affected.length, 'marcação nestes dias', 'marcações nestes dias') : 'Nenhuma marcação nestes dias') : '…'}
          />
          {affected.map((b) => (
            <Cell
              key={b.id}
              title={b.customerName}
              subtitle={`${b.serviceName} · ${dayTitle(b.startsAt)} às ${dateParts(b.startsAt).time}${b.status === 'PENDING' ? ' · pedido' : ''}`}
            />
          ))}
        </Section>

        {affected.length > 0 && (
          <>
            <Section flush header="As marcações já feitas">
              <Segmented
                value={handling}
                onChange={setHandling}
                options={[
                  { value: 'KEEP', label: 'Manter' },
                  { value: 'CANCEL', label: 'Cancelar e avisar' },
                ]}
              />
            </Section>
            {handling === 'CANCEL' ? (
              <Section footer="Cada cliente recebe esta mensagem numa notificação (e por email, se era um pedido).">
                <TextAreaCell
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder={`O estúdio está fechado nesse dia${reason ? ` (${reason})` : ''}. Desculpa! Marca outro dia na app.`}
                />
              </Section>
            ) : (
              <p className="mx-8 mt-2 text-[13px] text-[var(--ios-secondary)]">Ficam como estão: trata delas na Agenda ou em Pedidos.</p>
            )}
          </>
        )}
      </IOSSheet>

      <ActionSheet
        open={menu !== null}
        title={menu ? `${rangeLabel(menu)}${menu.reason ? ` · ${menu.reason}` : ''}` : undefined}
        onClose={() => setMenu(null)}
        actions={menu ? [{ label: 'Reabrir estes dias', destructive: true, onClick: () => void reopen(menu) }] : []}
      />
    </Screen>
  )
}
