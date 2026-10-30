import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  Bell,
  CalendarPlus,
  Camera,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  ListChecks,
  Mail,
  MessageSquareText,
  Phone,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { tap } from '@/lib/haptics'
import { useScrollLock } from '@/lib/use-scroll-lock'
import { customerWhatsappUrl } from '@/lib/site-config'
import { formatPrice, type Booking } from '@/lib/types'
import { STATUS_LABEL, type AdminCustomer, type AdminCustomerDetail } from '@/pages/admin/admin-types'
import { bookingName } from '@/lib/pricing'
import { shrink } from './ServicePhotos'

const LISBON_TZ = 'Europe/Lisbon'
/** The soft shadow of the Painel's cards, and the same on a glass control (keeping its thin rim). */
const CARD_SHADOW = 'var(--card-shadow)'
const GLASS_SHADOW = `inset 0 0 0 1px color-mix(in srgb, var(--color-onyx) 14%, transparent), ${CARD_SHADOW}`
const RED = 'var(--c-cancelled)'
/** The booking states in the Painel's colours. */
const STATUS_COLOUR: Record<Booking['status'], string> = {
  ACCEPTED: 'var(--c-confirmed)',
  PENDING: 'var(--c-waiting)',
  REJECTED: 'var(--c-cancelled)',
  CANCELLED: 'var(--c-cancelled)',
}
const euros = (cents: number) => formatPrice(cents).replace(/,00/, '')

/** "out 2025". */
function monthYear(iso: string) {
  const d = new Date(iso)
  return `${monthShort(d)} ${d.getFullYear()}`
}

const monthShort = (d: Date) => d.toLocaleDateString('pt-PT', { timeZone: LISBON_TZ, month: 'short' }).replace('.', '')

/** "5 out". */
function shortDate(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-PT', { timeZone: LISBON_TZ, day: 'numeric' })} ${monthShort(d)}`
}

/** "AS" for Ana Silva. */
function initialsOf(name: string) {
  const words = name.trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? (words[words.length - 1][0] ?? '') : '')).toUpperCase()
}

/** A sheet from the bottom, as in Horários: a dimmed page behind that stays still, and the content in a white card. */
function BottomSheet({ open, label, busy = false, onClose, children }: { open: boolean; label: string; busy?: boolean; onClose: () => void; children: ReactNode }) {
  useScrollLock(open)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={() => !busy && onClose()}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/** One of the page's figures, in a white card, centred. */
function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-[22px] bg-card px-2 py-3.5 text-center" style={{ boxShadow: CARD_SHADOW }}>
      <p className="max-w-full truncate font-subtitle text-[12px] text-ink-3">{label}</p>
      <p className="tabular mt-1 max-w-full truncate font-subtitle text-[22px] font-semibold leading-tight tracking-tight text-onyx">{value}</p>
    </div>
  )
}

/** A round tick for choosing a row: empty ring, or filled with a check. */
function Tick({ on }: { on: boolean }) {
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full transition-colors"
      style={on ? { background: 'var(--color-onyx)', color: 'var(--color-white)' } : { boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--color-onyx) 25%, transparent)' }}
      aria-hidden="true"
    >
      {on && <Check size={14} strokeWidth={3} />}
    </span>
  )
}

