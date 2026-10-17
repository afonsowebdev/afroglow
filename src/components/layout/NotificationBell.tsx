import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { BRAND_CIRCLE } from '@/components/ui/brand-logo'
import { tap } from '@/lib/haptics'

interface Notification {
  id: string
  title: string
  body: string
  bookingId: string | null
  readAt: string | null
  createdAt: string
}

type Filter = 'todas' | 'por-ler' | 'marcacoes' | 'lembretes'
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'todas', label: 'Todas' },
  { id: 'por-ler', label: 'Por ler' },
  { id: 'marcacoes', label: 'Marcações' },
  { id: 'lembretes', label: 'Lembretes' },
]
const isReminder = (n: Notification) => n.title.startsWith('Lembrete')

/** An icon for what a notification is about, from its title. */
function iconFor(n: Notification) {
  const t = n.title.toLowerCase()
  if (isReminder(n)) return 'bx bx-alarm'
  if (/cancel/.test(t)) return 'bx bx-calendar-x'
  if (/recus|não aceit|nao aceit/.test(t)) return 'bx bx-x-circle'
  if (/confirm|aceit/.test(t)) return 'bx bx-calendar-check'
  if (/novo pedido|pedido/.test(t)) return 'bx bx-calendar-plus'
  if (/testemunh/.test(t)) return 'bx bx-message-square-detail'
  return 'bx bx-bell'
}
function matches(n: Notification, filter: Filter) {
  if (filter === 'por-ler') return !n.readAt
  if (filter === 'lembretes') return isReminder(n)
  if (filter === 'marcacoes') return !isReminder(n)
  return true
}

/** "agora", "há 5 min", "há 3 h", "ontem", "12 out". */
function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  if (hours < 48) return 'ontem'
  return new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }).replace('.', '')
}

/**
 * The website's bell, for signed-in customers: the notifications the app would send (booking confirmed, declined,
 * cancelled, reminders), listed newest first, with filters. A red dot marks each unread one until it is opened;
 * each can be deleted, or all of them at once.
 * Checks again every minute and when the tab comes back to the front.
 */
