import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BottomNavBar } from '@/components/ui/bottom-nav-bar'
import { DatePicker } from '@/components/ui/date-picker'
import { MotionButton } from '@/components/ui/motion-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { adminToken, api, ApiError } from '@/lib/api'
import { registerForPushNotifications } from '@/lib/push-notifications'
import { customerWhatsappUrl } from '@/lib/site-config'
import { formatPrice, type AvailabilitySlot, type Booking, type Service, type Testimonial } from '@/lib/types'

const LISBON_TZ = 'Europe/Lisbon'

function dateKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: LISBON_TZ })
}

// Slots/bookings store UTC timestamps, but the admin thinks in Lisbon-local
// months — resolving via Intl (not a raw UTC range) keeps this consistent
// with the same calculation the backend does for the month-clear endpoint.
function getLisbonYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LISBON_TZ,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date)
  return {
    year: Number(parts.find((p) => p.type === 'year')!.value),
    month: Number(parts.find((p) => p.type === 'month')!.value),
  }
}

function formatMonthLabel(viewMonth: { year: number; month: number }) {
  const label = new Date(viewMonth.year, viewMonth.month - 1, 1).toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatDateTime(iso: string) {
  const label = new Date(iso).toLocaleString('pt-PT', {
    timeZone: LISBON_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function dateParts(iso: string) {
  const d = new Date(iso)
  const tz = { timeZone: LISBON_TZ }
  return {
    day: d.toLocaleDateString('pt-PT', { ...tz, day: 'numeric' }),
    month: d.toLocaleDateString('pt-PT', { ...tz, month: 'short' }).replace('.', ''),
    weekday: d.toLocaleDateString('pt-PT', { ...tz, weekday: 'long' }),
    time: d.toLocaleTimeString('pt-PT', { ...tz, hour: '2-digit', minute: '2-digit' }),
  }
}

const SLOT_TIMES = Array.from({ length: 25 }, (_, i) => {
  const minutes = 8 * 60 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

const SLOT_STATUS_LABEL: Record<AvailabilitySlot['status'], string> = {
  OPEN: 'Disponível',
  PENDING: 'Pendente',
  BOOKED: 'Reservado',
}

const HISTORY_STATUS_LABEL: Record<Booking['status'], string> = {
  PENDING: 'Pendente',
  ACCEPTED: 'Concluída',
  REJECTED: 'Recusada',
  CANCELLED: 'Cancelada',
}

type AdminTab = 'pedidos' | 'agenda' | 'disponibilidade' | 'servicos' | 'testemunhos'

const TABS: Array<{ id: AdminTab; label: string; icon: string }> = [
  { id: 'pedidos', label: 'Pedidos', icon: 'bx bx-bell' },
  { id: 'agenda', label: 'Agenda', icon: 'bx bx-calendar-check' },
  { id: 'disponibilidade', label: 'Horários', icon: 'bx bx-time-five' },
  { id: 'servicos', label: 'Serviços', icon: 'bx bx-cut' },
  { id: 'testemunhos', label: 'Testemunhos', icon: 'bx bx-message-rounded-dots' },
]

function dayHeading(iso: string) {
  const key = dateKey(iso)
  const today = dateKey(new Date().toISOString())
  const tomorrow = dateKey(new Date(Date.now() + 86_400_000).toISOString())
  const { weekday, day, month } = dateParts(iso)
  const base = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${day} ${month}`
  if (key === today) return { title: 'Hoje', sub: base }
  if (key === tomorrow) return { title: 'Amanhã', sub: base }
  return { title: base, sub: '' }
}

const HISTORY_CHIP: Record<Booking['status'], string> = {
  PENDING: 'bg-gold-deep/10 text-gold-deep',
  ACCEPTED: 'bg-gold-deep/10 text-gold-deep',
  REJECTED: 'bg-red-700/10 text-red-700',
  CANCELLED: 'bg-onyx/5 text-muted-dark',
}

function groupByDay(bookings: Booking[]) {
  const groups = new Map<string, Booking[]>()
  for (const booking of bookings) {
    const key = dateKey(booking.slot.startsAt)
    groups.set(key, [...(groups.get(key) ?? []), booking])
  }
  return [...groups.values()]
}

function AgendaView({
  pendingCount,
  confirmedCount,
  revenueCents,
  upcoming,
  history,
  busyId,
  onCancel,
}: {
  pendingCount: number
  confirmedCount: number
  revenueCents: number
  upcoming: Booking[]
  history: Booking[]
  busyId: string | null
  onCancel: (id: string) => void
}) {
  const [view, setView] = useState<'proximas' | 'historico'>('proximas')
  const stats = [
    { icon: 'bx bx-time-five', label: 'Pendentes', value: String(pendingCount) },
    { icon: 'bx bx-calendar-check', label: 'Confirmadas', value: String(confirmedCount) },
    { icon: 'bx bx-euro', label: 'Receita', value: formatPrice(revenueCents) },
  ]

  return (
    <div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gold/20 bg-white p-4 shadow-sm shadow-black/5">
            <i className={`${stat.icon} text-lg text-gold-deep`} aria-hidden="true" />
            <p className="mt-2 font-logo text-xl leading-none text-onyx">{stat.value}</p>
            <p className="mt-1.5 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex rounded-full border border-gold/20 bg-white p-1 shadow-sm shadow-black/5">
        {(
          [
            ['proximas', 'Próximas', upcoming.length],
            ['historico', 'Histórico', history.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className="relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 font-subtitle text-sm"
          >
            {view === id && (
              <motion.span
                layoutId="agenda-segment"
                className="absolute inset-0 rounded-full bg-gold-deep"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={`relative transition-colors ${view === id ? 'text-cream' : 'text-onyx/70'}`}>{label}</span>
            <span
              className={`relative rounded-full px-2 py-0.5 text-[11px] leading-none transition-colors ${
                view === id ? 'bg-cream/20 text-cream' : 'bg-gold-deep/10 text-gold-deep'
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {view === 'proximas' &&
        (upcoming.length === 0 ? (
          <div className="mt-12 flex flex-col items-center text-center">
            <i className="bx bx-calendar text-5xl text-gold-deep/40" aria-hidden="true" />
            <p className="mt-3 font-subtitle text-base text-onyx">Sem sessões marcadas</p>
            <p className="mt-1 font-subtitle text-sm text-muted-dark">
              As sessões confirmadas deste mês aparecem aqui.
            </p>
          </div>
        ) : (
          groupByDay(upcoming).map((dayBookings) => {
            const heading = dayHeading(dayBookings[0].slot.startsAt)
            return (
              <section key={dateKey(dayBookings[0].slot.startsAt)} className="mt-7">
                <div className="flex items-baseline gap-3">
                  <h3 className="font-logo text-lg text-onyx">{heading.title}</h3>
                  {heading.sub && <span className="font-subtitle text-xs text-muted-dark">{heading.sub}</span>}
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {dayBookings.map((booking) => (
                    <article
                      key={booking.id}
                      className="flex overflow-hidden rounded-2xl border border-gold/20 bg-white shadow-sm shadow-black/5"
                    >
                      <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-gold/20 bg-gold-deep/5 py-4">
                        <span className="font-logo text-xl leading-none text-onyx">
                          {dateParts(booking.slot.startsAt).time}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-subtitle text-base font-semibold text-onyx">
                              {booking.customerName}
                            </p>
                            <p className="mt-0.5 font-subtitle text-sm text-muted-dark">
                              {booking.service.name} · {formatPrice(booking.service.priceCents)}
                            </p>
                          </div>
                          <a
                            href={customerWhatsappUrl(
                              booking.customerPhone,
                              `Olá ${booking.customerName}! Sobre a tua sessão de ${booking.service.name}...`,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`WhatsApp de ${booking.customerName}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/20 text-lg text-onyx transition-colors hover:border-gold-deep hover:text-gold-deep"
                          >
                            <i className="bx bxl-whatsapp" aria-hidden="true" />
                          </a>
                        </div>
                        {booking.notes && (
                          <p className="mt-2 rounded-lg bg-gold-deep/5 px-3 py-2 font-subtitle text-xs italic text-muted-dark">
                            "{booking.notes}"
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="font-subtitle text-xs text-muted-dark">{booking.customerPhone}</span>
                          <button
                            type="button"
                            disabled={busyId === booking.id}
                            onClick={() => onCancel(booking.id)}
                            className="font-subtitle text-sm text-muted-dark underline-offset-4 transition-colors hover:text-red-700 hover:underline disabled:opacity-50"
                          >
                            Cancelar sessão
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })
        ))}

      {view === 'historico' &&
        (history.length === 0 ? (
          <div className="mt-12 flex flex-col items-center text-center">
            <i className="bx bx-history text-5xl text-gold-deep/40" aria-hidden="true" />
            <p className="mt-3 font-subtitle text-base text-onyx">Sem histórico</p>
            <p className="mt-1 font-subtitle text-sm text-muted-dark">As sessões passadas aparecem aqui.</p>
          </div>
        ) : (
          <div className="mt-6 divide-y divide-gold/15 overflow-hidden rounded-2xl border border-gold/20 bg-white shadow-sm shadow-black/5">
            {history.map((booking) => {
              const { day, month, time } = dateParts(booking.slot.startsAt)
              return (
                <div key={booking.id} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="w-12 shrink-0 text-center">
                    <p className="font-logo text-lg leading-none text-onyx">{day}</p>
                    <p className="mt-1 font-subtitle text-[10px] uppercase text-muted-dark">{month}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-subtitle text-sm font-semibold text-onyx">{booking.customerName}</p>
                    <p className="truncate font-subtitle text-xs text-muted-dark">
                      {booking.service.name} · {time}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 font-subtitle text-[11px] ${HISTORY_CHIP[booking.status]}`}
                  >
                    {HISTORY_STATUS_LABEL[booking.status]}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
    </div>
  )
}

function ClearMonthDialog({
  open,
  monthLabel,
  summary,
  password,
  onPasswordChange,
  acknowledged,
  onAcknowledgedChange,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean
  monthLabel: string
  summary: { slotCount: number; bookingCount: number } | null
  password: string
  onPasswordChange: (value: string) => void
  acknowledged: boolean
  onAcknowledgedChange: (value: boolean) => void
  busy: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}) {
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  const canConfirm = acknowledged && password.length > 0 && !busy

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
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Limpar dados de ${monthLabel}`}
            className="relative w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-700/10 text-xl text-red-700">
                <i className="bx bx-trash" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-logo text-xl text-onyx">Limpar {monthLabel}</h2>
                <p className="mt-1 font-subtitle text-sm text-muted-dark">
                  Apaga os horários e as marcações deste mês. Esta ação é permanente.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: 'Vagas a apagar', value: summary?.slotCount },
                { label: 'Marcações a apagar', value: summary?.bookingCount },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-red-700/20 bg-red-700/5 p-4">
                  <p className="font-logo text-2xl leading-none text-red-700">{item.value ?? '…'}</p>
                  <p className="mt-1.5 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 rounded-xl bg-gold-deep/5 px-4 py-3 font-subtitle text-xs leading-relaxed text-muted-dark">
              Inclui marcações já aceites. As clientes <strong>não recebem nenhum aviso</strong> e o histórico deste mês
              desaparece.
            </p>

            <label className="mt-5 block">
              <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                Confirma com a tua password
              </span>
              <span className="relative block">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gold/30 bg-white px-3 py-2.5 pr-11 font-subtitle text-sm text-onyx outline-none focus-visible:border-red-700"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Esconder password' : 'Mostrar password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted-dark"
                >
                  <i className={`bx ${showPassword ? 'bx-hide' : 'bx-show'}`} aria-hidden="true" />
                </button>
              </span>
            </label>

            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => onAcknowledgedChange(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-red-700"
              />
              <span className="font-subtitle text-sm text-onyx">Compreendo que não pode ser desfeito.</span>
            </label>

            {error && <p className="mt-3 font-subtitle text-sm text-red-700">{error}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-full border border-gold/30 py-3 font-subtitle text-sm text-onyx transition-colors hover:border-gold-deep disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!canConfirm}
                className="rounded-full bg-red-700 py-3 font-subtitle text-sm text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {busy ? 'A apagar...' : 'Apagar tudo'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

interface ServiceFormState {
  id: string | null
  name: string
  description: string
  duration: string
  price: string
}

function ServiceDialog({
  form,
  busy,
  error,
  onChange,
  onSave,
  onClose,
}: {
  form: ServiceFormState | null
  busy: boolean
  error: string | null
  onChange: (form: ServiceFormState) => void
  onSave: () => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!form) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [form, busy, onClose])

  const isNew = form?.id === null
  const fieldClass =
    'w-full rounded-xl border border-gold/30 bg-white px-3 py-2.5 font-subtitle text-sm text-onyx outline-none placeholder:text-onyx/30 focus-visible:border-gold-deep'

  return (
    <AnimatePresence>
      {form && (
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
            aria-label={isNew ? 'Novo modelo' : 'Editar modelo'}
            onSubmit={(e) => {
              e.preventDefault()
              onSave()
            }}
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-deep/10 text-xl text-gold-deep">
                <i className={`bx ${isNew ? 'bx-plus' : 'bx-pencil'}`} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-logo text-xl text-onyx">{isNew ? 'Novo modelo' : 'Editar modelo'}</h2>
                <p className="mt-0.5 font-subtitle text-sm text-muted-dark">
                  {isNew ? 'Aparece no site assim que guardares.' : 'As alterações aparecem logo no site.'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <label>
                <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">Nome</span>
                <input
                  value={form.name}
                  onChange={(e) => onChange({ ...form, name: e.target.value })}
                  placeholder="Ex: Twist Braids"
                  maxLength={80}
                  className={fieldClass}
                />
              </label>
              <label>
                <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                  Descrição
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) => onChange({ ...form, description: e.target.value })}
                  placeholder="Breve descrição para as clientes"
                  maxLength={300}
                  rows={3}
                  className={`${fieldClass} resize-none`}
                />
                <span className="mt-1 block text-right font-subtitle text-[11px] text-muted-dark">
                  {form.description.length}/300
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                    Duração
                  </span>
                  <input
                    value={form.duration}
                    onChange={(e) => onChange({ ...form, duration: e.target.value })}
                    placeholder="Ex: 3-5h"
                    maxLength={40}
                    className={fieldClass}
                  />
                </label>
                <label>
                  <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                    Preço
                  </span>
                  <span className="relative block">
                    <input
                      value={form.price}
                      onChange={(e) => onChange({ ...form, price: e.target.value })}
                      inputMode="decimal"
                      placeholder="65"
                      className={`${fieldClass} pr-8`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-subtitle text-sm text-muted-dark">
                      €
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {error && <p className="mt-4 font-subtitle text-sm text-red-700">{error}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-full border border-gold/30 py-3 font-subtitle text-sm text-onyx transition-colors hover:border-gold-deep disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-gold-deep py-3 font-subtitle text-sm text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  )
}

interface ServiceUsage {
  total: number
  active: number
  history: number
  activeBookings: Array<{ id: string; customerName: string; status: 'PENDING' | 'ACCEPTED'; startsAt: string }>
}

function DeleteServiceDialog({
  service,
  usage,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  service: Service | null
  usage: ServiceUsage | null
  busy: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!service) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [service, busy, onClose])

  const blocked = (usage?.active ?? 0) > 0
  const canConfirm = usage !== null && !blocked && !busy

  return (
    <AnimatePresence>
      {service && (
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
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Eliminar ${service.name}`}
            className="relative w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-700/10 text-xl text-red-700">
                <i className="bx bx-trash" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-logo text-xl text-onyx">Eliminar {service.name}?</h2>
                <p className="mt-1 font-subtitle text-sm text-muted-dark">
                  O modelo deixa de aparecer no site e as clientes já não o podem escolher.
                </p>
              </div>
            </div>

            <div className="mt-5">
              {usage === null ? (
                !error && <p className="font-subtitle text-sm text-muted-dark">A verificar marcações...</p>
              ) : blocked ? (
                <div className="rounded-xl border border-red-700/20 bg-red-700/5 p-4">
                  <p className="font-subtitle text-sm text-red-700">
                    Tem <strong>{usage.active}</strong> {usage.active === 1 ? 'marcação ativa' : 'marcações ativas'} que
                    ainda não aconteceram. Resolve-as primeiro:
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {usage.activeBookings.map((booking) => (
                      <li
                        key={booking.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 font-subtitle text-sm"
                      >
                        <span className="min-w-0 truncate text-onyx">{booking.customerName}</span>
                        <span className="shrink-0 text-xs text-muted-dark">
                          {booking.status === 'PENDING' ? 'Pendente' : 'Confirmada'} ·{' '}
                          {formatDateTime(booking.startsAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {usage.active > usage.activeBookings.length && (
                    <p className="mt-2 font-subtitle text-xs text-muted-dark">
                      e mais {usage.active - usage.activeBookings.length}...
                    </p>
                  )}
                  <p className="mt-3 font-subtitle text-xs text-muted-dark">
                    As pendentes estão na aba <strong>Pedidos</strong> (recusar) e as confirmadas na{' '}
                    <strong>Agenda</strong> (cancelar sessão).
                  </p>
                </div>
              ) : usage.history > 0 ? (
                <p className="rounded-xl bg-gold-deep/5 px-4 py-3 font-subtitle text-sm text-muted-dark">
                  Também serão apagadas <strong>{usage.history}</strong>{' '}
                  {usage.history === 1 ? 'marcação antiga' : 'marcações antigas'} (histórico) deste modelo. Não pode ser
                  desfeito.
                </p>
              ) : (
                <p className="rounded-xl bg-gold-deep/5 px-4 py-3 font-subtitle text-sm text-muted-dark">
                  Este modelo não tem marcações. Não pode ser desfeito.
                </p>
              )}
            </div>

            {error && <p className="mt-3 font-subtitle text-sm text-red-700">{error}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-full border border-gold/30 py-3 font-subtitle text-sm text-onyx transition-colors hover:border-gold-deep disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!canConfirm}
                className="rounded-full bg-red-700 py-3 font-subtitle text-sm text-[#ffffff] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {busy ? 'A eliminar...' : 'Eliminar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function timeAgo(iso: string) {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (days === 0) return 'Hoje'
  const label = new Intl.RelativeTimeFormat('pt-PT', { numeric: 'auto' }).format(days, 'day')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function TestimonialsView({
  testimonials,
  busyId,
  onDecision,
}: {
  testimonials: Testimonial[]
  busyId: string | null
  onDecision: (id: string, decision: 'approve' | 'reject') => void
}) {
  const [view, setView] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const byStatus = (status: Testimonial['status']) =>
    testimonials
      .filter((t) => t.status === status)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const lists = { PENDING: byStatus('PENDING'), APPROVED: byStatus('APPROVED'), REJECTED: byStatus('REJECTED') }
  const current = lists[view]

  const tabs = [
    { id: 'PENDING', label: 'Por rever' },
    { id: 'APPROVED', label: 'Publicados' },
    { id: 'REJECTED', label: 'Recusados' },
  ] as const

  const emptyText = {
    PENDING: ['bx bx-message-rounded-check', 'Tudo revisto', 'Não há testemunhos à espera de decisão.'],
    APPROVED: ['bx bx-message-rounded-dots', 'Nada publicado', 'Os testemunhos aprovados aparecem no site.'],
    REJECTED: ['bx bx-message-rounded-x', 'Nenhum recusado', 'Os testemunhos recusados ficam aqui.'],
  }[view]

  return (
    <div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {tabs.map((tab) => (
          <div key={tab.id} className="rounded-2xl border border-gold/20 bg-white p-4 shadow-sm shadow-black/5">
            <p className="font-logo text-2xl leading-none text-onyx">{lists[tab.id].length}</p>
            <p className="mt-1.5 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">{tab.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex rounded-full border border-gold/20 bg-white p-1 shadow-sm shadow-black/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className="relative flex-1 rounded-full py-2.5 font-subtitle text-xs sm:text-sm"
          >
            {view === tab.id && (
              <motion.span
                layoutId="testimonials-segment"
                className="absolute inset-0 rounded-full bg-gold-deep"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={`relative transition-colors ${view === tab.id ? 'text-cream' : 'text-onyx/70'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {current.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <i className={`${emptyText[0]} text-5xl text-gold-deep/40`} aria-hidden="true" />
          <p className="mt-3 font-subtitle text-base text-onyx">{emptyText[1]}</p>
          <p className="mt-1 font-subtitle text-sm text-muted-dark">{emptyText[2]}</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {current.map((testimonial) => (
            <article
              key={testimonial.id}
              className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm shadow-black/5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-deep/10 font-logo text-lg text-gold-deep">
                  {testimonial.customer.name.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-subtitle text-base font-semibold text-onyx">
                    {testimonial.customer.name}
                  </p>
                  <p className="font-subtitle text-xs text-muted-dark">{timeAgo(testimonial.createdAt)}</p>
                </div>
                {view !== 'PENDING' && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 font-subtitle text-[11px] ${
                      view === 'APPROVED' ? 'bg-gold-deep/10 text-gold-deep' : 'bg-red-700/10 text-red-700'
                    }`}
                  >
                    {view === 'APPROVED' ? 'Publicado' : 'Recusado'}
                  </span>
                )}
              </div>

              <p className="mt-4 border-l-2 border-gold/40 pl-4 font-subtitle text-[15px] leading-relaxed text-onyx">
                {testimonial.content}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-gold/15 pt-4">
                {view === 'PENDING' && (
                  <>
                    <MotionButton
                      label="Recusar"
                      size="sm"
                      variant="secondary"
                      disabled={busyId === testimonial.id}
                      onClick={() => onDecision(testimonial.id, 'reject')}
                      icon={<i className="bx bx-x text-lg" aria-hidden="true" />}
                    />
                    <MotionButton
                      label="Aprovar"
                      size="sm"
                      disabled={busyId === testimonial.id}
                      onClick={() => onDecision(testimonial.id, 'approve')}
                      icon={<i className="bx bx-check text-lg" aria-hidden="true" />}
                    />
                  </>
                )}
                {view === 'APPROVED' && (
                  <button
                    type="button"
                    disabled={busyId === testimonial.id}
                    onClick={() => onDecision(testimonial.id, 'reject')}
                    className="rounded-full border border-gold/30 px-4 py-2 font-subtitle text-sm text-onyx transition-colors hover:border-red-700 hover:text-red-700 disabled:opacity-50"
                  >
                    Retirar do site
                  </button>
                )}
                {view === 'REJECTED' && (
                  <button
                    type="button"
                    disabled={busyId === testimonial.id}
                    onClick={() => onDecision(testimonial.id, 'approve')}
                    className="rounded-full border border-gold/30 px-4 py-2 font-subtitle text-sm text-onyx transition-colors hover:border-gold-deep hover:text-gold-deep disabled:opacity-50"
                  >
                    Publicar
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function PendingCard({
  booking,
  busy,
  onDecision,
}: {
  booking: Booking
  busy: boolean
  onDecision: (id: string, decision: 'accept' | 'reject') => void
}) {
  const [confirmingReject, setConfirmingReject] = useState(false)
  const { day, month, weekday, time } = dateParts(booking.slot.startsAt)
  const hoursUntil = (new Date(booking.slot.startsAt).getTime() - Date.now()) / 3_600_000
  const badge =
    hoursUntil < 0
      ? { label: 'Data passada', className: 'bg-red-700/10 text-red-700' }
      : hoursUntil < 24
        ? { label: 'Urgente · menos de 24h', className: 'bg-gold-deep/15 text-gold-deep' }
        : null

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      className="overflow-hidden rounded-2xl border border-gold/20 bg-white shadow-sm shadow-black/5"
    >
      <div className="flex">
        <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-gold/20 bg-gold-deep/5 py-4">
          <span className="font-logo text-2xl leading-none text-onyx">{day}</span>
          <span className="mt-1 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">{month}</span>
          <span className="mt-2 font-subtitle text-xs font-semibold text-onyx">{time}</span>
        </div>

        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-subtitle text-base font-semibold text-onyx">{booking.customerName}</p>
              <p className="mt-0.5 font-subtitle text-sm text-muted-dark">
                {booking.service.name} · {formatPrice(booking.service.priceCents)}
              </p>
              <p className="mt-0.5 font-subtitle text-xs capitalize text-muted-dark">{weekday}</p>
            </div>
            <a
              href={customerWhatsappUrl(
                booking.customerPhone,
                `Olá ${booking.customerName}! Sobre a tua marcação de ${booking.service.name}...`,
              )}
              target="_blank"
              rel="noreferrer"
              aria-label={`WhatsApp de ${booking.customerName}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/20 text-xl text-onyx transition-colors hover:border-gold-deep hover:text-gold-deep"
            >
              <i className="bx bxl-whatsapp" aria-hidden="true" />
            </a>
          </div>

          {badge && (
            <span className={`mt-2 inline-block rounded-full px-2.5 py-1 font-subtitle text-[11px] ${badge.className}`}>
              {badge.label}
            </span>
          )}

          {booking.notes && (
            <p className="mt-3 rounded-lg bg-gold-deep/5 px-3 py-2 font-subtitle text-xs italic text-muted-dark">
              "{booking.notes}"
            </p>
          )}

          <p className="mt-3 font-subtitle text-xs text-muted-dark">
            {booking.customerPhone} · Recebido {timeAgo(booking.createdAt).toLowerCase()}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-gold/15 bg-gold-deep/[0.03] px-4 py-3">
        {confirmingReject ? (
          <>
            <span className="mr-auto font-subtitle text-sm text-onyx">Recusar este pedido?</span>
            <button
              type="button"
              onClick={() => setConfirmingReject(false)}
              disabled={busy}
              className="rounded-full border border-gold/30 px-4 py-2 font-subtitle text-sm text-onyx disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => onDecision(booking.id, 'reject')}
              disabled={busy}
              className="rounded-full bg-red-700 px-4 py-2 font-subtitle text-sm text-[#ffffff] disabled:opacity-50"
            >
              {busy ? 'A recusar...' : 'Sim, recusar'}
            </button>
          </>
        ) : (
          <>
            <MotionButton
              label="Recusar"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirmingReject(true)}
              icon={<i className="bx bx-x text-lg" aria-hidden="true" />}
            />
            <MotionButton
              label={busy ? 'A aceitar...' : 'Aceitar'}
              size="sm"
              disabled={busy || hoursUntil < 0}
              onClick={() => onDecision(booking.id, 'accept')}
              icon={<i className="bx bx-check text-lg" aria-hidden="true" />}
            />
          </>
        )}
      </div>
    </motion.article>
  )
}

function PendingView({
  bookings,
  busyId,
  onDecision,
}: {
  bookings: Booking[]
  busyId: string | null
  onDecision: (id: string, decision: 'accept' | 'reject') => void
}) {
  const [order, setOrder] = useState<'sessao' | 'recebido'>('sessao')
  const [showPast, setShowPast] = useState(false)
  const sorted = [...bookings].sort((a, b) =>
    order === 'sessao'
      ? new Date(a.slot.startsAt).getTime() - new Date(b.slot.startsAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const now = Date.now()
  const upcomingList = sorted.filter((b) => new Date(b.slot.startsAt).getTime() >= now)
  const pastList = sorted.filter((b) => new Date(b.slot.startsAt).getTime() < now)
  const thisWeek = bookings.filter((b) => {
    const t = new Date(b.slot.startsAt).getTime()
    return t >= now && t < now + 7 * 86_400_000
  }).length
  const totalCents = bookings.reduce((sum, b) => sum + b.service.priceCents, 0)

  if (bookings.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center text-center">
        <i className="bx bx-bell-off text-5xl text-gold-deep/40" aria-hidden="true" />
        <p className="mt-3 font-subtitle text-base font-semibold text-onyx">Sem pedidos pendentes</p>
        <p className="mt-1 font-subtitle text-sm text-muted-dark">Os novos pedidos aparecem aqui logo que chegam.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Pendentes', value: String(bookings.length) },
          { label: 'Nos próx. 7 dias', value: String(thisWeek) },
          { label: 'Valor em espera', value: formatPrice(totalCents) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gold/20 bg-white p-4 shadow-sm shadow-black/5">
            <p className="font-logo text-xl leading-none text-onyx">{stat.value}</p>
            <p className="mt-1.5 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex rounded-full border border-gold/20 bg-white p-1 shadow-sm shadow-black/5">
        {(
          [
            ['sessao', 'Por data da sessão'],
            ['recebido', 'Mais recentes'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setOrder(id)}
            className="relative flex-1 rounded-full py-2.5 font-subtitle text-xs sm:text-sm"
          >
            {order === id && (
              <motion.span
                layoutId="pending-order"
                className="absolute inset-0 rounded-full bg-gold-deep"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={`relative transition-colors ${order === id ? 'text-cream' : 'text-onyx/70'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {(order === 'sessao' ? upcomingList : sorted).map((booking) => (
            <PendingCard key={booking.id} booking={booking} busy={busyId === booking.id} onDecision={onDecision} />
          ))}
        </AnimatePresence>
      </div>

      {order === 'sessao' && pastList.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-red-700/20 bg-red-700/5 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-3">
              <i className="bx bx-time text-xl text-red-700" aria-hidden="true" />
              <span>
                <span className="block font-subtitle text-sm font-semibold text-red-700">
                  Datas passadas ({pastList.length})
                </span>
                <span className="block font-subtitle text-xs text-muted-dark">
                  Pedidos sem resposta cuja sessão já devia ter acontecido
                </span>
              </span>
            </span>
            <i
              className={`bx bx-chevron-down text-2xl text-red-700 transition-transform duration-300 ${
                showPast ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>
          {showPast && (
            <div className="mt-4 flex flex-col gap-4">
              <AnimatePresence initial={false}>
                {pastList.map((booking) => (
                  <PendingCard
                    key={booking.id}
                    booking={booking}
                    busy={busyId === booking.id}
                    onDecision={onDecision}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [tab, setTab] = useState<AdminTab>(() => {
    const fromHash = window.location.hash.slice(1)
    return TABS.some((t) => t.id === fromHash) ? (fromHash as AdminTab) : 'pedidos'
  })
  const [scrolled, setScrolled] = useState(false)

  const [services, setServices] = useState<Service[]>([])
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [error, setError] = useState<string | null>(null)

  const [newDate, setNewDate] = useState('')
  const [batchTimes, setBatchTimes] = useState<string[]>([])
  const [addingSlot, setAddingSlot] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [serviceForm, setServiceForm] = useState<ServiceFormState | null>(null)
  const [savingService, setSavingService] = useState(false)
  const [serviceError, setServiceError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)
  const [deleteUsage, setDeleteUsage] = useState<ServiceUsage | null>(null)
  const [deletingService, setDeletingService] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [serviceNotice, setServiceNotice] = useState<string | null>(null)

  const [viewMonth, setViewMonth] = useState(() => getLisbonYearMonth(new Date()))
  const [clearingOpen, setClearingOpen] = useState(false)
  const [clearSummary, setClearSummary] = useState<{ slotCount: number; bookingCount: number } | null>(null)
  const [clearPassword, setClearPassword] = useState('')
  const [clearBusy, setClearBusy] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)
  const [clearAck, setClearAck] = useState(false)
  const [clearResult, setClearResult] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const loadDashboard = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      try {
        const [servicesData, slotsData, bookingsData, testimonialsData] = await Promise.all([
          api.get<Service[]>('/services'),
          api.get<AvailabilitySlot[]>('/admin/availability'),
          api.get<Booking[]>('/admin/bookings'),
          api.get<Testimonial[]>('/admin/testimonials'),
        ])
        setServices(servicesData)
        setSlots(slotsData)
        setBookings(bookingsData)
        setTestimonials(testimonialsData)
        if (!opts.silent) setError(null)
      } catch (err) {
        // An expired/invalid session used to be swallowed by the silent poll, leaving
        // the dashboard frozen on stale data with no new requests ever appearing.
        if (err instanceof ApiError && err.status === 401) {
          adminToken.set(null)
          navigate('/admin/login')
          return
        }
        if (!opts.silent) setError('Não foi possível carregar os dados do painel.')
      }
    },
    [navigate],
  )

  useEffect(() => {
    async function checkAuth() {
      try {
        const me = await api.get<{ email: string }>('/auth/me')
        setAdminEmail(me.email)
        await loadDashboard()
        void registerForPushNotifications()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) adminToken.set(null)
        navigate('/admin/login')
      } finally {
        setCheckingAuth(false)
      }
    }
    void checkAuth()
  }, [navigate, loadDashboard])

  // Keeps pending bookings (and everything else) live while the dashboard is
  // open, so a new request shows up on its own — no manual refresh, no
  // leaving and reopening the app. Polls only while authenticated and the
  // app is actually in the foreground, and refreshes immediately the moment
  // it comes back to the foreground rather than waiting for the next tick.
  useEffect(() => {
    if (checkingAuth || !adminEmail) return

    const poll = () => {
      if (document.visibilityState === 'visible') {
        void loadDashboard({ silent: true })
      }
    }

    const interval = setInterval(poll, 8000)
    document.addEventListener('visibilitychange', poll)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [checkingAuth, adminEmail, loadDashboard])

  async function handleLogout() {
    try {
      await api.post('/auth/logout')
    } finally {
      adminToken.set(null)
      navigate('/admin/login')
    }
  }

  async function handleCreateSlots(e: FormEvent) {
    e.preventDefault()
    if (!newDate || batchTimes.length === 0) return
    setAddingSlot(true)
    setError(null)
    try {
      const startsAtList = batchTimes.map((time) => new Date(`${newDate}T${time}:00`).toISOString())
      await api.post('/admin/availability/batch', { startsAtList })
      setNewDate('')
      setBatchTimes([])
      await loadDashboard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar vagas.')
    } finally {
      setAddingSlot(false)
    }
  }

  function openNewService() {
    setServiceError(null)
    setServiceForm({ id: null, name: '', description: '', duration: '', price: '' })
  }

  function openEditService(service: Service) {
    setServiceError(null)
    setServiceForm({
      id: service.id,
      name: service.name,
      description: service.description,
      duration: service.durationLabel,
      price: (service.priceCents / 100).toFixed(2),
    })
  }

  async function openDeleteService(service: Service) {
    setDeleteTarget(service)
    setDeleteUsage(null)
    setDeleteError(null)
    setServiceNotice(null)
    try {
      setDeleteUsage(await api.get<ServiceUsage>(`/admin/services/${service.id}/usage`))
    } catch (err) {
      setDeleteError(
        err instanceof ApiError && err.status === 404
          ? 'O servidor ainda não tem esta funcionalidade. Faz deploy do servidor (Render) e tenta de novo.'
          : 'Não foi possível verificar as marcações deste modelo. Tenta de novo.',
      )
    }
  }

  function closeDeleteService() {
    setDeleteTarget(null)
    setDeleteUsage(null)
    setDeleteError(null)
  }

  async function confirmDeleteService() {
    if (!deleteTarget) return
    setDeletingService(true)
    setDeleteError(null)
    try {
      await api.delete(`/admin/services/${deleteTarget.id}`)
      setServiceNotice(`"${deleteTarget.name}" foi eliminado.`)
      closeDeleteService()
      await loadDashboard()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Erro ao eliminar o modelo.')
    } finally {
      setDeletingService(false)
    }
  }

  function closeServiceDialog() {
    setServiceForm(null)
    setServiceError(null)
  }

  async function saveService() {
    if (!serviceForm) return
    const price = Number(serviceForm.price.replace(',', '.'))
    if (!serviceForm.name.trim() || !serviceForm.description.trim() || !serviceForm.duration.trim()) {
      setServiceError('Preenche o nome, a descrição e a duração.')
      return
    }
    if (serviceForm.price.trim() === '' || Number.isNaN(price) || price < 0) {
      setServiceError('Preço inválido.')
      return
    }
    setSavingService(true)
    setServiceError(null)
    const payload = {
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim(),
      durationLabel: serviceForm.duration.trim(),
      priceCents: Math.round(price * 100),
    }
    try {
      if (serviceForm.id === null) await api.post('/admin/services', payload)
      else await api.patch(`/admin/services/${serviceForm.id}`, payload)
      setServiceForm(null)
      await loadDashboard()
    } catch (err) {
      setServiceError(err instanceof ApiError ? err.message : 'Erro ao guardar o modelo.')
    } finally {
      setSavingService(false)
    }
  }

  async function handleDeleteSlot(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.delete(`/admin/availability/${id}`)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao remover vaga.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleBookingDecision(id: string, decision: 'accept' | 'reject' | 'cancel') {
    setBusyId(id)
    setError(null)
    try {
      await api.post(`/admin/bookings/${id}/${decision}`)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar marcação.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleTestimonialDecision(id: string, decision: 'approve' | 'reject') {
    setBusyId(id)
    setError(null)
    try {
      await api.post(`/admin/testimonials/${id}/${decision}`)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar testemunho.')
    } finally {
      setBusyId(null)
    }
  }

  function shiftMonth(delta: number) {
    setViewMonth((prev) => {
      const zeroBased = prev.month - 1 + delta
      const year = prev.year + Math.floor(zeroBased / 12)
      const month = (((zeroBased % 12) + 12) % 12) + 1
      return { year, month }
    })
    setClearingOpen(false)
    setClearSummary(null)
    setClearPassword('')
    setClearError(null)
  }

  function closeClearPanel() {
    setClearingOpen(false)
    setClearPassword('')
    setClearAck(false)
    setClearError(null)
  }

  async function openClearPanel() {
    setClearingOpen(true)
    setClearError(null)
    setClearResult(null)
    setClearSummary(null)
    try {
      const summary = await api.get<{ slotCount: number; bookingCount: number }>(
        `/admin/maintenance/months/${viewMonth.year}/${viewMonth.month}/summary`,
      )
      setClearSummary(summary)
    } catch {
      setClearError('Não foi possível carregar o resumo deste mês.')
    }
  }

  async function handleClearMonth() {
    if (!clearPassword) return
    setClearBusy(true)
    setClearError(null)
    try {
      const result = await api.post<{ deletedBookings: number; deletedSlots: number }>(
        `/admin/maintenance/months/${viewMonth.year}/${viewMonth.month}/clear`,
        { password: clearPassword },
      )
      setClearingOpen(false)
      setClearSummary(null)
      setClearPassword('')
      setClearAck(false)
      setClearResult(
        `${formatMonthLabel(viewMonth)} limpo: ${result.deletedSlots} ${result.deletedSlots === 1 ? 'vaga' : 'vagas'} e ${result.deletedBookings} ${result.deletedBookings === 1 ? 'marcação' : 'marcações'} apagadas.`,
      )
      await loadDashboard()
    } catch (err) {
      setClearError(err instanceof ApiError ? err.message : 'Erro ao limpar dados do mês.')
    } finally {
      setClearBusy(false)
    }
  }

  const monthSlots = slots.filter((s) => {
    const { year, month } = getLisbonYearMonth(new Date(s.startsAt))
    return year === viewMonth.year && month === viewMonth.month
  })
  const monthBookings = bookings.filter((b) => {
    const { year, month } = getLisbonYearMonth(new Date(b.slot.startsAt))
    return year === viewMonth.year && month === viewMonth.month
  })

  const slotsByDate = (() => {
    const groups = new Map<string, AvailabilitySlot[]>()
    for (const slot of monthSlots) {
      const key = dateKey(slot.startsAt)
      const existing = groups.get(key) ?? []
      existing.push(slot)
      groups.set(key, existing)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  })()

  // Times already opened on the chosen day (so they can't be created twice).
  const takenTimes = new Set(
    slots.filter((slot) => newDate && dateKey(slot.startsAt) === newDate).map((slot) => dateParts(slot.startsAt).time),
  )

  const nowMs = Date.now()
  // Pending requests need action no matter which month they are for, so they
  // are not filtered by the month being viewed (that used to hide new requests).
  const pendingBookings = bookings
    .filter((b) => b.status === 'PENDING')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const upcomingConfirmed = monthBookings
    .filter((b) => b.status === 'ACCEPTED' && new Date(b.slot.startsAt).getTime() >= nowMs)
    .sort((a, b) => new Date(a.slot.startsAt).getTime() - new Date(b.slot.startsAt).getTime())
  const history = monthBookings
    .filter(
      (b) =>
        b.status === 'REJECTED' ||
        b.status === 'CANCELLED' ||
        (b.status === 'ACCEPTED' && new Date(b.slot.startsAt).getTime() < nowMs),
    )
    .sort((a, b) => new Date(b.slot.startsAt).getTime() - new Date(a.slot.startsAt).getTime())

  const pendingTestimonials = testimonials.filter((t) => t.status === 'PENDING')

  const monthConfirmedCount = monthBookings.filter((b) => b.status === 'ACCEPTED').length
  const monthRevenueCents = monthBookings
    .filter((b) => b.status === 'ACCEPTED')
    .reduce((sum, b) => sum + b.service.priceCents, 0)

  const pillClasses = `flex items-center rounded-full bg-white/95 shadow-lg shadow-black/10 backdrop-blur transition-shadow duration-500 ${
    scrolled ? 'shadow-xl shadow-black/15' : ''
  }`

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white font-subtitle text-muted-dark">
        A verificar sessão...
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-white font-medium">
      {/* Not fixed: the header scrolls away with the page. */}
      <div className="absolute inset-x-0 top-0 z-40 mt-[calc(1rem+env(safe-area-inset-top))] px-4 sm:mt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className={`px-5 py-3 sm:px-6 ${pillClasses}`}>
            <span className="font-logo text-2xl leading-none tracking-wide text-gold-deep">AFROGLOW</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="h-12 w-12 border-transparent bg-white/95 shadow-lg shadow-black/10 backdrop-blur" />
            <button
              type="button"
              onClick={handleLogout}
              className={`gap-2 px-5 py-3 text-sm text-onyx transition-colors duration-300 hover:text-gold-deep sm:px-6 ${pillClasses}`}
            >
              <span>Sair</span>
              <i className="bx bx-log-out text-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-5 pb-36 pt-[calc(7rem+env(safe-area-inset-top))] sm:px-8 sm:pt-[calc(8rem+env(safe-area-inset-top))]">
        <h1 className="font-logo text-4xl text-onyx sm:text-5xl">Painel de Admin</h1>
        <p className="mt-4 font-subtitle text-lg font-light text-muted-dark">{adminEmail}</p>

        {error && <p className="mt-6 font-subtitle text-sm text-red-700">{error}</p>}

        {(tab === 'agenda' || tab === 'disponibilidade') && (
          <div className="mt-6 flex items-center justify-center gap-4 rounded-full border border-gold/20 bg-white px-4 py-2 shadow-sm shadow-black/5 sm:justify-start">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-dark transition-colors hover:bg-white hover:text-gold-deep"
            >
              <i className="bx bx-chevron-left" aria-hidden="true" />
            </button>
            <span className="font-logo text-sm text-onyx">{formatMonthLabel(viewMonth)}</span>
            <button
              type="button"
              aria-label="Mês seguinte"
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-dark transition-colors hover:bg-white hover:text-gold-deep"
            >
              <i className="bx bx-chevron-right" aria-hidden="true" />
            </button>
          </div>
        )}

        {tab === 'agenda' && (
          <AgendaView
            pendingCount={pendingBookings.length}
            confirmedCount={monthConfirmedCount}
            revenueCents={monthRevenueCents}
            upcoming={upcomingConfirmed}
            history={history}
            busyId={busyId}
            onCancel={(id) => handleBookingDecision(id, 'cancel')}
          />
        )}

        <div key={tab}>
          {tab === 'servicos' && (
            <section className="mt-6">
              {serviceNotice && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-gold/20 bg-white p-4 shadow-sm shadow-black/5">
                  <i className="bx bx-check-circle mt-0.5 text-xl text-gold-deep" aria-hidden="true" />
                  <p className="flex-1 font-subtitle text-sm text-onyx">{serviceNotice}</p>
                  <button
                    type="button"
                    onClick={() => setServiceNotice(null)}
                    aria-label="Fechar aviso"
                    className="text-lg text-muted-dark"
                  >
                    <i className="bx bx-x" aria-hidden="true" />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Modelos', value: String(services.length) },
                  {
                    label: 'Desde',
                    value: services.length ? formatPrice(Math.min(...services.map((x) => x.priceCents))) : '—',
                  },
                  {
                    label: 'Até',
                    value: services.length ? formatPrice(Math.max(...services.map((x) => x.priceCents))) : '—',
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-gold/20 bg-white p-4 shadow-sm shadow-black/5"
                  >
                    <p className="font-logo text-xl leading-none text-onyx">{stat.value}</p>
                    <p className="mt-1.5 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {services.map((service) => (
                  <article
                    key={service.id}
                    className="rounded-2xl border border-gold/20 bg-white p-5 shadow-sm shadow-black/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-logo text-lg text-onyx">{service.name}</h3>
                        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-gold-deep/10 px-2.5 py-1 font-subtitle text-[11px] text-gold-deep">
                          <i className="bx bx-time-five text-sm" aria-hidden="true" />
                          {service.durationLabel}
                        </span>
                      </div>
                      <p className="shrink-0 font-logo text-2xl leading-none text-onyx">
                        {formatPrice(service.priceCents)}
                      </p>
                    </div>
                    <p className="mt-3 line-clamp-2 font-subtitle text-sm text-muted-dark">{service.description}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-gold/15 pt-3">
                      <button
                        type="button"
                        onClick={() => openDeleteService(service)}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-subtitle text-sm text-muted-dark transition-colors hover:bg-red-700/10 hover:text-red-700"
                      >
                        <i className="bx bx-trash text-base" aria-hidden="true" />
                        Eliminar
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditService(service)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 px-4 py-2 font-subtitle text-sm text-onyx transition-colors hover:border-gold-deep hover:text-gold-deep"
                      >
                        <i className="bx bx-pencil text-base" aria-hidden="true" />
                        Editar
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <motion.button
                type="button"
                onClick={openNewService}
                whileTap={{ scale: 0.98 }}
                className="group mt-4 flex w-full items-center gap-4 rounded-2xl border border-gold/30 bg-gold-deep/5 p-4 text-left transition-colors duration-300 hover:border-gold-deep hover:bg-gold-deep/10"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-deep text-2xl text-[#ffffff] shadow-md shadow-gold-deep/30 transition-transform duration-300 group-hover:rotate-90">
                  <i className="bx bx-plus" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-subtitle text-base font-semibold text-onyx">Adicionar modelo</span>
                  <span className="block font-subtitle text-xs text-muted-dark">
                    Cria uma nova trança no catálogo do site
                  </span>
                </span>
                <i
                  className="bx bx-chevron-right text-2xl text-gold-deep transition-transform duration-300 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </motion.button>

              <DeleteServiceDialog
                service={deleteTarget}
                usage={deleteUsage}
                busy={deletingService}
                error={deleteError}
                onConfirm={confirmDeleteService}
                onClose={closeDeleteService}
              />

              <ServiceDialog
                form={serviceForm}
                busy={savingService}
                error={serviceError}
                onChange={setServiceForm}
                onSave={saveService}
                onClose={closeServiceDialog}
              />
            </section>
          )}

          {tab === 'disponibilidade' && (
            <section className="mt-4">
              {clearResult && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-gold/20 bg-white p-4 shadow-sm shadow-black/5">
                  <i className="bx bx-check-circle mt-0.5 text-xl text-gold-deep" aria-hidden="true" />
                  <p className="flex-1 font-subtitle text-sm text-onyx">{clearResult}</p>
                  <button
                    type="button"
                    onClick={() => setClearResult(null)}
                    aria-label="Fechar aviso"
                    className="text-lg text-muted-dark"
                  >
                    <i className="bx bx-x" aria-hidden="true" />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Disponíveis', value: monthSlots.filter((slot) => slot.status === 'OPEN').length },
                  { label: 'Pendentes', value: monthSlots.filter((slot) => slot.status === 'PENDING').length },
                  { label: 'Reservadas', value: monthSlots.filter((slot) => slot.status === 'BOOKED').length },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-gold/20 bg-white p-4 shadow-sm shadow-black/5"
                  >
                    <p className="font-logo text-2xl leading-none text-onyx">{stat.value}</p>
                    <p className="mt-1.5 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleCreateSlots}
                className="mt-6 rounded-2xl border border-gold/20 bg-white p-5 shadow-sm shadow-black/5"
              >
                <h3 className="font-logo text-lg text-onyx">Criar horários</h3>
                <p className="mt-1 font-subtitle text-sm text-muted-dark">
                  Escolhe o dia e toca nas horas que queres abrir.
                </p>

                <div className="mt-4">
                  <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                    Dia
                  </span>
                  <DatePicker value={newDate} onChange={setNewDate} />
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Horas</span>
                    <div className="flex items-center gap-1">
                      {[
                        { label: 'Manhã', times: SLOT_TIMES.filter((t) => t >= '09:00' && t <= '12:30') },
                        { label: 'Tarde', times: SLOT_TIMES.filter((t) => t >= '14:00' && t <= '18:00') },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setBatchTimes(
                              [...new Set([...batchTimes, ...preset.times.filter((t) => !takenTimes.has(t))])].sort(),
                            )
                          }
                          className="rounded-full px-3 py-1 font-subtitle text-xs text-onyx/70 transition-colors hover:bg-gold-deep/10 hover:text-onyx"
                        >
                          {preset.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBatchTimes([])}
                        disabled={batchTimes.length === 0}
                        className="rounded-full px-3 py-1 font-subtitle text-xs text-onyx/70 transition-colors hover:bg-gold-deep/10 hover:text-onyx disabled:opacity-30"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {SLOT_TIMES.map((time) => {
                      const taken = takenTimes.has(time)
                      const selected = batchTimes.includes(time)
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={taken || !newDate}
                          onClick={() =>
                            setBatchTimes(
                              selected ? batchTimes.filter((t) => t !== time) : [...batchTimes, time].sort(),
                            )
                          }
                          title={taken ? 'Já existe uma vaga a esta hora' : undefined}
                          className={`rounded-full border py-2 font-subtitle text-sm transition-colors ${
                            selected
                              ? 'border-gold-deep bg-gold-deep text-cream'
                              : taken
                                ? 'border-gold/20 text-onyx/30 line-through'
                                : 'border-gold/30 text-onyx hover:border-gold-deep'
                          } disabled:cursor-not-allowed`}
                        >
                          {time}
                        </button>
                      )
                    })}
                  </div>
                  {!newDate && (
                    <p className="mt-2 font-subtitle text-xs text-muted-dark">
                      Escolhe primeiro o dia para ativar as horas.
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-gold/15 pt-4">
                  <span className="font-subtitle text-sm text-muted-dark">
                    {batchTimes.length === 0
                      ? 'Nenhuma hora selecionada'
                      : `${batchTimes.length} ${batchTimes.length === 1 ? 'hora selecionada' : 'horas selecionadas'}`}
                  </span>
                  <MotionButton
                    label={
                      addingSlot
                        ? 'A criar...'
                        : batchTimes.length > 1
                          ? `Criar ${batchTimes.length} vagas`
                          : 'Criar vaga'
                    }
                    size="sm"
                    type="submit"
                    disabled={addingSlot || !newDate || batchTimes.length === 0}
                  />
                </div>
              </form>

              {slotsByDate.length === 0 ? (
                <div className="mt-12 flex flex-col items-center text-center">
                  <i className="bx bx-time-five text-5xl text-gold-deep/40" aria-hidden="true" />
                  <p className="mt-3 font-subtitle text-base text-onyx">Sem horários neste mês</p>
                  <p className="mt-1 font-subtitle text-sm text-muted-dark">
                    Cria vagas acima para as clientes poderem marcar.
                  </p>
                </div>
              ) : (
                slotsByDate.map(([key, daySlots]) => {
                  const heading = dayHeading(daySlots[0].startsAt)
                  const past = key < dateKey(new Date().toISOString())
                  return (
                    <div key={key} className={`mt-7 ${past ? 'opacity-55' : ''}`}>
                      <div className="flex items-baseline gap-3">
                        <h3 className="font-logo text-lg text-onyx">{heading.title}</h3>
                        {heading.sub && <span className="font-subtitle text-xs text-muted-dark">{heading.sub}</span>}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {daySlots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`flex items-center gap-2 rounded-full border py-1.5 pl-4 ${
                              slot.status === 'OPEN' ? 'pr-2' : 'pr-4'
                            } font-subtitle text-sm ${
                              slot.status === 'BOOKED'
                                ? 'border-onyx bg-onyx text-white'
                                : slot.status === 'PENDING'
                                  ? 'border-gold-deep bg-gold-deep/10 text-onyx'
                                  : 'border-gold/30 bg-white text-onyx'
                            }`}
                          >
                            <span className="font-semibold">{dateParts(slot.startsAt).time}</span>
                            <span
                              className={`text-[11px] uppercase tracking-wide ${
                                slot.status === 'BOOKED' ? 'text-white/70' : 'text-muted-dark'
                              }`}
                            >
                              {SLOT_STATUS_LABEL[slot.status]}
                            </span>
                            {slot.status === 'OPEN' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot.id)}
                                disabled={busyId === slot.id}
                                aria-label="Remover vaga"
                                className="flex h-6 w-6 items-center justify-center rounded-full text-muted-dark transition-colors hover:bg-red-700/10 hover:text-red-700"
                              >
                                <i className="bx bx-x text-lg" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}

              <div className="mt-12">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-gold/25" />
                  <span className="flex items-center gap-1.5 font-subtitle text-[11px] uppercase tracking-[0.18em] text-muted-dark">
                    <i className="bx bx-error text-sm text-red-700" aria-hidden="true" />
                    Zona de perigo
                  </span>
                  <span className="h-px flex-1 bg-gold/25" />
                </div>

                <div className="relative mt-4 overflow-hidden rounded-2xl border border-gold/20 bg-white p-5 shadow-sm shadow-black/5">
                  <span className="absolute inset-y-0 left-0 w-1 bg-red-700" aria-hidden="true" />
                  <div className="pl-2">
                    <p className="font-logo text-lg text-onyx">Limpar {formatMonthLabel(viewMonth)}</p>
                    <p className="mt-1 font-subtitle text-sm text-muted-dark">
                      Apaga todas as vagas e marcações deste mês, incluindo as já aceites. Não pode ser desfeito.
                    </p>
                    <button
                      type="button"
                      onClick={openClearPanel}
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-700/40 px-5 py-2.5 font-subtitle text-sm font-semibold text-red-700 transition-colors hover:bg-red-700 hover:text-[#ffffff]"
                    >
                      <i className="bx bx-trash text-base" aria-hidden="true" />
                      Limpar mês
                    </button>
                  </div>
                </div>
              </div>

              <ClearMonthDialog
                open={clearingOpen}
                monthLabel={formatMonthLabel(viewMonth)}
                summary={clearSummary}
                password={clearPassword}
                onPasswordChange={setClearPassword}
                acknowledged={clearAck}
                onAcknowledgedChange={setClearAck}
                busy={clearBusy}
                error={clearError}
                onConfirm={handleClearMonth}
                onClose={closeClearPanel}
              />
            </section>
          )}

          {tab === 'pedidos' && (
            <PendingView
              bookings={pendingBookings}
              busyId={busyId}
              onDecision={(id, decision) => handleBookingDecision(id, decision)}
            />
          )}

          {tab === 'testemunhos' && (
            <TestimonialsView testimonials={testimonials} busyId={busyId} onDecision={handleTestimonialDecision} />
          )}
        </div>
      </main>

      <BottomNavBar
        stickyBottom
        value={tab}
        onChange={(id) => {
          setTab(id)
          window.scrollTo({ top: 0 })
        }}
        items={TABS.map(({ id, label, icon }) => ({
          id,
          label,
          icon,
          badge: id === 'pedidos' ? pendingBookings.length : id === 'testemunhos' ? pendingTestimonials.length : 0,
        }))}
      />
    </div>
  )
}