export function CustomersView({
  refreshKey,
  onNewBooking,
  onNotify,
}: {
  /** Changes when bookings change elsewhere, so counts stay fresh. */
  refreshKey: string
  onNewBooking: (customer: AdminCustomer) => void
  /** Opens "Notificar clientes" for this one client (when the admin may send messages). */
  onNotify?: (customer: AdminCustomer) => void
}) {
  const [customers, setCustomers] = useState<AdminCustomer[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminCustomer | null>(null)
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sheetError, setSheetError] = useState<string | null>(null)
  // Deleting: pick one or several (or all), then confirm with the admin's own password.
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sort, setSort] = useState<'recent' | 'sessions' | 'name'>('recent')

  const load = useCallback(async () => {
    try {
      setCustomers(await api.get<AdminCustomer[]>('/admin/customers'))
      setLoadError(null)
    } catch {
      setLoadError('Não foi possível carregar os clientes.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  useEffect(() => {
    if (!selected) return
    setDetail(null)
    setSheetError(null)
    setSaved(false)
    setNotes(selected.adminNotes)
    api
      .get<AdminCustomerDetail>(`/admin/customers/${selected.id}`)
      .then(setDetail)
      .catch(() => setSheetError('Não foi possível carregar o histórico.'))
  }, [selected])

  function reloadDetail() {
    if (!selected) return
    api
      .get<AdminCustomerDetail>(`/admin/customers/${selected.id}`)
      .then(setDetail)
      .catch(() => {})
  }

  const filtered = useMemo(() => {
    if (!customers) return []
    const q = search.trim().toLowerCase()
    if (!q) return customers
    const digits = q.replace(/\s/g, '')
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.replace(/\s/g, '').includes(digits) || (c.email ?? '').toLowerCase().includes(q),
    )
  }, [customers, search])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sort === 'name') return list.sort((a, b) => a.name.localeCompare(b.name, 'pt'))
    if (sort === 'sessions') return list.sort((a, b) => b.bookingCount - a.bookingCount || a.name.localeCompare(b.name, 'pt'))
    return list.sort((a, b) => (b.lastBookingAt ?? b.createdAt).localeCompare(a.lastBookingAt ?? a.createdAt))
  }, [filtered, sort])

  const allPicked = filtered.length > 0 && filtered.every((c) => picked.has(c.id))

  function togglePick(id: string) {
    void tap()
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function stopSelecting() {
    setSelecting(false)
    setPicked(new Set())
  }

  function askDelete(ids: string[]) {
    setPassword('')
    setShowPassword(false)
    setDeleteError(null)
    setConfirmIds(ids)
  }

  async function confirmDelete() {
    if (!confirmIds) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const result = await api.post<{ deleted: number }>('/admin/customers/delete', { ids: confirmIds, password })
      setConfirmIds(null)
      setSelected(null)
      stopSelecting()
      setNotice(result.deleted === 1 ? 'Cliente eliminado.' : `${result.deleted} clientes eliminados.`)
      await load()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Não foi possível eliminar.')
    } finally {
      setDeleting(false)
    }
  }

  async function saveNotes() {
    if (!selected) return
    setSaving(true)
    setSheetError(null)
    try {
      await api.patch(`/admin/customers/${selected.id}/notes`, { adminNotes: notes })
      const trimmed = notes.trim()
      setCustomers((list) => list?.map((c) => (c.id === selected.id ? { ...c, adminNotes: trimmed } : c)) ?? list)
      setSelected({ ...selected, adminNotes: trimmed })
      setSaved(true)
    } catch (err) {
      setSheetError(err instanceof ApiError ? err.message : 'Erro ao guardar as notas.')
    } finally {
      setSaving(false)
    }
  }

  const totalSessions = customers?.reduce((sum, c) => sum + c.bookingCount, 0) ?? 0
  const totalSpent = customers?.reduce((sum, c) => sum + c.spentCents, 0) ?? 0
  const notesChanged = selected ? notes.trim() !== selected.adminNotes.trim() : false
  const sorts = [
    ['recent', 'Recentes'],
    ['sessions', 'Mais sessões'],
    ['name', 'A–Z'],
  ] as const

  return (
    <section className="mt-5">
      {/* All the clients in three figures. */}
      <div className="grid grid-cols-3 gap-2.5">
        <Figure label="Clientes" value={customers ? String(customers.length) : '–'} />
        <Figure label="Sessões" value={customers ? String(totalSessions) : '–'} />
        <Figure label="Faturado" value={customers ? euros(totalSpent) : '–'} />
      </div>

      {/* Search, and choosing several to delete. */}
      <div className="mt-5 flex items-center gap-2">
        <label className="glass-chip flex min-w-0 flex-1 items-center gap-2 rounded-full pe-2 ps-4" style={{ boxShadow: GLASS_SHADOW }}>
          <Search size={16} className="shrink-0 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome ou telemóvel"
            aria-label="Pesquisar clientes"
            className="field-plain h-11 min-w-0 flex-1 !border-0 !bg-transparent !p-0 font-subtitle text-base text-onyx !shadow-none outline-none placeholder:text-onyx/40"
          />
          {search && (
            <button type="button" aria-label="Limpar a pesquisa" onClick={() => setSearch('')} className="flex size-7 shrink-0 items-center justify-center rounded-full bg-onyx/[0.06] text-muted-dark">
              <X size={14} />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => {
            void tap()
            if (selecting) stopSelecting()
            else setSelecting(true)
          }}
          aria-pressed={selecting}
          className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 font-subtitle text-[13px] font-semibold text-onyx ${selecting ? 'glass-chip-on' : 'glass-chip'}`}
          style={selecting ? undefined : { boxShadow: GLASS_SHADOW }}
        >
          {selecting ? <X size={15} /> : <ListChecks size={16} />}
          {selecting ? 'Cancelar' : 'Selecionar'}
        </button>
      </div>

      {/* How to sort, like an iOS segmented control. */}
      <div
        className="glass-chip mt-3 grid grid-cols-3 rounded-full p-1"
        style={{ background: 'color-mix(in srgb, var(--color-onyx) 6%, transparent)', boxShadow: GLASS_SHADOW }}
        role="tablist"
        aria-label="Ordenar"
      >
        {sorts.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={sort === id}
            onClick={() => {
              void tap()
              setSort(id)
            }}
            className="relative h-9 rounded-full font-subtitle text-[13px]"
          >
            {sort === id && (
              <motion.span
                layoutId="customers-sort"
                className="absolute inset-0 rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] dark:bg-onyx/[0.16]"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            <span className={`relative ${sort === id ? 'font-semibold text-onyx' : 'font-medium text-muted-dark'}`}>{label}</span>
          </button>
        ))}
      </div>

      {selecting && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[22px] bg-card px-4 py-3" style={{ boxShadow: CARD_SHADOW }}>
          <button
            type="button"
            onClick={() => {
              void tap()
              setPicked(allPicked ? new Set() : new Set(filtered.map((c) => c.id)))
            }}
            className="flex items-center gap-2.5 font-subtitle text-[14px] text-onyx"
          >
            <Tick on={allPicked} />
            {allPicked ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
          <button
            type="button"
            disabled={picked.size === 0}
            onClick={() => askDelete([...picked])}
            className="flex h-9 items-center gap-1.5 rounded-full px-3.5 font-subtitle text-[13px] font-semibold text-[#ffffff] transition-opacity disabled:opacity-35"
            style={{ background: RED }}
          >
            <Trash2 size={14} />
            Eliminar{picked.size > 0 ? ` (${picked.size})` : ''}
          </button>
        </div>
      )}

      {notice && (
        <div className="mt-3 flex items-center gap-3 rounded-[22px] bg-card px-4 py-3" style={{ boxShadow: CARD_SHADOW }}>
          <Check size={17} className="shrink-0" style={{ color: 'var(--c-confirmed)' }} />
          <p className="flex-1 font-subtitle text-sm text-onyx">{notice}</p>
          <button type="button" aria-label="Fechar aviso" onClick={() => setNotice(null)} className="text-muted-dark">
            <X size={16} />
          </button>
        </div>
      )}
      {loadError && (
        <p className="mt-6 px-1 font-subtitle text-sm" style={{ color: RED }}>
          {loadError}{' '}
          <button type="button" onClick={() => void load()} className="underline">
            Tentar de novo
          </button>
        </p>
      )}
      {!customers && !loadError && <p className="mt-6 px-1 font-subtitle text-sm text-muted-dark">A carregar…</p>}
      {customers && filtered.length === 0 && (
        <div className="mt-5 flex flex-col items-center rounded-[22px] bg-card px-6 py-10 text-center" style={{ boxShadow: CARD_SHADOW }}>
          <span className="glass-chip flex size-16 items-center justify-center rounded-full text-onyx">
            {search ? <Search size={24} /> : <Phone size={24} />}
          </span>
          <p className="mt-5 font-subtitle text-xl font-semibold tracking-tight text-onyx">{search ? 'Nenhum cliente encontrado' : 'Ainda sem clientes'}</p>
          <p className="mt-1.5 max-w-xs font-subtitle text-sm text-muted-dark">
            {search
              ? `Nenhum nome ou telemóvel corresponde a "${search}".`
              : 'As clientes aparecem aqui quando criam conta na app ou no site, ou quando marcas uma sessão por elas.'}
          </p>
        </div>
      )}

      {/* The clients, in one white card. */}
      {sorted.length > 0 && (
        <ul className="mt-5 overflow-hidden rounded-[22px] bg-card" style={{ boxShadow: CARD_SHADOW }}>
          {sorted.map((customer, i) => {
            const isPicked = picked.has(customer.id)
            const fresh = Date.now() - new Date(customer.createdAt).getTime() < 14 * 86_400_000
            const badge: [string, string] | null = !customer.hasAccount
              ? ['Sem conta', 'color-mix(in srgb, var(--color-onyx) 40%, transparent)']
              : fresh
                ? ['Nova', 'var(--c-waiting)']
                : customer.bookingCount >= 3
                  ? ['Fiel', 'var(--c-confirmed)']
                  : null
            return (
              <li key={customer.id} className={`flex items-center ${i ? 'border-t border-onyx/[0.06]' : ''} ${isPicked ? 'bg-onyx/[0.04]' : ''}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (selecting) togglePick(customer.id)
                    else {
                      void tap()
                      setSelected(customer)
                    }
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 text-left transition-colors active:bg-onyx/[0.03]"
                >
                  {selecting && <Tick on={isPicked} />}
                  <span className="glass-chip flex size-11 shrink-0 items-center justify-center rounded-full font-subtitle text-[14px] font-semibold text-onyx">
                    {initialsOf(customer.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-subtitle text-[15px] font-semibold text-onyx">{customer.name}</span>
                      {badge && (
                        <span
                          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-subtitle text-[10px] font-semibold text-onyx"
                          style={{ background: `color-mix(in srgb, ${badge[1]} 16%, transparent)` }}
                        >
                          <span className="size-1.5 rounded-full" style={{ background: badge[1] }} aria-hidden="true" />
                          {badge[0]}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate font-subtitle text-xs text-muted-dark">
                      {customer.bookingCount} {customer.bookingCount === 1 ? 'sessão' : 'sessões'} · <span className="amount">{euros(customer.spentCents)}</span>
                      {customer.lastBookingAt ? ` · última a ${shortDate(customer.lastBookingAt)}` : ''}
                    </span>
                  </span>
                </button>
                {!selecting && (
                  <a
                    href={customerWhatsappUrl(customer.phone, `Olá ${customer.name}! `)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`WhatsApp de ${customer.name}`}
                    className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full text-lg text-onyx active:scale-95"
                  >
                    <i className="bx bxl-whatsapp" aria-hidden="true" />
                  </a>
                )}
                {!selecting && <ChevronRight size={18} className="mx-2.5 shrink-0 text-ink-3" />}
              </li>
            )
          })}
        </ul>
      )}

      {/* One client's file. */}
      <BottomSheet open={Boolean(selected)} label={selected?.name ?? 'Cliente'} busy={saving} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <div className="flex items-center gap-3 px-5 pb-3 pt-5">
              <span className="glass-chip flex size-12 shrink-0 items-center justify-center rounded-full font-subtitle text-[16px] font-semibold text-onyx">
                {initialsOf(selected.name)}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-subtitle text-[19px] font-semibold tracking-tight text-onyx">{selected.name}</h2>
                <p className="truncate font-subtitle text-xs text-muted-dark">
                  {selected.phone}
                  {selected.email ? ` · ${selected.email}` : ' · sem conta'}
                </p>
              </div>
              <button type="button" aria-label="Fechar" onClick={() => setSelected(null)} className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full text-onyx">
                <X size={16} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-1 [&>*]:shrink-0">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Sessões', String(selected.bookingCount)],
                  ['Gastou', euros(selected.spentCents)],
                  ['Desde', monthYear(selected.createdAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex min-w-0 flex-col items-center rounded-2xl bg-card px-2 py-2.5 text-center" style={{ boxShadow: CARD_SHADOW }}>
                    <p className="font-subtitle text-[11px] text-ink-3">{label}</p>
                    <p className="tabular mt-0.5 max-w-full truncate font-subtitle text-[17px] font-semibold text-onyx">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <a
                  href={customerWhatsappUrl(selected.phone, `Olá ${selected.name}! `)}
                  target="_blank"
                  rel="noreferrer"
                  className="glass-chip flex h-11 items-center justify-center gap-1.5 rounded-full font-subtitle text-[13px] font-semibold text-onyx"
                >
                  <i className="bx bxl-whatsapp text-lg" aria-hidden="true" />
                  WhatsApp
                </a>
                <a href={`tel:${selected.phone.replace(/\s/g, '')}`} className="glass-chip flex h-11 items-center justify-center gap-1.5 rounded-full font-subtitle text-[13px] font-semibold text-onyx">
                  <Phone size={15} strokeWidth={2.2} />
                  Ligar
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const customer = selected
                    setSelected(null)
                    onNewBooking(customer)
                  }}
                  className="glass-chip flex h-11 items-center justify-center gap-1.5 rounded-full font-subtitle text-[13px] font-semibold text-onyx"
                >
                  <CalendarPlus size={15} strokeWidth={2.2} />
                  Marcar
                </button>
              </div>

              {/* What her visits say, as small chips. */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  detail?.summary?.favouriteService && `Prefere ${detail.summary.favouriteService}`,
                  detail?.summary?.everyDays && `Volta a cada ${detail.summary.everyDays} dias`,
                  detail?.summary && detail.summary.visits > 0 && `Média de ${euros(detail.summary.averageCents)}`,
                  detail?.summary && detail.summary.cancelled > 0 && `${detail.summary.cancelled} ${detail.summary.cancelled === 1 ? 'cancelada' : 'canceladas'}`,
                ]
                  .filter(Boolean)
                  .map((text) => (
                    <span key={String(text)} className="rounded-full bg-onyx/[0.05] px-2.5 py-1 font-subtitle text-[11px] font-medium text-onyx">
                      {text}
                    </span>
                  ))}
                <span className="flex items-center gap-1.5 rounded-full bg-onyx/[0.05] px-2.5 py-1 font-subtitle text-[11px] font-medium text-onyx">
                  {selected.reminderChannel === 'PHONE' ? <MessageSquareText size={12} /> : <Mail size={12} />}
                  Lembrete por {selected.reminderChannel === 'PHONE' ? 'mensagem' : 'email'}
                </span>
              </div>

              {/* Private notes, saved right here. */}
              <div>
                <p className="mb-2 px-1 font-subtitle text-[12px] font-semibold text-muted-dark">Notas · só tu vês</p>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value)
                    setSaved(false)
                  }}
                  rows={3}
                  maxLength={1000}
                  placeholder="Preferências, alergias, tamanho…"
                  className="glass-chip w-full resize-none rounded-[20px] !border-0 px-4 py-3 font-subtitle text-[14px] text-onyx outline-none placeholder:text-onyx/40"
                />
                {(notesChanged || saved) && (
                  <div className="mt-2 flex items-center justify-end gap-2">
                    {saved && !notesChanged ? (
                      <span className="flex items-center gap-1 font-subtitle text-xs text-muted-dark">
                        <Check size={13} style={{ color: 'var(--c-confirmed)' }} /> Guardado
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void saveNotes()}
                        className="glass-chip-on flex h-9 items-center gap-1.5 rounded-full px-4 font-subtitle text-[13px] font-semibold text-onyx disabled:opacity-50"
                      >
                        <Check size={14} strokeWidth={2.4} />
                        {saving ? 'A guardar…' : 'Guardar notas'}
                      </button>
                    )}
                  </div>
                )}
                {sheetError && <p className="mt-2 px-1 font-subtitle text-xs" style={{ color: RED }}>{sheetError}</p>}
              </div>

              <CustomerPhotos customerId={selected.id} photos={detail?.photos} onChanged={reloadDetail} />

              {/* Every booking, newest first. */}
              <div>
                <p className="mb-2 px-1 font-subtitle text-[12px] font-semibold text-muted-dark">
                  Marcações{detail ? ` · ${detail.bookings.length}` : ''}
                </p>
                {!detail && !sheetError && <p className="px-1 font-subtitle text-sm text-muted-dark">A carregar…</p>}
                {detail && detail.bookings.length === 0 && <p className="px-1 font-subtitle text-sm text-muted-dark">Sem marcações.</p>}
                {detail && detail.bookings.length > 0 && (
                  <div className="overflow-hidden rounded-[20px] bg-card" style={{ boxShadow: CARD_SHADOW }}>
                    {detail.bookings.map((b, i) => {
                      const colour = STATUS_COLOUR[b.status]
                      const d = new Date(b.slot.startsAt)
                      return (
                        <div key={b.id} className={`flex items-center gap-3 px-3.5 py-3 ${i ? 'border-t border-onyx/[0.06]' : ''}`}>
                          <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-onyx/[0.04]">
                            <p className="tabular font-subtitle text-[15px] font-semibold leading-none text-onyx">
                              {d.toLocaleDateString('pt-PT', { timeZone: LISBON_TZ, day: 'numeric' })}
                            </p>
                            <p className="mt-0.5 font-subtitle text-[9px] uppercase text-muted-dark">
                              {d.toLocaleDateString('pt-PT', { timeZone: LISBON_TZ, month: 'short' }).replace('.', '')}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-subtitle text-[14px] font-medium text-onyx">{bookingName(b)}</p>
                            <p className="truncate font-subtitle text-xs text-muted-dark">
                              {d.toLocaleTimeString('pt-PT', { timeZone: LISBON_TZ, hour: '2-digit', minute: '2-digit' })}
                              {d.getFullYear() !== new Date().getFullYear() ? ` · ${d.getFullYear()}` : ''}
                            </p>
                          </div>
                          <span
                            className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-subtitle text-[11px] font-medium text-onyx"
                            style={{ background: `color-mix(in srgb, ${colour} 14%, transparent)` }}
                          >
                            <span className="size-1.5 rounded-full" style={{ background: colour }} aria-hidden="true" />
                            {STATUS_LABEL[b.status]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {onNotify && selected.hasAccount && (
                <button
                  type="button"
                  onClick={() => {
                    const customer = selected
                    setSelected(null)
                    onNotify(customer)
                  }}
                  className="glass-chip flex h-11 items-center justify-center gap-2 rounded-full font-subtitle text-[13px] font-semibold text-onyx"
                >
                  <Bell size={15} strokeWidth={2.2} />
                  Enviar uma notificação
                </button>
              )}
              <button
                type="button"
                onClick={() => askDelete([selected.id])}
                className="flex items-center justify-center gap-1.5 self-center py-1 font-subtitle text-[13px] font-medium"
                style={{ color: RED }}
              >
                <Trash2 size={14} />
                Eliminar este cliente
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      {/* Deleting, confirmed with the admin's password (like Limpar o mês). */}
      <BottomSheet open={confirmIds !== null} label="Eliminar" busy={deleting} onClose={() => setConfirmIds(null)}>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            if (password && !deleting) void confirmDelete()
          }}
        >
          <div className="flex items-center gap-3 px-5 pb-3 pt-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${RED} 13%, transparent)`, color: RED }}>
              <Trash2 size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-subtitle text-[19px] font-semibold tracking-tight text-onyx">
                {confirmIds && confirmIds.length > 1 ? `Eliminar ${confirmIds.length} clientes` : 'Eliminar cliente'}
              </h2>
              <p className="truncate font-subtitle text-xs text-muted-dark">Não se pode desfazer.</p>
            </div>
            <button type="button" aria-label="Fechar" onClick={() => setConfirmIds(null)} disabled={deleting} className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full text-onyx">
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-4 px-5 pb-4 pt-1">
            <p className="flex items-start gap-2.5 rounded-[20px] px-4 py-3 font-subtitle text-[13px] leading-snug text-onyx" style={{ background: `color-mix(in srgb, ${RED} 9%, transparent)` }}>
              <TriangleAlert size={16} className="mt-0.5 shrink-0" style={{ color: RED }} />
              As sessões futuras são canceladas e os horários ficam livres. Os dados pessoais e testemunhos são apagados.
            </p>
            <div>
              <p className="mb-2 px-1 font-subtitle text-[12px] font-semibold text-muted-dark">Confirma com a tua password</p>
              <label className="glass-chip flex h-12 items-center gap-2 rounded-full pe-1.5 ps-4">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  aria-label="Password"
                  className="field-plain h-full min-w-0 flex-1 !border-0 !bg-transparent !p-0 font-subtitle text-base text-onyx !shadow-none outline-none"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Esconder password' : 'Mostrar password'}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-dark"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </label>
            </div>
            {deleteError && <p className="px-1 font-subtitle text-sm" style={{ color: RED }}>{deleteError}</p>}
          </div>
          <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-1">
            <button
              type="submit"
              disabled={!password || deleting}
              className={`flex h-14 w-full items-center gap-3 rounded-full pe-2 ps-5 text-left transition-all active:scale-[0.98] ${password ? 'text-[#ffffff]' : 'bg-card text-onyx opacity-60'}`}
              style={password ? { background: RED, boxShadow: CARD_SHADOW } : { boxShadow: CARD_SHADOW }}
            >
              <Trash2 size={19} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate font-subtitle text-[15px] font-semibold">
                {deleting ? 'A eliminar…' : confirmIds && confirmIds.length > 1 ? `Eliminar ${confirmIds.length} clientes` : 'Eliminar'}
              </span>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${password ? 'bg-white/20' : 'bg-onyx/[0.05]'}`}>
                <ArrowRight size={18} />
              </span>
            </button>
          </div>
        </form>
      </BottomSheet>
    </section>
  )
}

const photoCache = new Map<string, string>()

/** One private photo, loaded with the admin's login (as a data URL) and kept for the session. */
function PrivatePhoto({ customerId, id, onOpen }: { customerId: string; id: string; onOpen: (src: string) => void }) {
  const [src, setSrc] = useState(() => photoCache.get(id) ?? null)
  useEffect(() => {
    if (src) return
    api
      .get<{ dataUrl: string }>(`/admin/customers/${customerId}/photos/${id}`)
      .then((data) => {
        photoCache.set(id, data.dataUrl)
        setSrc(data.dataUrl)
      })
      .catch(() => {})
  }, [customerId, id, src])
  return (
    <button type="button" onClick={() => src && onOpen(src)} className="aspect-square overflow-hidden rounded-2xl bg-onyx/[0.06] active:opacity-70">
      {src && <img src={src} alt="" className="size-full object-cover" />}
    </button>
  )
}

/**
 * Photos of the client's hair kept in the admin (the finished style, before and after…): add from the phone, tap to
 * see it large, delete from there. The client never sees them.
 */
function CustomerPhotos({
  customerId,
  photos,
  onChanged,
}: {
  customerId: string
  photos?: Array<{ id: string; createdAt: string }>
  onChanged: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{ id: string; src: string } | null>(null)
  const [confirming, setConfirming] = useState(false)

  if (!photos) return null

  async function add(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setError(null)
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        await api.post(`/admin/customers/${customerId}/photos`, { contentType: 'image/jpeg', data: await shrink(file) })
      }
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível guardar a foto.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  async function remove() {
    if (!viewer) return
    try {
      await api.delete(`/admin/customers/${customerId}/photos/${viewer.id}`)
      setViewer(null)
      setConfirming(false)
      onChanged()
    } catch {
      setError('Não foi possível apagar a foto.')
    }
  }

  return (
    <div>
      <p className="mb-2 px-1 font-subtitle text-[12px] font-semibold text-muted-dark">Fotos · só tu vês</p>
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="glass-chip flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl font-subtitle text-[11px] font-semibold text-onyx disabled:opacity-50"
        >
          <Camera size={20} />
          {busy ? 'A enviar…' : 'Juntar'}
        </button>
        {photos.map((p) => (
          <PrivatePhoto key={p.id} customerId={customerId} id={p.id} onOpen={(src) => setViewer({ id: p.id, src })} />
        ))}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void add(e.target.files)} />
      {error && <p className="mt-2 px-1 font-subtitle text-xs" style={{ color: RED }}>{error}</p>}

      {viewer && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-black">
          <div className="flex items-center justify-between px-3 pt-[env(safe-area-inset-top)] text-white">
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => {
                setViewer(null)
                setConfirming(false)
              }}
              className="flex size-11 items-center justify-center rounded-full bg-white/10"
            >
              <X size={18} />
            </button>
            <button
              type="button"
              onClick={() => (confirming ? void remove() : setConfirming(true))}
              className={`flex h-11 items-center gap-1.5 rounded-full px-4 font-subtitle text-sm font-semibold ${confirming ? '' : 'bg-white/10'}`}
              style={confirming ? { background: RED } : undefined}
            >
              <Trash2 size={16} />
              {confirming && 'Apagar a foto'}
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-3">
            <img src={viewer.src} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}