export function NotificationBell({
  tone,
  className,
  plainBadge = false,
  brand = false,
}: {
  tone: 'onLight' | 'onDark'
  /** In the logo's colours (BRAND_CIRCLE) instead of glass, beside the "A". */
  brand?: boolean
  className?: string
  /** The count without the white ring around it (the customer app). */
  plainBadge?: boolean
}) {
  const navigate = useNavigate()
  const [items, setItems] = useState<Notification[] | null>(null)
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  // Ids already shown once, so only notifications that just arrived drop in (and ring the bell).
  const known = useRef<Set<string> | null>(null)
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [ring, setRing] = useState(0)
  const [filter, setFilter] = useState<Filter>('todas')
  const [confirmClear, setConfirmClear] = useState(false)
  // Shown when the server refused a change (the list is reloaded to what it really holds).
  const [failed, setFailed] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ items: Notification[]; unread: number }>('/account/notifications')
      const arrived = known.current ? data.items.filter((n) => !known.current!.has(n.id)).map((n) => n.id) : []
      known.current = new Set(data.items.map((n) => n.id))
      if (arrived.length) {
        setFresh(new Set(arrived))
        setRing((r) => r + 1)
      }
      setItems(data.items)
      setUnread(data.unread)
    } catch {
      // Offline or an older server: the bell just stays quiet.
    }
  }, [])

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0)
    const timer = window.setInterval(() => void load(), 60_000)
    const onVisible = () => document.visibilityState === 'visible' && void load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  // Closes on a click anywhere else or on Esc.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    void tap()
    const next = !open
    setOpen(next)
    setFailed(null)
    if (!next) {
      setFresh(new Set())
      setConfirmClear(false)
    }
  }

  const markRead = (ids: string[]) => {
    const now = new Date().toISOString()
    setItems((list) => list?.map((n) => (ids.includes(n.id) && !n.readAt ? { ...n, readAt: now } : n)) ?? null)
    setUnread((u) => Math.max(0, u - (items ?? []).filter((n) => ids.includes(n.id) && !n.readAt).length))
  }

  // Opening a notification: it counts as seen (its dot goes), then its booking opens.
  const openOne = (n: Notification) => {
    void tap()
    if (!n.readAt) {
      markRead([n.id])
      void api.post(`/account/notifications/${n.id}/read`).catch(() => {})
    }
    setOpen(false)
    navigate(n.bookingId ? `/marcacoes?abrir=${n.bookingId}` : '/marcacoes')
  }

  const readAll = () => {
    markRead((items ?? []).map((n) => n.id))
    setUnread(0)
    void api.post('/account/notifications/read').catch(() => {})
  }

  const remove = (n: Notification) => {
    void tap()
    setItems((list) => list?.filter((x) => x.id !== n.id) ?? null)
    if (!n.readAt) setUnread((u) => Math.max(0, u - 1))
    known.current?.delete(n.id)
    void api.delete(`/account/notifications/${n.id}`).catch(() => {
      setFailed('Não foi possível eliminar. Tenta de novo daqui a pouco.')
      void load()
    })
  }

  const clearAll = () => {
    void tap()
    setItems([])
    setUnread(0)
    setConfirmClear(false)
    void api.delete('/account/notifications').catch(() => {
      setFailed('Não foi possível eliminar. Tenta de novo daqui a pouco.')
      void load()
    })
  }

  const shown = (items ?? []).filter((n) => matches(n, filter))

  return (
    <div ref={root} className="relative">
      {/* While the list is open, the page behind is dimmed and blurred, as with the "+" menu; tapping it closes. */}
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label="Fechar notificações"
            onClick={() => toggle()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 cursor-default bg-black/35 backdrop-blur-md"
          />
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread ? `Notificações, ${unread} por ler` : 'Notificações'}
        aria-expanded={open}
        className={cn(
          'relative flex items-center justify-center rounded-full transition-colors duration-500',
          brand ? BRAND_CIRCLE : cn('liquid-glass', tone === 'onDark' ? 'text-[#ffffff]' : 'text-onyx'),
          className,
        )}
      >
        {/* Swings when a notification arrives. */}
        <motion.span
          key={ring}
          initial={false}
          animate={ring ? { rotate: [0, -18, 15, -10, 6, 0] } : {}}
          transition={{ duration: 0.8 }}
          className="flex origin-top"
        >
          <Bell className="size-[18px]" strokeWidth={1.75} />
        </motion.span>
        {unread > 0 && (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 font-subtitle text-[10px] font-semibold leading-none text-[#ffffff]',
              !plainBadge && 'ring-2 ring-white',
            )}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notificações"
            // Opens out of the bell, as the "+" menu: growing from its corner and coming into focus.
            initial={{ opacity: 0, y: -12, scale: 0.86, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, scale: 0.92, filter: 'blur(6px)', transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="absolute right-0 top-full z-10 mt-3 w-[22rem] origin-top-right overflow-hidden rounded-[26px] bg-white shadow-2xl shadow-black/25 ring-1 ring-onyx/[0.06] max-md:fixed max-md:inset-x-4 max-md:top-[calc(5.5rem+env(safe-area-inset-top))] max-md:mt-0 max-md:w-auto max-md:origin-top"
          >
            <div className="px-5 pb-3 pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-subtitle text-lg font-semibold tracking-tight text-onyx">
                  Notificações
                  {unread > 0 && (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold leading-none text-[#ffffff]">
                      {unread}
                    </span>
                  )}
                </p>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={readAll}
                    className="inline-flex items-center gap-1 font-subtitle text-xs text-onyx/60 hover:text-onyx"
                  >
                    <i className="bx bx-check-double text-base" aria-hidden="true" />
                    Ler todas
                  </button>
                )}
              </div>
              <div
                className="mt-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none]"
                role="tablist"
                aria-label="Filtrar"
              >
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      'shrink-0 rounded-full px-3.5 py-1.5 font-subtitle text-xs font-medium transition-colors',
                      filter === f.id ? 'bg-onyx text-white' : 'bg-onyx/[0.06] text-onyx/70 hover:text-onyx',
                    )}
                  >
                    {f.label}
                    {f.id === 'por-ler' && unread > 0 ? ` · ${unread}` : ''}
                  </button>
                ))}
              </div>
            </div>
            {items === null ? (
              <p className="px-4 py-8 text-center font-subtitle text-sm text-onyx/55">A carregar…</p>
            ) : shown.length === 0 && items.length > 0 ? (
              <p className="px-4 py-10 text-center font-subtitle text-sm text-onyx/55">
                {filter === 'por-ler' ? 'Já viste todas as notificações.' : 'Nada aqui por agora.'}
              </p>
            ) : items.length === 0 ? (
              <div className="px-6 pb-10 pt-6 text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-onyx/[0.06]">
                  <Bell className="size-6 text-onyx/50" strokeWidth={1.5} />
                </span>
                <p className="mt-3 font-subtitle text-sm text-onyx">Ainda sem notificações</p>
                <p className="mt-1 font-subtitle text-xs text-onyx/55">
                  Quando a tua marcação for confirmada, ou antes da sessão, aparece aqui.
                </p>
              </div>
            ) : (
              <ul className="max-h-[24rem] overflow-y-auto px-2 pb-2">
                {shown.map((n, i) => (
                  <motion.li
                    key={n.id}
                    // Each one comes into focus in turn as the panel opens (new ones fall in from above).
                    initial={{ opacity: 0, y: fresh.has(n.id) ? -14 : 6, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.35, delay: 0.06 + Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="group relative">
                      <button
                        type="button"
                        // Opens the booking it is about, with its details (reschedule / cancel) already showing.
                        onClick={() => openOne(n)}
                        className={cn(
                          'flex w-full gap-3 rounded-2xl py-3 pl-3 pr-11 text-left transition-colors active:bg-onyx/[0.05]',
                          !n.readAt && 'bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]',
                        )}
                      >
                        <span
                          className={cn(
                            'relative flex size-10 shrink-0 items-center justify-center rounded-full text-xl',
                            n.readAt ? 'bg-onyx/[0.06] text-onyx/60' : 'bg-onyx text-white',
                          )}
                          aria-hidden="true"
                        >
                          <i className={iconFor(n)} />
                          {!n.readAt && (
                            <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-red-600 ring-2 ring-white" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span
                              className={cn(
                                'font-subtitle text-sm text-onyx',
                                n.readAt ? 'font-medium' : 'font-semibold',
                              )}
                            >
                              {n.title}
                            </span>
                            <span className="shrink-0 font-subtitle text-[11px] text-onyx/45">{ago(n.createdAt)}</span>
                          </span>
                          <span className="mt-0.5 block font-subtitle text-xs leading-relaxed text-onyx/60">
                            {n.body}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(n)}
                        aria-label={`Eliminar notificação: ${n.title}`}
                        className="absolute right-1.5 top-2 flex size-8 items-center justify-center rounded-full text-onyx/35 transition-colors hover:bg-onyx/[0.06] hover:text-onyx"
                      >
                        <X className="size-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
            {failed && (
              <p className="border-t border-onyx/10 px-4 py-2.5 font-subtitle text-xs text-red-700">{failed}</p>
            )}
            {items && items.length > 0 && (
              <div className="flex items-center justify-end gap-3 border-t border-onyx/[0.08] px-5 py-3">
                {confirmClear ? (
                  <>
                    <span className="mr-auto font-subtitle text-xs text-onyx/60">Eliminar todas?</span>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="font-subtitle text-xs text-onyx/60 hover:text-onyx"
                    >
                      Não
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="rounded-full bg-red-600 px-3 py-1 font-subtitle text-xs font-medium text-[#ffffff]"
                    >
                      Sim, eliminar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="font-subtitle text-xs text-red-700 underline-offset-4 hover:underline dark:text-red-400"
                  >
                    Limpar tudo
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
