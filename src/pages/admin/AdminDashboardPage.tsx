import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bell,
  BellRing,
  House,
  CalendarCheck,
  CalendarX2,
  ChartColumn,
  Clock,
  Images,
  Inbox,
  LogOut,
  MessageSquareQuote,
  Moon,
  PanelTop,
  PanelTopClose,
  Plus,
  Scissors,
  Store,
  Sun,
  Tag,
  UserRound,
  Users,
} from 'lucide-react'
import { BackToTop } from '@/components/ui/back-to-top'
import { BottomNavBar, type BottomNavItem } from '@/components/ui/bottom-nav-bar'
import { FloatingActionMenu, type MenuAction } from '@/components/ui/floating-action-button'
import { DatePicker } from '@/components/ui/date-picker'
import { MotionButton } from '@/components/ui/motion-button'
import { adminToken, api, ApiError } from '@/lib/api'
import { CustomersView } from '@/pages/admin/CustomersView'
import type { AdminCustomer } from '@/pages/admin/admin-types'
import { ManualBookingSheet } from '@/pages/admin/ManualBookingSheet'
import { MoreView, type MoreTarget } from '@/pages/admin/MoreView'
import { MonthStrip } from '@/pages/admin/MonthStrip'
import { GenerateSlotsSheet } from '@/pages/admin/ScheduleTools'
import { BroadcastView } from '@/pages/admin/BroadcastView'
import { ClosuresView } from '@/pages/admin/ClosuresView'
import { PromotionsView } from '@/pages/admin/PromotionsView'
import { TeamView } from '@/pages/admin/TeamView'
import { HomeView } from '@/pages/admin/HomeView'
import { HeaderLogo } from '@/customer/HeaderLogo'
import { tap } from '@/lib/haptics'
import { BRAND_CIRCLE } from '@/components/ui/brand-logo'
import { fullMe, type AdminMe, type Permission } from '@/pages/admin/admin-me'
import { PortfolioView } from '@/pages/admin/PortfolioView'
import { SecurityView } from '@/pages/admin/SecurityView'
import { ServicePhotos } from '@/pages/admin/ServicePhotos'
import { SettingsView } from '@/pages/admin/SettingsView'
import { StatsView } from '@/pages/admin/StatsView'
import { registerForPushNotifications } from '@/lib/push-notifications'
import { setHideNavOnScroll, useHideNavOnScrollSetting } from '@/lib/nav-prefs'
import { useTheme } from '@/lib/theme'
import { NavVisibilityProvider, useAutoHideNav, useNavHidden } from '@/customer/nav-visibility'
import { customerWhatsappUrl } from '@/lib/site-config'
import { formatPrice, type AvailabilitySlot, type Booking, type Service, type Testimonial } from '@/lib/types'
import { bookingName, bookingPrice, optionsOf } from '@/lib/pricing'
import { serviceImageUrls } from '@/lib/service-images'
import { PricingEditor } from './PricingEditor'
import { draftFromPricing, pricingFromDraft, type PricingDraft } from './pricing-draft'
import { BookingChoices } from './BookingChoices'
import { AdminBell } from '@/pages/admin/AdminBell'

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

type NavTab = 'inicio' | 'pedidos' | 'agenda' | 'disponibilidade' | 'clientes' | 'mais'
type AdminTab = NavTab | MoreTarget

const MORE_TARGETS: MoreTarget[] = [
  'servicos',
  'promocoes',
  'portfolio',
  'testemunhos',
  'estatisticas',
  'definicoes',
  'seguranca',
  'fechos',
  'notificar',
  'equipa',
]

// Outline icons (lucide), as in the website's account menu; `icon` stays as the Boxicons fallback.
const TABS: Array<BottomNavItem<NavTab>> = [
  { id: 'inicio', label: 'Início', icon: 'bx bx-home', Icon: House },
  { id: 'pedidos', label: 'Pedidos', icon: 'bx bx-bell', Icon: Bell },
  { id: 'agenda', label: 'Agenda', icon: 'bx bx-calendar-check', Icon: CalendarCheck },
  { id: 'disponibilidade', label: 'Horários', icon: 'bx bx-time-five', Icon: Clock },
  { id: 'clientes', label: 'Clientes', icon: 'bx bx-user', Icon: Users },
]

/** Step 2 of "Criar horários": the times of the day in three groups, with one-tap presets. */
function TimePicker({
  enabled,
  chosen,
  taken,
  onChange,
}: {
  enabled: boolean
  chosen: string[]
  taken: Set<string>
  onChange: (times: string[]) => void
}) {
  const groups = [
    { label: 'Manhã', times: SLOT_TIMES.filter((t) => t < '13:00') },
    { label: 'Tarde', times: SLOT_TIMES.filter((t) => t >= '13:00' && t < '18:00') },
    { label: 'Fim do dia', times: SLOT_TIMES.filter((t) => t >= '18:00') },
  ]
  const add = (times: string[]) => onChange([...new Set([...chosen, ...times.filter((t) => !taken.has(t))])].sort())
  const presets = [
    { label: 'Rotina 8h + 14h', run: () => onChange(['08:00', '14:00'].filter((t) => !taken.has(t))) },
    { label: 'Manhã', run: () => add(groups[0].times) },
    { label: 'Tarde', run: () => add(groups[1].times) },
  ]

  return (
    <div className={enabled ? '' : 'opacity-50'}>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            disabled={!enabled}
            onClick={preset.run}
            className="glass-chip rounded-full px-3.5 py-2 font-subtitle text-xs font-medium text-onyx disabled:cursor-not-allowed"
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          disabled={!enabled || chosen.length === 0}
          onClick={() => onChange([])}
          className="rounded-full px-3 py-2 font-subtitle text-xs text-muted-dark underline underline-offset-4 disabled:opacity-40"
        >
          Limpar
        </button>
      </div>

      {groups.map((group) => (
        <div key={group.label} className="mt-4">
          <p className="mb-2 font-subtitle text-[11px] font-medium uppercase tracking-wide text-muted-dark">
            {group.label}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {group.times.map((time) => {
              const isTaken = taken.has(time)
              const on = chosen.includes(time)
              return (
                <button
                  key={time}
                  type="button"
                  disabled={isTaken || !enabled}
                  aria-pressed={on}
                  onClick={() => onChange(on ? chosen.filter((t) => t !== time) : [...chosen, time].sort())}
                  title={isTaken ? 'Já existe uma vaga a esta hora' : undefined}
                  className={`h-11 rounded-xl font-subtitle text-sm lining-nums disabled:cursor-not-allowed ${
                    on
                      ? 'glass-chip-on font-semibold text-onyx'
                      : isTaken
                        ? 'text-onyx/30 line-through'
                        : 'glass-chip text-onyx'
                  } ${isTaken ? 'bg-onyx/5' : ''}`}
                >
                  {time}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The month's times as a day view: a strip with every day of the month (a coloured bar tells at a glance whether the
 * day has free times, is full or is closed), and the chosen day's times below as large tiles with the client's name.
 */
function SlotsDayView({
  slotsByDate,
  bookings,
  viewMonth,
  busyId,
  onDelete,
}: {
  slotsByDate: Array<[string, AvailabilitySlot[]]>
  bookings: Booking[]
  viewMonth: { year: number; month: number }
  busyId: string | null
  onDelete: (id: string) => void
}) {
  const byKey = new Map(slotsByDate)
  const todayKey = dateKey(new Date().toISOString())
  const prefix = `${viewMonth.year}-${String(viewMonth.month).padStart(2, '0')}`
  const daysInMonth = new Date(viewMonth.year, viewMonth.month, 0).getDate()
  const pickDefault = () =>
    (byKey.has(todayKey) ? todayKey : slotsByDate.find(([key]) => key >= todayKey)?.[0]) ?? slotsByDate[0]?.[0] ?? ''
  const [selected, setSelected] = useState(pickDefault)

  useEffect(() => {
    if (!selected.startsWith(prefix) || !byKey.has(selected)) setSelected(pickDefault())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix, slotsByDate])

  const clientOf = (slot: AvailabilitySlot) =>
    bookings.find((b) => b.slot.id === slot.id && (b.status === 'PENDING' || b.status === 'ACCEPTED'))?.customerName

  const list = byKey.get(selected) ?? []
  const free = list.filter((slot) => slot.status === 'OPEN').length
  const heading = list[0] ? dayHeading(list[0].startsAt) : null
  const parts = list[0] ? dateParts(list[0].startsAt) : null
  // The month as a grid, Monday first: blanks before the 1st.
  const lead = (new Date(viewMonth.year, viewMonth.month - 1, 1).getDay() + 6) % 7
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h2 className="font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark">Calendário</h2>
        {selected !== todayKey && byKey.has(todayKey) && (
          <button
            type="button"
            onClick={() => setSelected(todayKey)}
            className="shrink-0 font-subtitle text-xs font-medium text-onyx underline underline-offset-4"
          >
            Ir para hoje
          </button>
        )}
      </div>

      {/* The whole month at once: a dot for days with free times, a ring for days that are full. */}
      <div className="rounded-2xl border border-onyx/10 bg-white p-3 shadow-sm shadow-black/5">
        <div className="grid grid-cols-7 text-center font-subtitle text-[10px] font-medium uppercase tracking-wide text-muted-dark">
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
            <span key={i} className="py-1">
              {d}
            </span>
          ))}
        </div>
        <div role="grid" aria-label="Dias do mês" className="mt-1 grid grid-cols-7 gap-y-1">
          {Array.from({ length: lead }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const key = `${prefix}-${String(day).padStart(2, '0')}`
            const slots = byKey.get(key)
            const open = slots?.filter((slot) => slot.status === 'OPEN').length ?? 0
            const active = key === selected
            const isToday = key === todayKey
            const past = key < todayKey
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                aria-label={`${day}, ${slots ? (open > 0 ? `${open} livres` : 'completo') : 'sem horários'}`}
                onClick={() => setSelected(key)}
                className="flex flex-col items-center py-0.5"
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-full font-subtitle text-sm lining-nums transition-colors ${
                    active
                      ? 'bg-onyx font-semibold text-white'
                      : isToday
                        ? 'font-semibold text-onyx ring-1 ring-onyx'
                        : slots
                          ? past
                            ? 'text-onyx/45'
                            : 'font-medium text-onyx'
                          : 'text-onyx/30'
                  }`}
                >
                  {day}
                </span>
                <span
                  className={`mt-0.5 size-1.5 rounded-full ${
                    !slots ? 'bg-transparent' : open > 0 ? 'bg-emerald-500' : 'bg-red-600'
                  }`}
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex items-center justify-center gap-4 border-t border-onyx/[0.08] pt-2.5 font-subtitle text-[11px] text-muted-dark">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> Com horas livres
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-red-600" aria-hidden="true" /> Completo
          </span>
          <span className="text-onyx/35">Sem ponto: fechado</span>
        </div>
      </div>

      {/* The chosen day: its times as a list. */}
      <div className="mt-5">
        {list.length === 0 ? (
          <div className="rounded-2xl bg-onyx/[0.04] px-4 py-6 text-center">
            <p className="font-subtitle text-base font-semibold text-onyx">Dia fechado</p>
            <p className="mt-1 font-subtitle text-sm text-muted-dark">Sem horários. Usa “Abrir um dia” acima para o abrir.</p>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <h3 className="font-subtitle text-base font-semibold tracking-tight text-onyx first-letter:uppercase">
                {heading?.sub ? `${heading.title} · ${parts?.day} ${parts?.month}` : heading?.title}
              </h3>
              <span className="shrink-0 font-subtitle text-xs text-muted-dark">
                {free} {free === 1 ? 'livre' : 'livres'} · {list.length - free}{' '}
                {list.length - free === 1 ? 'ocupado' : 'ocupados'}
              </span>
            </div>
            <ul className="divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]">
              {list.map((slot) => {
                const isFree = slot.status === 'OPEN'
                const time = dateParts(slot.startsAt).time
                const who = clientOf(slot)
                const confirming = confirmId === slot.id
                return (
                  <li key={slot.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-14 shrink-0 font-subtitle text-lg font-semibold lining-nums text-onyx">{time}</span>
                    <span className="flex min-w-0 flex-1 items-center gap-2 font-subtitle text-sm">
                      <span
                        className={`size-2 shrink-0 rounded-full ${
                          isFree ? 'bg-emerald-500' : slot.status === 'PENDING' ? 'bg-amber-500' : 'bg-red-600'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={`truncate ${isFree ? 'text-muted-dark' : 'font-medium text-onyx'}`}>
                        {isFree ? 'Livre' : (who ?? SLOT_STATUS_LABEL[slot.status])}
                      </span>
                      {slot.status === 'PENDING' && (
                        <span className="shrink-0 text-xs text-muted-dark">· por confirmar</span>
                      )}
                    </span>
                    {isFree && (
                      <button
                        type="button"
                        onClick={() => (confirming ? onDelete(slot.id) : setConfirmId(slot.id))}
                        onBlur={() => setConfirmId(null)}
                        disabled={busyId === slot.id}
                        aria-label={`Fechar a vaga das ${time}`}
                        className={`shrink-0 rounded-full px-3 py-1.5 font-subtitle text-xs transition-colors disabled:opacity-40 ${
                          confirming ? 'bg-red-600 font-medium text-[#ffffff]' : 'text-onyx/50'
                        }`}
                      >
                        {confirming ? 'Fechar' : <i className="bx bx-minus-circle text-lg" aria-hidden="true" />}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

// Every page has its own title and one line saying what it is for.
const PAGE: Record<AdminTab, { title: string; hint: string }> = {
  inicio: { title: 'Início', hint: 'O teu dia de relance.' },
  pedidos: { title: 'Pedidos', hint: 'Marcações à espera da tua resposta.' },
  agenda: { title: 'Agenda', hint: 'As sessões do mês.' },
  disponibilidade: { title: 'Horários', hint: 'Abre e fecha os horários para marcar.' },
  clientes: { title: 'Clientes', hint: 'Quem já marcou contigo.' },
  mais: { title: 'Mais', hint: 'Outras opções do painel.' },
  servicos: { title: 'Serviços', hint: 'Modelos, duração e preços.' },
  portfolio: { title: 'Portfólio', hint: 'As fotos do teu trabalho, na galeria do site e na app.' },
  testemunhos: { title: 'Testemunhos', hint: 'Aprovar ou recusar o que os clientes escrevem.' },
  estatisticas: { title: 'Estatísticas', hint: 'Receita, sessões e clientes.' },
  definicoes: { title: 'Definições do negócio', hint: 'Contactos, morada, horário e cancelamento.' },
  seguranca: { title: 'A tua conta', hint: 'Nome, foto, notificações, password e este aparelho.' },
  promocoes: { title: 'Promoções', hint: 'Descontos por uns dias, num modelo ou em todos.' },
  fechos: { title: 'Dias fechados', hint: 'Folgas, feriados e férias.' },
  notificar: { title: 'Notificar clientes', hint: 'Uma mensagem no iPhone e no sino das clientes.' },
  equipa: { title: 'Equipa', hint: 'Quem entra no painel e o que pode usar.' },
}

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
  PENDING: 'bg-onyx/5 text-onyx',
  ACCEPTED: 'bg-onyx/5 text-onyx',
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
  onNew,
}: {
  pendingCount: number
  confirmedCount: number
  revenueCents: number
  upcoming: Booking[]
  history: Booking[]
  busyId: string | null
  onCancel: (id: string) => void
  onNew: () => void
}) {
  const [view, setView] = useState<'proximas' | 'historico'>('proximas')
  const [search, setSearch] = useState('')
  const needle = search.trim().toLowerCase()
  const matches = (b: Booking) =>
    !needle ||
    b.customerName.toLowerCase().includes(needle) ||
    b.customerPhone.replace(/\s/g, '').includes(needle.replace(/\s/g, '')) ||
    b.service.name.toLowerCase().includes(needle)
  const upcomingAll = upcoming
  const historyAll = history
  upcoming = upcomingAll.filter(matches)
  history = historyAll.filter(matches)
  const next = upcomingAll[0]
  const nextWhen = next ? relativeWhen(next.slot.startsAt) : null

  return (
    <div>
      {/* The month in one line. */}
      <p className="mt-4 px-1 font-subtitle text-sm text-muted-dark">
        <strong className="font-semibold text-onyx">{confirmedCount}</strong>{' '}
        {confirmedCount === 1 ? 'sessão confirmada' : 'sessões confirmadas'} ·{' '}
        <strong className="font-semibold lining-nums text-onyx">{formatPrice(revenueCents).replace(/,00/, '')}</strong>
        {pendingCount > 0 && (
          <>
            {' '}
            · <strong className="font-semibold text-onyx">{pendingCount}</strong> por responder
          </>
        )}
      </p>

      {/* The next session, large. */}
      {next && nextWhen && (
        <section className="mt-4 rounded-3xl bg-onyx p-5 text-white">
          <p className="font-subtitle text-xs uppercase tracking-[0.14em] opacity-60">A seguir · {nextWhen}</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-subtitle text-2xl font-semibold tracking-tight">{next.customerName}</p>
              <p className="mt-0.5 truncate font-subtitle text-sm opacity-70">{bookingName(next)}</p>
            </div>
            <p className="shrink-0 font-subtitle text-3xl font-semibold lining-nums leading-none">
              {dateParts(next.slot.startsAt).time}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a
              href={customerWhatsappUrl(next.customerPhone, `Olá ${next.customerName}! Sobre a tua sessão de ${bookingName(next)}...`)}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-white/15 font-subtitle text-sm"
            >
              <i className="bx bxl-whatsapp text-lg" aria-hidden="true" />
              WhatsApp
            </a>
            <a
              href={`tel:${next.customerPhone.replace(/[^+\d]/g, '')}`}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-white/15 font-subtitle text-sm"
            >
              <i className="bx bx-phone text-lg" aria-hidden="true" />
              Ligar
            </a>
          </div>
        </section>
      )}

      <div className="mt-5 flex gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-onyx/[0.06] px-4">
          <i className="bx bx-search text-lg text-onyx/40" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar"
            aria-label="Pesquisar cliente ou modelo na agenda"
            className="field-plain h-11 min-w-0 flex-1 bg-transparent font-subtitle text-base text-onyx outline-none placeholder:text-onyx/40"
          />
        </label>
        <button
          type="button"
          onClick={onNew}
          aria-label="Nova marcação"
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-onyx px-4 font-subtitle text-sm font-medium text-white"
        >
          <i className="bx bx-plus text-lg" aria-hidden="true" />
          Nova
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 rounded-xl bg-onyx/[0.06] p-1" role="tablist" aria-label="Agenda">
        {(
          [
            ['proximas', 'Próximas', upcoming.length],
            ['historico', 'Histórico', history.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className="relative flex h-9 items-center justify-center gap-1.5 rounded-[9px] font-subtitle text-sm"
          >
            {view === id && (
              <motion.span
                layoutId="agenda-segment"
                className="absolute inset-0 rounded-[9px] bg-white shadow-sm shadow-black/10 dark:bg-onyx/[0.14]"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            <span className={`relative ${view === id ? 'font-medium text-onyx' : 'text-onyx/55'}`}>{label}</span>
            <span className={`relative text-xs lining-nums ${view === id ? 'text-onyx/60' : 'text-onyx/40'}`}>{count}</span>
          </button>
        ))}
      </div>

      {view === 'proximas' &&
        (upcoming.length === 0 ? (
          <EmptyState
            icon="bx bx-calendar"
            title={needle ? 'Nada encontrado' : 'Sem sessões marcadas'}
            text={
              needle
                ? `Nenhuma sessão corresponde a "${search.trim()}".`
                : 'As sessões confirmadas deste mês aparecem aqui. Muda de mês em cima para ver outros.'
            }
          />
        ) : (
          groupByDay(upcoming).map((dayBookings) => {
            const heading = dayHeading(dayBookings[0].slot.startsAt)
            return (
              <section key={dateKey(dayBookings[0].slot.startsAt)} className="mt-6">
                <div className="flex items-baseline justify-between gap-3 px-1">
                  <h3 className="font-subtitle text-base font-semibold tracking-tight text-onyx">
                    {heading.title}
                    {heading.sub && <span className="ml-2 text-xs font-normal text-muted-dark">{heading.sub}</span>}
                  </h3>
                  <span className="font-subtitle text-xs text-muted-dark">
                    {dayBookings.length} {dayBookings.length === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>
                {/* The day as a timeline: the time on the left, the session on the right. */}
                <ol className="mt-2.5 flex flex-col gap-2.5">
                  {dayBookings.map((booking) => (
                    <AgendaSession key={booking.id} booking={booking} busy={busyId === booking.id} onCancel={onCancel} />
                  ))}
                </ol>
              </section>
            )
          })
        ))}

      {view === 'historico' &&
        (history.length === 0 ? (
          <EmptyState
            icon="bx bx-history"
            title={needle ? 'Nada encontrado' : 'Sem histórico'}
            text={needle ? `Nenhuma sessão corresponde a "${search.trim()}".` : 'As sessões passadas deste mês aparecem aqui.'}
          />
        ) : (
          <div className="mt-5 divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]">
            {history.map((booking) => {
              const { day, month, time } = dateParts(booking.slot.startsAt)
              return (
                <div key={booking.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-10 shrink-0 text-center">
                    <p className="font-subtitle text-lg font-semibold lining-nums leading-none text-onyx">{day}</p>
                    <p className="mt-0.5 font-subtitle text-[10px] uppercase text-muted-dark">{month}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-subtitle text-[15px] font-medium text-onyx">{booking.customerName}</p>
                    <p className="truncate font-subtitle text-xs text-muted-dark">
                      {bookingName(booking)} · {time}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 font-subtitle text-[11px] ${HISTORY_CHIP[booking.status]}`}>
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

/** "hoje às 14:00", "amanhã às 09:00", "em 3 dias". */
function relativeWhen(iso: string) {
  const { time } = dateParts(iso)
  const key = dateKey(iso)
  if (key === dateKey(new Date().toISOString())) return `hoje às ${time}`
  if (key === dateKey(new Date(Date.now() + 86_400_000).toISOString())) return `amanhã às ${time}`
  const days = Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
  return `em ${days} dias`
}

/** One confirmed session: time, customer, model and choices, price, note; WhatsApp, call, and cancel (tap twice). */
function AgendaSession({
  booking,
  busy,
  onCancel,
}: {
  booking: Booking
  busy: boolean
  onCancel: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <li className="flex gap-3">
      <div className="flex w-14 shrink-0 flex-col items-center pt-4">
        <span className="font-subtitle text-base font-semibold lining-nums leading-none text-onyx">
          {dateParts(booking.slot.startsAt).time}
        </span>
        <span className="mt-2 w-px flex-1 bg-onyx/15" aria-hidden="true" />
      </div>
      <article className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-onyx/10 bg-white shadow-sm shadow-black/5">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate font-subtitle text-base font-semibold text-onyx">{booking.customerName}</p>
            <p className="shrink-0 font-subtitle text-sm font-semibold lining-nums text-onyx">
              {formatPrice(bookingPrice(booking)).replace(/,00/, '')}
            </p>
          </div>
          <p className="mt-0.5 font-subtitle text-sm text-muted-dark">
            {booking.service.name}
            {booking.service.durationLabel ? ` · ${booking.service.durationLabel}` : ''}
          </p>
          <BookingChoices booking={booking} className="mt-2" />
          {booking.notes && (
            <p className="mt-2.5 rounded-lg bg-onyx/[0.05] px-3 py-2 font-subtitle text-xs italic text-muted-dark">
              “{booking.notes}”
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 border-t border-onyx/10 font-subtitle text-xs">
          <a
            href={customerWhatsappUrl(
              booking.customerPhone,
              `Olá ${booking.customerName}! Sobre a tua sessão de ${bookingName(booking)}...`,
            )}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1 py-2.5 text-onyx active:bg-onyx/[0.04]"
          >
            <i className="bx bxl-whatsapp text-base" aria-hidden="true" />
            WhatsApp
          </a>
          <a
            href={`tel:${booking.customerPhone.replace(/[^+\d]/g, '')}`}
            className="flex items-center justify-center gap-1 border-l border-onyx/10 py-2.5 text-onyx active:bg-onyx/[0.04]"
          >
            <i className="bx bx-phone text-base" aria-hidden="true" />
            Ligar
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={() => (confirming ? onCancel(booking.id) : setConfirming(true))}
            onBlur={() => setConfirming(false)}
            className={`flex items-center justify-center gap-1 border-l border-onyx/10 py-2.5 disabled:opacity-50 ${
              confirming ? 'bg-red-600 font-medium text-[#ffffff]' : 'text-muted-dark'
            }`}
          >
            <i className="bx bx-x text-base" aria-hidden="true" />
            {confirming ? 'Confirmar' : 'Cancelar'}
          </button>
        </div>
      </article>
    </li>
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
                <h2 className="font-subtitle font-semibold lining-nums tracking-tight text-xl text-onyx">
                  Limpar {monthLabel}
                </h2>
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
                  <p className="font-subtitle font-semibold lining-nums tracking-tight text-2xl leading-none text-red-700">
                    {item.value ?? '…'}
                  </p>
                  <p className="mt-1.5 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 rounded-xl bg-onyx/5 px-4 py-3 font-subtitle text-xs leading-relaxed text-muted-dark">
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
                  className="w-full rounded-xl border border-onyx/15 bg-white px-3 py-2.5 pr-11 font-subtitle text-sm text-onyx outline-none focus-visible:border-red-700"
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
                className="rounded-full glass-chip py-3 font-subtitle text-sm text-onyx transition-colors disabled:opacity-50"
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
  /** Prices by length / parting (PricingEditor). */
  pricing: PricingDraft
  /** Shown for booking; off hides it while keeping its bookings. */
  active: boolean
}

function ServiceDialog({
  form,
  busy,
  error,
  images,
  onImagesChanged,
  onChange,
  onSave,
  onClose,
}: {
  form: ServiceFormState | null
  busy: boolean
  error: string | null
  images: Array<{ id: string }>
  onImagesChanged: () => void
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
    'w-full rounded-xl border border-onyx/15 bg-white px-3 py-2.5 font-subtitle text-base text-onyx outline-none placeholder:text-onyx/30 focus-visible:border-onyx'
  // A field inside a grouped list: no box of its own.
  const plain =
    'field-plain block w-full min-w-0 bg-transparent font-subtitle text-base text-onyx outline-none placeholder:text-onyx/35'
  const section = 'mb-2 px-1 font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark'
  const group =
    'divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]'

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
            className="relative flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            {/* Cancel and save always in reach, as in the iPhone's own sheets. */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-onyx/10 px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="min-w-20 text-left font-subtitle text-[15px] text-onyx/60 disabled:opacity-50"
              >
                Cancelar
              </button>
              <h2 className="truncate font-subtitle text-base font-semibold text-onyx">
                {isNew ? 'Novo modelo' : form.name || 'Editar modelo'}
              </h2>
              <button
                type="submit"
                disabled={busy}
                className="min-w-20 text-right font-subtitle text-[15px] font-semibold text-onyx disabled:opacity-50"
              >
                {busy ? 'A guardar…' : 'Guardar'}
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5">
              {error && (
                <p role="alert" className="rounded-xl bg-red-700/10 px-4 py-3 font-subtitle text-sm text-red-700">
                  {error}
                </p>
              )}

              {/* Photos first: what the customers see. */}
              <section>
                {form.id ? (
                  <ServicePhotos serviceId={form.id} images={images} onChanged={onImagesChanged} />
                ) : (
                  <>
                    <h3 className={section}>Fotos</h3>
                    <p className="rounded-2xl bg-onyx/[0.04] px-4 py-3 font-subtitle text-sm text-muted-dark">
                      Guarda o modelo primeiro. Depois abre-o de novo para juntar fotos.
                    </p>
                  </>
                )}
              </section>

              <section>
                <h3 className={section}>Informação</h3>
                <div className={group}>
                  <label className="block px-4 pb-2 pt-2">
                    <span className="block font-subtitle text-[11px] text-muted-dark">Nome</span>
                    <input
                      value={form.name}
                      onChange={(e) => onChange({ ...form, name: e.target.value })}
                      placeholder="Ex: Twist Braids"
                      maxLength={80}
                      className={`${plain} mt-0.5 h-7`}
                    />
                  </label>
                  <label className="block px-4 pb-2 pt-2">
                    <span className="flex justify-between font-subtitle text-[11px] text-muted-dark">
                      Descrição <span>{form.description.length}/300</span>
                    </span>
                    <textarea
                      value={form.description}
                      onChange={(e) => onChange({ ...form, description: e.target.value })}
                      placeholder="Breve descrição para as clientes"
                      maxLength={300}
                      rows={2}
                      className={`${plain} mt-0.5 resize-none leading-snug`}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="font-subtitle text-[15px] text-onyx">Duração</span>
                    <input
                      value={form.duration}
                      onChange={(e) => onChange({ ...form, duration: e.target.value })}
                      placeholder="Ex: 3–5h"
                      maxLength={40}
                      className={`${plain} w-32 text-right`}
                    />
                  </label>
                </div>
              </section>

              {/* One price, or a price per length / parting. */}
              <section>
                <h3 className={section}>Preço</h3>
                <div className="grid grid-cols-2 rounded-xl bg-onyx/[0.06] p-1" role="tablist" aria-label="Tipo de preço">
                  {(
                    [
                      [false, 'Preço único'],
                      [true, 'Por opções'],
                    ] as const
                  ).map(([on, text]) => (
                    <button
                      key={text}
                      type="button"
                      role="tab"
                      aria-selected={form.pricing.on === on}
                      onClick={() => onChange({ ...form, pricing: { ...form.pricing, on } })}
                      className={`h-9 rounded-[9px] font-subtitle text-sm transition-colors ${
                        form.pricing.on === on ? 'bg-white font-medium text-onyx shadow-sm shadow-black/10 dark:bg-onyx/[0.14]' : 'text-onyx/55'
                      }`}
                    >
                      {text}
                    </button>
                  ))}
                </div>
                <div className="mt-2.5">
                  {form.pricing.on ? (
                    <>
                      <PricingEditor
                        bare
                        draft={form.pricing}
                        onChange={(pricing) => onChange({ ...form, pricing })}
                        fieldClass={fieldClass}
                      />
                      <p className="mt-2 px-1 font-subtitle text-xs text-muted-dark">
                        A cliente escolhe ao marcar; o site mostra “a partir de” o mais baixo.
                      </p>
                    </>
                  ) : (
                    <div className={group}>
                      <label className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="font-subtitle text-[15px] text-onyx">Preço</span>
                        <span className="flex items-center gap-1">
                          <input
                            value={form.price}
                            onChange={(e) => onChange({ ...form, price: e.target.value })}
                            inputMode="decimal"
                            placeholder="65"
                            className={`${plain} w-24 text-right`}
                          />
                          <span className="font-subtitle text-base text-muted-dark">€</span>
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </section>

              {/* Open for booking, as an iPhone switch. */}
              <section>
                <h3 className={section}>Visibilidade</h3>
                <label className={`${group} flex cursor-pointer items-center justify-between gap-4 px-4 py-3`}>
                  <span>
                    <span className="block font-subtitle text-[15px] text-onyx">Disponível para marcar</span>
                    <span className="mt-0.5 block font-subtitle text-xs text-muted-dark">
                      Desligado, fica escondido; as marcações mantêm-se.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => onChange({ ...form, active: e.target.checked })}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                      form.active ? 'bg-onyx' : 'bg-onyx/20'
                    } peer-focus-visible:ring-2 peer-focus-visible:ring-onyx/40`}
                  >
                    <span
                      className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${
                        form.active ? 'left-[1.375rem]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </label>
              </section>
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
                <h2 className="font-subtitle text-xl font-semibold tracking-tight text-onyx">
                  Eliminar {service.name}?
                </h2>
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
                <p className="rounded-xl bg-onyx/5 px-4 py-3 font-subtitle text-sm text-muted-dark">
                  Também serão apagadas <strong>{usage.history}</strong>{' '}
                  {usage.history === 1 ? 'marcação antiga' : 'marcações antigas'} (histórico) deste modelo. Não pode ser
                  desfeito.
                </p>
              ) : (
                <p className="rounded-xl bg-onyx/5 px-4 py-3 font-subtitle text-sm text-muted-dark">
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
                className="rounded-full glass-chip py-3 font-subtitle text-sm text-onyx transition-colors disabled:opacity-50"
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

/** The author's photo when they chose to show it (fetched with the admin's login), otherwise their initial. */
function AuthorAvatar({ testimonial }: { testimonial: Testimonial }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (testimonial.photo !== true) return
    api
      .get<{ dataUrl: string | null }>(`/admin/testimonials/${testimonial.id}/photo`)
      .then((data) => setSrc(data.dataUrl))
      .catch(() => {})
  }, [testimonial.id, testimonial.photo])
  return src ? (
    <img src={src} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-onyx/5 font-logo text-lg text-onyx">
      {testimonial.customer.name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
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
      {/* One switch with the counts, as in the rest of the app. */}
      <div className="mt-5 grid grid-cols-3 rounded-xl bg-onyx/[0.06] p-1" role="tablist" aria-label="Testemunhos">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className="relative flex h-12 flex-col items-center justify-center rounded-[9px] font-subtitle"
          >
            {view === tab.id && (
              <motion.span
                layoutId="testimonials-segment"
                className="absolute inset-0 rounded-[9px] bg-white shadow-sm shadow-black/10 dark:bg-onyx/[0.14]"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            <span className={`relative text-base font-semibold leading-none lining-nums ${view === tab.id ? 'text-onyx' : 'text-onyx/50'}`}>
              {lists[tab.id].length}
            </span>
            <span className={`relative mt-1 text-[11px] ${view === tab.id ? 'text-onyx' : 'text-onyx/55'}`}>{tab.label}</span>
          </button>
        ))}
      </div>

      {view === 'PENDING' && current.length > 0 && (
        <p className="mt-4 px-1 font-subtitle text-xs text-muted-dark">
          Ao aprovar, o testemunho aparece no site e na app com o nome da cliente.
        </p>
      )}

      {current.length === 0 ? (
        <EmptyState icon={emptyText[0]} title={emptyText[1]} text={emptyText[2]} />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {current.map((testimonial) => (
              <TestimonialCard
                key={testimonial.id}
                testimonial={testimonial}
                view={view}
                busy={busyId === testimonial.id}
                onDecision={onDecision}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

/** One testimonial: the author, the words as a quote (long ones fold), and what can be done with it. */
function TestimonialCard({
  testimonial,
  view,
  busy,
  onDecision,
}: {
  testimonial: Testimonial
  view: 'PENDING' | 'APPROVED' | 'REJECTED'
  busy: boolean
  onDecision: (id: string, decision: 'approve' | 'reject') => void
}) {
  const [expanded, setExpanded] = useState(false)
  const long = testimonial.content.length > 220
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      className="overflow-hidden rounded-2xl border border-onyx/10 bg-white shadow-sm shadow-black/5"
    >
      <div className="p-5">
        <div className="flex items-center gap-3">
          <AuthorAvatar testimonial={testimonial} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-subtitle text-base font-semibold text-onyx">{testimonial.customer.name}</p>
            <p className="font-subtitle text-xs text-muted-dark">
              {timeAgo(testimonial.createdAt)}
              {testimonial.photo === true && ' · quer mostrar a foto'}
            </p>
          </div>
          {view !== 'PENDING' && (
            <span
              className={`flex shrink-0 items-center gap-1.5 font-subtitle text-[11px] ${
                view === 'APPROVED' ? 'text-onyx' : 'text-red-700'
              }`}
            >
              <span className={`size-1.5 rounded-full ${view === 'APPROVED' ? 'bg-emerald-500' : 'bg-red-600'}`} />
              {view === 'APPROVED' ? 'No site' : 'Recusado'}
            </span>
          )}
        </div>

        <div className="relative mt-4">
          <span className="absolute -left-1 -top-4 font-display text-5xl leading-none text-onyx/15" aria-hidden="true">
            “
          </span>
          <p
            className={`relative pl-4 font-subtitle text-[15px] leading-relaxed text-onyx ${
              long && !expanded ? 'line-clamp-5' : ''
            }`}
          >
            {testimonial.content}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 pl-4 font-subtitle text-sm font-medium text-onyx underline underline-offset-4"
            >
              {expanded ? 'Ler menos' : 'Ler tudo'}
            </button>
          )}
        </div>
      </div>

      {/* Its actions, across the bottom. */}
      {view === 'PENDING' ? (
        <div className="grid grid-cols-2 gap-2 border-t border-onyx/10 p-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecision(testimonial.id, 'reject')}
            className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-onyx/15 font-subtitle text-sm text-onyx disabled:opacity-50"
          >
            <i className="bx bx-x text-lg" aria-hidden="true" />
            Recusar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecision(testimonial.id, 'approve')}
            className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-onyx font-subtitle text-sm font-medium text-white disabled:opacity-50"
          >
            <i className="bx bx-check text-lg" aria-hidden="true" />
            {busy ? 'A guardar…' : 'Aprovar'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => onDecision(testimonial.id, view === 'APPROVED' ? 'reject' : 'approve')}
          className={`flex w-full items-center justify-center gap-1.5 border-t border-onyx/10 py-3 font-subtitle text-sm disabled:opacity-50 ${
            view === 'APPROVED' ? 'text-muted-dark active:text-red-700' : 'text-onyx'
          }`}
        >
          <i className={`bx ${view === 'APPROVED' ? 'bx-hide' : 'bx-show'} text-base`} aria-hidden="true" />
          {view === 'APPROVED' ? 'Retirar do site' : 'Publicar no site'}
        </button>
      )}
    </motion.article>
  )
}

function PendingCard({
  booking,
  busy,
  onDecision,
}: {
  booking: Booking
  busy: boolean
  onDecision: (id: string, decision: 'accept' | 'reject', reason?: string) => void
}) {
  const [confirmingReject, setConfirmingReject] = useState(false)
  const [reason, setReason] = useState('')
  const { day, month, weekday, time } = dateParts(booking.slot.startsAt)
  const hoursUntil = (new Date(booking.slot.startsAt).getTime() - Date.now()) / 3_600_000
  const urgency =
    hoursUntil < 0
      ? { label: 'Data passada', dot: 'bg-red-600', text: 'text-red-700' }
      : hoursUntil < 24
        ? { label: 'Urgente · menos de 24h', dot: 'bg-amber-500', text: 'text-amber-700' }
        : null

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      className="overflow-hidden rounded-2xl border border-onyx/10 shadow-sm shadow-black/5 bg-white"
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-onyx/5 font-logo text-xl text-onyx">
            {booking.customerName.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-subtitle text-base font-semibold tracking-tight text-onyx">
              {booking.customerName}
            </p>
            <p className="truncate font-subtitle text-xs text-muted-dark">
              {booking.customerPhone} · Recebido {timeAgo(booking.createdAt).toLowerCase()}
            </p>
          </div>
          <a
            href={customerWhatsappUrl(
              booking.customerPhone,
              `Olá ${booking.customerName}! Sobre a tua marcação de ${bookingName(booking)}...`,
            )}
            target="_blank"
            rel="noreferrer"
            aria-label={`WhatsApp de ${booking.customerName}`}
            className="glass-chip flex size-11 shrink-0 items-center justify-center rounded-full text-2xl text-onyx"
          >
            <i className="bx bxl-whatsapp" aria-hidden="true" />
          </a>
        </div>

        <div className="mt-4 rounded-2xl bg-onyx/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-subtitle text-[11px] font-medium uppercase tracking-wide text-muted-dark">Sessão</p>
              <p className="mt-0.5 font-subtitle text-base font-semibold tracking-tight text-onyx first-letter:uppercase">
                {weekday}, {day} {month}
              </p>
            </div>
            <span className="font-subtitle text-2xl font-semibold lining-nums leading-none tracking-tight text-onyx">
              {time}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-onyx/10 pt-3 font-subtitle text-sm">
            <span className="min-w-0 truncate text-onyx">{booking.service.name}</span>
            <span className="shrink-0 font-semibold lining-nums text-onyx">
              {formatPrice(bookingPrice(booking))}
            </span>
          </div>
          <BookingChoices booking={booking} className="mt-2.5" />
          {urgency && (
            <p className={`mt-3 flex items-center gap-2 font-subtitle text-xs font-medium ${urgency.text}`}>
              <span className={`size-2 rounded-full ${urgency.dot}`} aria-hidden="true" />
              {urgency.label}
            </p>
          )}
        </div>

        {booking.notes && (
          <p className="mt-3 border-l-2 border-onyx/25 pl-3 font-subtitle text-sm italic text-muted-dark">
            “{booking.notes}”
          </p>
        )}
      </div>

      <div className="border-t border-onyx/10 p-4">
        {confirmingReject ? (
          <div className="flex flex-col gap-3">
            <p className="font-subtitle text-sm font-semibold text-onyx">Recusar este pedido?</p>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              placeholder="Motivo (opcional, vai no email ao cliente)"
              aria-label="Motivo da recusa"
              className="w-full rounded-xl border bg-white px-3 py-2.5 font-subtitle text-sm text-onyx outline-none placeholder:text-onyx/40"
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmingReject(false)}
                disabled={busy}
                className="glass-chip h-12 rounded-full font-subtitle text-sm text-onyx disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => onDecision(booking.id, 'reject', reason.trim() || undefined)}
                disabled={busy}
                className="glass-chip-on h-12 rounded-full font-subtitle text-sm font-semibold text-red-700 disabled:opacity-50"
              >
                {busy ? 'A recusar...' : 'Sim, recusar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmingReject(true)}
              className="glass-chip flex h-12 items-center justify-center gap-2 rounded-full font-subtitle text-sm text-onyx disabled:opacity-50"
            >
              <i className="bx bx-x text-xl" aria-hidden="true" /> Recusar
            </button>
            <button
              type="button"
              disabled={busy || hoursUntil < 0}
              onClick={() => onDecision(booking.id, 'accept')}
              className="glass-chip-on flex h-12 items-center justify-center gap-2 rounded-full font-subtitle text-sm font-semibold text-onyx disabled:opacity-50"
            >
              <i className="bx bx-check text-xl" aria-hidden="true" /> {busy ? 'A aceitar...' : 'Aceitar'}
            </button>
          </div>
        )}
      </div>
    </motion.article>
  )
}

/** The admin's empty states, all alike: a dark circle with an icon, a title and a line. */
function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-3xl bg-onyx/[0.04] px-6 py-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-onyx text-3xl text-white">
        <i className={icon} aria-hidden="true" />
      </span>
      <p className="mt-5 font-subtitle text-xl font-semibold tracking-tight text-onyx">{title}</p>
      <p className="mt-1.5 max-w-xs font-subtitle text-sm text-muted-dark">{text}</p>
    </div>
  )
}

/** "Pedidos" with nothing waiting: says all is answered, what comes next, and the two things worth doing now. */
function PendingEmpty({
  nextSession,
  openSlotsWeek,
  onAgenda,
  onOpenSlots,
}: {
  nextSession: Booking | null
  openSlotsWeek: number
  onAgenda: () => void
  onOpenSlots: () => void
}) {
  const when = nextSession
    ? new Date(nextSession.slot.startsAt).toLocaleString('pt-PT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null
  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="-mt-6">
        <EmptyState
          icon="bx bx-check"
          title="Tudo em dia"
          text="Não há pedidos à espera de resposta. Quando chegar um novo, recebes uma notificação e ele aparece aqui."
        />
      </div>

      <div className="divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl border border-onyx/10">
        <button type="button" onClick={onAgenda} className="flex w-full items-center gap-4 p-4 text-left active:bg-onyx/[0.04]">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-onyx/[0.06] text-xl text-onyx">
            <i className="bx bx-calendar-check" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-subtitle text-xs uppercase tracking-wide text-muted-dark">Próxima sessão</span>
            {nextSession && when ? (
              <>
                <span className="mt-0.5 block truncate font-subtitle text-base font-semibold text-onyx">
                  {nextSession.customerName}
                </span>
                <span className="block truncate font-subtitle text-sm text-muted-dark">{bookingName(nextSession)}</span>
                <span className="block font-subtitle text-sm text-onyx first-letter:uppercase">{when}</span>
              </>
            ) : (
              <span className="mt-0.5 block font-subtitle text-base text-onyx">Nenhuma sessão confirmada</span>
            )}
          </span>
          <i className="bx bx-chevron-right text-xl text-onyx/30" aria-hidden="true" />
        </button>

        <button type="button" onClick={onOpenSlots} className="flex w-full items-center gap-4 p-4 text-left active:bg-onyx/[0.04]">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-onyx/[0.06] text-xl text-onyx">
            <i className="bx bx-time-five" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-subtitle text-xs uppercase tracking-wide text-muted-dark">Vagas nos próximos 7 dias</span>
            <span className="mt-0.5 block font-subtitle text-base font-semibold text-onyx">
              {openSlotsWeek === 0 ? 'Nenhuma vaga livre' : `${openSlotsWeek} ${openSlotsWeek === 1 ? 'vaga livre' : 'vagas livres'}`}
            </span>
            <span className="block font-subtitle text-sm text-muted-dark">
              {openSlotsWeek === 0 ? 'Abre horários para as clientes poderem marcar.' : 'Abre mais horários se precisares.'}
            </span>
          </span>
          <i className="bx bx-chevron-right text-xl text-onyx/30" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function PendingView({
  bookings,
  busyId,
  onDecision,
  empty,
}: {
  bookings: Booking[]
  busyId: string | null
  onDecision: (id: string, decision: 'accept' | 'reject', reason?: string) => void
  empty: React.ComponentProps<typeof PendingEmpty>
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
  const totalCents = bookings.reduce((sum, b) => sum + bookingPrice(b), 0)

  if (bookings.length === 0) return <PendingEmpty {...empty} />

  return (
    <div>
      <div className="mt-4 rounded-2xl border border-onyx/10 shadow-sm shadow-black/5 bg-white p-5">
        <p className="font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark">
          À espera de resposta
        </p>
        <p className="mt-1 font-subtitle text-[40px] font-semibold lining-nums leading-none tracking-tight text-onyx">
          {bookings.length}
          <span className="ml-2 text-base font-medium text-muted-dark">
            {bookings.length === 1 ? 'pedido' : 'pedidos'}
          </span>
        </p>
        <div className="mt-4 grid grid-cols-2 divide-x divide-onyx/15 border-t border-onyx/10 pt-4">
          <div className="pr-3">
            <p className="font-subtitle text-lg font-semibold lining-nums leading-none tracking-tight text-onyx">
              {thisWeek}
            </p>
            <p className="mt-1.5 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">Nos próx. 7 dias</p>
          </div>
          <div className="pl-4">
            <p className="font-subtitle text-lg font-semibold lining-nums leading-none tracking-tight text-onyx">
              {formatPrice(totalCents)}
            </p>
            <p className="mt-1.5 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">Valor em espera</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex glass-chip rounded-full p-1">
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
                className="glass-chip-on absolute inset-0 rounded-full"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={`relative transition-colors ${order === id ? 'text-onyx' : 'text-onyx/70'}`}>{label}</span>
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

/** The admin panel; the provider lets the tab bar slide away on scroll, like in the customer app. */
export default function AdminDashboardPage() {
  return (
    <NavVisibilityProvider>
      <AdminDashboard />
    </NavVisibilityProvider>
  )
}

function AdminDashboard() {
  const navigate = useNavigate()
  const theme = useTheme()
  const navHidden = useNavHidden()
  const hideOnScroll = useHideNavOnScrollSetting()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  // Who is signed in and what they may use (lib/permissions on the server); before it loads, everything.
  const [me, setMe] = useState<AdminMe | null>(null)
  const meRef = useRef<AdminMe | null>(null)
  const can = (permission: Permission) => !me || me.permissions.includes(permission)
  const isOwner = !me || me.role === 'OWNER'
  // The signed-in admin's photo, shown on the account entry at the top of the "+" menu.
  const [avatar, setAvatar] = useState<string | null>(null)
  // While the "+" or the bell is open, the header's buttons stay sharp above the blur.
  const [openMenus, setOpenMenus] = useState<Record<'plus' | 'bell', boolean>>({ plus: false, bell: false })
  const onPlusOpen = useCallback((open: boolean) => setOpenMenus((m) => ({ ...m, plus: open })), [])
  const onBellOpen = useCallback((open: boolean) => setOpenMenus((m) => ({ ...m, bell: open })), [])
  const anyMenuOpen = openMenus.plus || openMenus.bell
  // The fixed header shrinks a little once the page has scrolled.
  const [headerScrolled, setHeaderScrolled] = useState(false)
  useEffect(() => {
    // Shrinks past 24px and grows back under 8px, so resting near the top doesn't make it flicker.
    const update = () => setHeaderScrolled((was) => (was ? window.scrollY > 8 : window.scrollY > 24))
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  useEffect(() => {
    if (!me?.avatarVersion || !me.id) return
    api
      .get<{ dataUrl: string | null }>(`/auth/avatar/${me.id}`)
      .then((data) => setAvatar(data.dataUrl))
      .catch(() => {})
  }, [me?.id, me?.avatarVersion])
  const [broadcastPreset, setBroadcastPreset] = useState<string | null>(null)
  const [tab, setTab] = useState<AdminTab>(() => {
    const fromHash = window.location.hash.slice(1)
    return TABS.some((t) => t.id === fromHash) || MORE_TARGETS.includes(fromHash as MoreTarget)
      ? (fromHash as AdminTab)
      : 'inicio'
  })
  useAutoHideNav(hideOnScroll, tab)

  // A team member without bookings opens on what they can use.
  useEffect(() => {
    if (!me) return
    const bookingTab = tab === 'pedidos' || tab === 'agenda' || tab === 'disponibilidade' || tab === 'fechos'
    if ((bookingTab && !me.permissions.includes('marcacoes')) || (tab === 'clientes' && !me.permissions.includes('clientes'))) {
      setTab('inicio')
    }
  }, [me, tab])

  // Opening (or coming back to) the app means the notifications were seen: the server zeroes the number on the icon.
  useEffect(() => {
    const seen = () => {
      if (document.visibilityState === 'visible') void api.post('/admin/push-token/seen').catch(() => {})
    }
    seen()
    document.addEventListener('visibilitychange', seen)
    return () => document.removeEventListener('visibilitychange', seen)
  }, [])

  const [services, setServices] = useState<Service[]>([])
  // The first load is in: the Painel shows its blocks instead of placeholders.
  const [loaded, setLoaded] = useState(false)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [error, setError] = useState<string | null>(null)

  const [newDate, setNewDate] = useState('')
  // The "Criar horários" card can be folded away; the choice is remembered on this phone.
  const [createOpen, setCreateOpen] = useState(() => {
    try {
      return localStorage.getItem('afroglow-admin-create-open') === '1'
    } catch {
      return false
    }
  })
  const toggleCreate = () =>
    setCreateOpen((open) => {
      try {
        localStorage.setItem('afroglow-admin-create-open', open ? '0' : '1')
      } catch {
        /* just not remembered */
      }
      return !open
    })
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

  const [manualOpen, setManualOpen] = useState(false)
  const [manualCustomer, setManualCustomer] = useState<AdminCustomer | null>(null)
  const [manualStartsAt, setManualStartsAt] = useState<string | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null)

  const [viewMonth, setViewMonth] = useState(() => getLisbonYearMonth(new Date()))
  const [clearingOpen, setClearingOpen] = useState(false)
  const [clearSummary, setClearSummary] = useState<{ slotCount: number; bookingCount: number } | null>(null)
  const [clearPassword, setClearPassword] = useState('')
  const [clearBusy, setClearBusy] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)
  const [clearAck, setClearAck] = useState(false)
  const [clearResult, setClearResult] = useState<string | null>(null)

  const loadDashboard = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      try {
        // Only what this admin may see (a team member without bookings doesn't load them).
        const has = (p: Permission) => !meRef.current || meRef.current.permissions.includes(p)
        const [servicesData, slotsData, bookingsData, testimonialsData] = await Promise.all([
          // The admin list includes hidden models; an older server without it falls back to the public list.
          has('marcacoes') || has('catalogo')
            ? api.get<Service[]>('/admin/services').catch((err) =>
                err instanceof ApiError && err.status === 404 ? api.get<Service[]>('/services') : Promise.reject(err),
              )
            : Promise.resolve([] as Service[]),
          has('marcacoes') ? api.get<AvailabilitySlot[]>('/admin/availability') : Promise.resolve([] as AvailabilitySlot[]),
          has('marcacoes') || has('estatisticas') ? api.get<Booking[]>('/admin/bookings') : Promise.resolve([] as Booking[]),
          has('testemunhos') ? api.get<Testimonial[]>('/admin/testimonials') : Promise.resolve([] as Testimonial[]),
        ])
        setServices(servicesData)
        setSlots(slotsData)
        setBookings(bookingsData)
        setTestimonials(testimonialsData)
        setLoaded(true)
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
        const who = fullMe(await api.get<Partial<AdminMe> & { email: string }>('/auth/me'))
        meRef.current = who
        setMe(who)
        setAdminEmail(who.email)
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
    setServiceForm({ id: null, name: '', description: '', duration: '', price: '', pricing: draftFromPricing(null), active: true })
  }

  function openEditService(service: Service) {
    setServiceError(null)
    setServiceForm({
      id: service.id,
      name: service.name,
      description: service.description,
      duration: service.durationLabel,
      price: (service.priceCents / 100).toFixed(2),
      pricing: draftFromPricing(service.pricing),
      active: service.active !== false,
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
    const table = pricingFromDraft(serviceForm.pricing)
    if ('error' in table) {
      setServiceError(table.error)
      return
    }
    if (!table.pricing && (serviceForm.price.trim() === '' || Number.isNaN(price) || price < 0)) {
      setServiceError('Preço inválido.')
      return
    }
    setSavingService(true)
    setServiceError(null)
    const payload = {
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim(),
      durationLabel: serviceForm.duration.trim(),
      // With a table the server stores its lowest price as the service's own.
      priceCents: table.pricing ? 0 : Math.round(price * 100),
      pricing: table.pricing,
      active: serviceForm.active,
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

  async function handleBookingDecision(id: string, decision: 'accept' | 'reject' | 'cancel', reason?: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.post(`/admin/bookings/${id}/${decision}`, reason ? { reason } : undefined)
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

  function goToMonth(next: { year: number; month: number }) {
    setViewMonth(next)
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
  // For the bell: the cancellations of the last seven days.
  const recentCancellations = bookings.filter(
    (b) => b.status === 'CANCELLED' && nowMs - new Date(b.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000,
  )

  const monthConfirmedCount = monthBookings.filter((b) => b.status === 'ACCEPTED').length
  const monthRevenueCents = monthBookings
    .filter((b) => b.status === 'ACCEPTED')
    .reduce((sum, b) => sum + bookingPrice(b), 0)

  // The same entries as the "Mais" tab, one tap away from any screen, plus theme and sign out.
  const open = (id: MoreTarget | 'pedidos') => () => {
    setTab(id)
    window.scrollTo({ top: 0 })
  }
  // The "+" at the top: the pages that run the business, most used first (the first one nearest the button). The
  // first five show; "Mais opções" swaps them for the rest and the app's own settings.
  const pages: MenuAction[] = [
    ...(can('marcacoes')
      ? [{ Icon: Inbox, label: 'Pedidos', onClick: open('pedidos') }]
      : []),
    ...(can('catalogo') ? [{ Icon: Scissors, label: 'Serviços', onClick: open('servicos') }] : []),
    ...(can('testemunhos')
      ? [{ Icon: MessageSquareQuote, label: 'Testemunhos', onClick: open('testemunhos') }]
      : []),
    ...(can('estatisticas') ? [{ Icon: ChartColumn, label: 'Estatísticas', onClick: open('estatisticas') }] : []),
    ...(can('marcacoes') ? [{ Icon: CalendarX2, label: 'Dias fechados', onClick: open('fechos') }] : []),
    ...(can('catalogo')
      ? [
          { Icon: Tag, label: 'Promoções', onClick: open('promocoes') },
          { Icon: Images, label: 'Portfólio', onClick: open('portfolio') },
        ]
      : []),
    ...(can('notificacoes') ? [{ Icon: BellRing, label: 'Notificar clientes', onClick: open('notificar') }] : []),
    ...(can('definicoes') ? [{ Icon: Store, label: 'Definições', onClick: open('definicoes') }] : []),
  ]
  const menuActions = pages.slice(0, 5)
  const moreActions: MenuAction[] = [
    ...pages.slice(5),
    {
      Icon: theme.theme === 'dark' ? Sun : Moon,
      label: theme.theme === 'dark' ? 'Tema claro' : 'Tema escuro',
      group: 'app',
      onClick: theme.toggleTheme,
    },
    {
      Icon: hideOnScroll ? PanelTop : PanelTopClose,
      label: hideOnScroll ? 'Menu fixo' : 'Ocultar menu',
      group: 'app',
      onClick: () => setHideNavOnScroll(!hideOnScroll),
    },
    { Icon: LogOut, label: 'Sair', group: 'app', danger: true, confirm: 'Sair?', onClick: () => void handleLogout() },
  ]

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white font-subtitle text-muted-dark">
        A verificar sessão...
      </div>
    )
  }

  return (
    <div className="app-neutral afro-admin relative min-h-screen bg-white font-medium">
      {/* Fixed at the top: the "A" on the left, the theme, the bell and the "+" on the right, all round with a soft shadow.
          Once the page scrolls they shrink a little (each button on its own, so the bell's list and the "+" menu keep
          their place) over a soft fade of the page; back at the top they return to full size. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 z-40 h-[calc(5.5rem+env(safe-area-inset-top))] transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          headerScrolled ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: 'linear-gradient(to bottom, var(--color-white) 55%, transparent)' }}
      />
      <div
        className={`fixed inset-x-0 top-0 ${anyMenuOpen ? 'z-[55]' : 'z-50'} px-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6 sm:pt-[calc(1.5rem+env(safe-area-inset-top))]`}
      >
        <div
          className={`mx-auto flex max-w-5xl items-center justify-between transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            headerScrolled ? '-translate-y-2 sm:-translate-y-3' : ''
          }`}
        >
          <div className={`relative z-[62] origin-left transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${headerScrolled ? 'scale-[0.86]' : ''}`}>
            <HeaderLogo
              still
              onClick={() => {
                // Not while a menu is open: a tap outside it only closes it.
                if (anyMenuOpen) return
                setTab('inicio')
                window.scrollTo({ top: 0 })
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              aria-label={theme.theme === 'dark' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
              title={theme.theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              onClick={() => {
                if (anyMenuOpen) return
                void tap()
                theme.toggleTheme()
              }}
              className={`relative z-[62] flex size-12 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${BRAND_CIRCLE} ${
                headerScrolled ? 'scale-[0.86]' : ''
              }`}
            >
              {theme.theme === 'dark' ? <Sun size={19} strokeWidth={1.9} /> : <Moon size={18} strokeWidth={1.9} />}
            </button>
            <AdminBell
              shrink={headerScrolled}
              requests={can('marcacoes') ? pendingBookings : []}
              testimonials={can('testemunhos') ? pendingTestimonials : []}
              cancelled={can('marcacoes') ? recentCancellations : []}
              onOpen={(kind) => {
                setTab(kind === 'testemunho' ? 'testemunhos' : 'pedidos')
                window.scrollTo({ top: 0 })
              }}
              onOpenChange={onBellOpen}
            />
            <FloatingActionMenu
              actions={menuActions}
              more={moreActions}
              keepOrder
              smallItems
              direction="down"
              small
              brand
              raised
              shrink={headerScrolled}
              onOpenChange={onPlusOpen}
              PlusIcon={Plus}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-5 pb-36 pt-[calc(7rem+env(safe-area-inset-top))] sm:px-8 sm:pt-[calc(8rem+env(safe-area-inset-top))]">
        {error && <p className="mt-6 font-subtitle text-sm text-red-700">{error}</p>}

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* The Painel has its own title, with its board buttons. */}
          {tab !== 'inicio' && (
            <>
              <h1 className="font-subtitle text-[32px] font-semibold leading-none tracking-tight text-onyx">{PAGE[tab].title}</h1>
              <p className="mt-2 font-subtitle text-sm font-light text-muted-dark">{PAGE[tab].hint}</p>
            </>
          )}

          {(tab === 'agenda' || tab === 'disponibilidade') && (
            <MonthStrip value={viewMonth} today={getLisbonYearMonth(new Date())} onSelect={goToMonth} />
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
              onNew={() => {
                setManualCustomer(null)
                setManualOpen(true)
              }}
            />
          )}

          <div key={tab}>
            {tab === 'servicos' && (
              <section className="mt-6">
                {serviceNotice && (
                  <div className="mb-4 flex items-start gap-3 rounded-2xl border border-onyx/10 shadow-sm shadow-black/5 bg-white p-4">
                    <i className="bx bx-check-circle mt-0.5 text-xl text-onyx" aria-hidden="true" />
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
                {/* The catalogue at a glance, and adding one. */}
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-subtitle text-2xl font-semibold lining-nums tracking-tight text-onyx">
                      {services.length} {services.length === 1 ? 'modelo' : 'modelos'}
                    </p>
                    {services.length > 0 && (
                      <p className="mt-0.5 font-subtitle text-sm text-muted-dark">
                        De {formatPrice(Math.min(...services.map((x) => x.priceCents))).replace(/,00/, '')} a{' '}
                        {formatPrice(Math.max(...services.map((x) => x.priceCents))).replace(/,00/, '')}
                        {(() => {
                          const hiddenCount = services.filter((x) => x.active === false).length
                          return hiddenCount ? ` · ${hiddenCount} ${hiddenCount === 1 ? 'escondido' : 'escondidos'}` : ''
                        })()}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={openNewService}
                    className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-onyx px-4 font-subtitle text-sm font-medium text-white"
                  >
                    <i className="bx bx-plus text-lg" aria-hidden="true" />
                    Novo modelo
                  </button>
                </div>

                {/* One row per model: its photo, name, price and options; tap to edit. */}
                <div className="mt-5 flex flex-col gap-3">
                  {services.map((service) => {
                    const photos = serviceImageUrls(service)
                    const photo = photos[0]
                    const { lengths, partings } = optionsOf(service)
                    const options = [...lengths, ...partings]
                    const hidden = service.active === false
                    return (
                      <article
                        key={service.id}
                        className={`overflow-hidden rounded-2xl border border-onyx/10 bg-white shadow-sm shadow-black/5 ${
                          hidden ? 'opacity-70' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => openEditService(service)}
                          className="flex w-full items-stretch gap-4 p-3 text-left active:bg-onyx/[0.03]"
                        >
                          <span className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-onyx/[0.06]">
                            {photo ? (
                              <img src={photo} alt="" loading="lazy" className="size-full object-cover" />
                            ) : (
                              <span className="flex size-full flex-col items-center justify-center gap-1 text-onyx/35">
                                <i className="bx bx-image-add text-2xl" aria-hidden="true" />
                                <span className="font-subtitle text-[10px]">Sem foto</span>
                              </span>
                            )}
                            {photos.length > 1 && (
                              <span className="absolute bottom-1 left-1 rounded-full bg-black/55 px-1.5 py-0.5 font-subtitle text-[10px] text-[#ffffff]">
                                {photos.length} fotos
                              </span>
                            )}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col py-0.5">
                            <span className="flex items-start justify-between gap-2">
                              <span className="truncate font-subtitle text-base font-semibold tracking-tight text-onyx">
                                {service.name}
                              </span>
                              <i className="bx bx-chevron-right shrink-0 text-xl text-onyx/30" aria-hidden="true" />
                            </span>
                            <span className="font-subtitle text-sm text-onyx">
                              {service.pricing ? 'a partir de ' : ''}
                              <strong className="font-semibold lining-nums">
                                {formatPrice(service.priceCents).replace(/,00/, '')}
                              </strong>
                              <span className="text-muted-dark"> · {service.durationLabel}</span>
                            </span>
                            {options.length > 0 && (
                              <span className="mt-1 truncate font-subtitle text-xs text-muted-dark">{options.join(' · ')}</span>
                            )}
                            <span className="mt-auto flex items-center gap-1.5 pt-2 font-subtitle text-[11px]">
                              <span className={`size-1.5 rounded-full ${hidden ? 'bg-onyx/30' : 'bg-emerald-500'}`} />
                              <span className="text-muted-dark">{hidden ? 'Escondido' : 'Disponível para marcar'}</span>
                            </span>
                          </span>
                        </button>
                        <div className="flex border-t border-onyx/10">
                          <button
                            type="button"
                            onClick={() => openEditService(service)}
                            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 font-subtitle text-sm text-onyx active:bg-onyx/[0.04]"
                          >
                            <i className="bx bx-pencil text-base" aria-hidden="true" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteService(service)}
                            className="flex flex-1 items-center justify-center gap-1.5 border-l border-onyx/10 py-2.5 font-subtitle text-sm text-muted-dark active:bg-red-700/10 active:text-red-700"
                          >
                            <i className="bx bx-trash text-base" aria-hidden="true" />
                            Eliminar
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>

                {services.length === 0 && (
                  <EmptyState
                    icon="bx bx-cut"
                    title="Ainda sem modelos"
                    text="Cria o primeiro modelo em “Novo modelo”: nome, duração, preço e fotos."
                  />
                )}

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
                  images={services.find((s) => s.id === serviceForm?.id)?.images ?? []}
                  onImagesChanged={() => void loadDashboard({ silent: true })}
                  onChange={setServiceForm}
                  onSave={saveService}
                  onClose={closeServiceDialog}
                />
              </section>
            )}

            {tab === 'disponibilidade' && (
              <section className="mt-4">
                {scheduleNotice && (
                  <p className="mb-4 rounded-2xl border border-onyx/10 shadow-sm shadow-black/5 bg-white p-4 font-subtitle text-sm text-onyx">
                    {scheduleNotice}
                  </p>
                )}
                {clearResult && (
                  <div className="mb-4 flex items-start gap-3 rounded-2xl border border-onyx/10 shadow-sm shadow-black/5 bg-white p-4">
                    <i className="bx bx-check-circle mt-0.5 text-xl text-onyx" aria-hidden="true" />
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
                {/* The month in one line, each state with its colour (as in the calendar below). */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 font-subtitle text-sm text-muted-dark">
                  {(
                    [
                      ['bg-emerald-500', monthSlots.filter((slot) => slot.status === 'OPEN').length, 'livres'],
                      ['bg-amber-500', monthSlots.filter((slot) => slot.status === 'PENDING').length, 'por confirmar'],
                      ['bg-red-600', monthSlots.filter((slot) => slot.status === 'BOOKED').length, 'reservadas'],
                    ] as const
                  ).map(([dot, count, label]) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <span className={`size-2 rounded-full ${dot}`} />
                      <strong className="font-semibold lining-nums text-onyx">{count}</strong> {label}
                    </span>
                  ))}
                </div>

                {/* What can be done, as one list. */}
                <div className="mt-4 divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]">
                  {[
                    {
                      icon: 'bx bx-calendar-week',
                      title: 'Abrir a semana',
                      text: 'O teu horário habitual em várias semanas de uma vez.',
                      onClick: () => setGenerateOpen(true),
                      expands: false,
                    },
                    {
                      icon: 'bx bx-calendar-plus',
                      title: 'Abrir um dia',
                      text: 'Escolhe o dia e as horas.',
                      onClick: toggleCreate,
                      expands: true,
                    },
                    {
                      icon: 'bx bx-calendar-x',
                      title: 'Dias fechados',
                      text: 'Folga, feriado ou férias: fecha um ou vários dias.',
                      onClick: () => {
                        setTab('fechos')
                        window.scrollTo({ top: 0 })
                      },
                      expands: false,
                    },
                  ].map((row) => (
                    <button
                      key={row.title}
                      type="button"
                      onClick={row.onClick}
                      aria-expanded={row.expands ? createOpen : undefined}
                      className="flex w-full items-center gap-3.5 px-4 py-3 text-left active:bg-onyx/[0.04]"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx text-lg text-white">
                        <i className={row.icon} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-subtitle text-[15px] font-medium text-onyx">{row.title}</span>
                        <span className="block font-subtitle text-xs text-muted-dark">{row.text}</span>
                      </span>
                      <i
                        className={`bx ${row.expands ? 'bx-chevron-down' : 'bx-chevron-right'} text-xl text-onyx/30 transition-transform ${
                          row.expands && createOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>

                {/* "Abrir um dia", opened from the list above. */}
                <form onSubmit={handleCreateSlots}>

                  <AnimatePresence initial={false}>
                    {createOpen && (
                      <motion.div
                        key="create-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 rounded-2xl border border-onyx/10 bg-white p-4 shadow-sm shadow-black/5">
                          <p className="mb-3 flex items-center gap-2 font-subtitle text-sm font-semibold text-onyx">
                            <span className="flex size-6 items-center justify-center rounded-full bg-onyx text-xs text-white">
                              1
                            </span>
                            Escolhe o dia
                          </p>
                          <DatePicker value={newDate} onChange={setNewDate} />
                          <div className="mt-3 flex gap-2">
                            {[
                              ['Hoje', 0],
                              ['Amanhã', 1],
                            ].map(([label, offset]) => {
                              const d = new Date()
                              d.setDate(d.getDate() + Number(offset))
                              const value = dateKey(d.toISOString())
                              return (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => setNewDate(value)}
                                  className={`rounded-full px-3.5 py-2 font-subtitle text-xs font-medium text-onyx ${
                                    newDate === value ? 'glass-chip-on' : 'glass-chip'
                                  }`}
                                >
                                  {label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="mt-3 rounded-2xl border border-onyx/10 bg-white p-4 shadow-sm shadow-black/5">
                          <p className="mb-3 flex items-center gap-2 font-subtitle text-sm font-semibold text-onyx">
                            <span className="flex size-6 items-center justify-center rounded-full bg-onyx text-xs text-white">
                              2
                            </span>
                            Escolhe as horas
                          </p>
                          <TimePicker
                            enabled={Boolean(newDate)}
                            chosen={batchTimes}
                            taken={takenTimes}
                            onChange={setBatchTimes}
                          />
                          {!newDate && (
                            <p className="mt-3 font-subtitle text-xs text-muted-dark">
                              Escolhe primeiro o dia para ativar as horas.
                            </p>
                          )}
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-onyx/10 pt-4">
                          <span className="min-w-0 font-subtitle text-sm text-muted-dark">
                            {batchTimes.length === 0 ? 'Nenhuma hora selecionada' : batchTimes.join(' · ')}
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>

                {slotsByDate.length === 0 ? (
                  <EmptyState
                    icon="bx bx-time-five"
                    title="Sem horários neste mês"
                    text="Abre vagas em “Abrir a semana” ou “Abrir um dia”, acima, para as clientes poderem marcar."
                  />
                ) : (
                  <SlotsDayView
                    slotsByDate={slotsByDate}
                    bookings={bookings}
                    viewMonth={viewMonth}
                    busyId={busyId}
                    onDelete={handleDeleteSlot}
                  />
                )}

                {/* Only when the month has something to clear. */}
                {monthSlots.length > 0 && (
                  // Rarely needed and can't be undone: a quiet line at the end; the dialog asks for the password.
                  <div className="mt-10 border-t border-onyx/10 pt-4 text-center">
                    <button
                      type="button"
                      onClick={openClearPanel}
                      className="inline-flex items-center gap-1.5 font-subtitle text-sm text-red-700/80 dark:text-red-400"
                    >
                      <i className="bx bx-trash text-base" aria-hidden="true" />
                      Limpar {formatMonthLabel(viewMonth)}…
                    </button>
                    <p className="mt-1 font-subtitle text-xs text-muted-dark">
                      Apaga todas as vagas e marcações do mês. Não pode ser desfeito.
                    </p>
                  </div>
                )}

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

            {tab === 'inicio' && (
              <HomeView
                name={me?.name ?? ''}
                bookings={bookings}
                slots={slots}
                services={services}
                testimonials={testimonials}
                loaded={loaded}
                can={can}
                onOpen={(target) => {
                  setTab(target)
                  window.scrollTo({ top: 0 })
                }}
                onNewBooking={(startsAt) => {
                  setManualCustomer(null)
                  setManualStartsAt(startsAt ?? null)
                  setManualOpen(true)
                }}
              />
            )}

            {tab === 'pedidos' && (
              <PendingView
                bookings={pendingBookings}
                busyId={busyId}
                onDecision={(id, decision, reason) => handleBookingDecision(id, decision, reason)}
                empty={{
                  // Across all months, not just the one being viewed.
                  nextSession:
                    bookings
                      .filter((b) => b.status === 'ACCEPTED' && new Date(b.slot.startsAt).getTime() >= nowMs)
                      .sort((a, b) => new Date(a.slot.startsAt).getTime() - new Date(b.slot.startsAt).getTime())[0] ??
                    null,
                  openSlotsWeek: slots.filter((s) => {
                    const t = new Date(s.startsAt).getTime()
                    return s.status === 'OPEN' && t >= nowMs && t < nowMs + 7 * 86_400_000
                  }).length,
                  onAgenda: () => {
                    setTab('agenda')
                    window.scrollTo({ top: 0 })
                  },
                  onOpenSlots: () => {
                    setTab('disponibilidade')
                    window.scrollTo({ top: 0 })
                  },
                }}
              />
            )}

            {tab === 'clientes' && (
              <CustomersView
                refreshKey={bookings.map((b) => b.id + b.status).join()}
                onNotify={
                  can('notificacoes')
                    ? (customer) => {
                        setBroadcastPreset(customer.id)
                        setTab('notificar')
                        window.scrollTo({ top: 0 })
                      }
                    : undefined
                }
                onNewBooking={(customer) => {
                  setManualCustomer(customer)
                  setManualOpen(true)
                }}
              />
            )}

            {tab === 'mais' && (
              <MoreView
                onOpen={(id) => {
                  setTab(id)
                  window.scrollTo({ top: 0 })
                }}
                badges={{ testemunhos: pendingTestimonials.length }}
                can={can}
                isOwner={isOwner}
              />
            )}

            {tab === 'estatisticas' && <StatsView bookings={bookings} />}
            {tab === 'portfolio' && <PortfolioView />}
            {tab === 'seguranca' && <SecurityView onLogout={() => void handleLogout()} />}
            {tab === 'definicoes' && <SettingsView />}
            {tab === 'promocoes' && <PromotionsView services={services} />}
            {tab === 'fechos' && <ClosuresView onChanged={() => void loadDashboard({ silent: true })} />}
            {tab === 'notificar' && <BroadcastView key={broadcastPreset ?? 'todas'} presetCustomerId={broadcastPreset} />}
            {tab === 'equipa' && me && <TeamView meId={me.id} />}

            {tab === 'testemunhos' && (
              <TestimonialsView testimonials={testimonials} busyId={busyId} onDecision={handleTestimonialDecision} />
            )}
          </div>
        </motion.div>
      </main>

      <ManualBookingSheet
        open={manualOpen}
        services={services}
        presetCustomer={manualCustomer}
        presetStartsAt={manualStartsAt}
        slots={slots}
        onClose={() => {
          setManualOpen(false)
          setManualStartsAt(null)
        }}
        onDone={() => void loadDashboard()}
      />
      <GenerateSlotsSheet
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onDone={(message) => {
          setScheduleNotice(message)
          void loadDashboard()
        }}
      />


      {/* Tab bar with the round options button beside it, same as the customer app. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex items-end justify-center gap-2.5 px-3">
        <div className={`min-w-0 ${navHidden ? 'pointer-events-none' : 'pointer-events-auto'}`}>
          <BottomNavBar
            glass
            hidden={navHidden}
            value={(tab === 'seguranca' ? 'seguranca' : MORE_TARGETS.includes(tab as MoreTarget) ? 'mais' : tab) as NavTab | 'seguranca'}
            onChange={(id) => {
              setTab(id)
              window.scrollTo({ top: 0 })
            }}
            compact
            // Pedidos opens from the bell and the "+" at the top instead.
            items={TABS.filter((t) => t.id !== 'pedidos').filter((t) =>
              t.id === 'clientes' ? can('clientes') : t.id === 'mais' || t.id === 'inicio' ? true : can('marcacoes'),
            )
              .map(({ id, label, icon, Icon }): BottomNavItem<NavTab | 'seguranca'> => ({ id, label, icon, Icon }))
              // The account last, with the photo when there is one; it opens the profile.
              .concat({ id: 'seguranca', label: 'Perfil', icon: 'bx bx-user', Icon: UserRound, image: avatar })}
          />
        </div>
        <BackToTop hidden={navHidden} />
      </div>
    </div>
  )
}
