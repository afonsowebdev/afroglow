import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
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
            // As the iPhone's notification centre: no box, the notifications float over the blurred page.
            initial={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(6px)', transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-10 mt-4 w-[22rem] max-md:fixed max-md:inset-x-3 max-md:top-[calc(5.25rem+env(safe-area-inset-top))] max-md:mt-0 max-md:w-auto"
          >
            <div className="flex items-center justify-between gap-3 px-2">
              <p className="font-subtitle text-[28px] font-bold tracking-tight text-[#ffffff] [text-shadow:0_1px_12px_rgba(0,0,0,0.25)]">
                Notificações
              </p>
              {items && items.length > 0 && (
                <button
                  type="button"
                  onClick={() => (confirmClear ? clearAll() : setConfirmClear(true))}
                  className={cn(
                    'h-8 rounded-full px-3.5 font-subtitle text-[13px] font-semibold backdrop-blur-xl transition-colors',
                    confirmClear
                      ? 'bg-red-600 text-[#ffffff]'
                      : 'bg-white/25 text-[#ffffff] ring-1 ring-white/20 dark:bg-[rgba(255,255,255,0.14)]',
                  )}
                >
                  {confirmClear ? 'Limpar todas?' : 'Limpar'}
                </button>
              )}
            </div>

            {/* The filters as the iPhone's segmented control, in the same frosted material. */}
            <div
              className="mt-3 flex rounded-[11px] bg-white/20 p-[3px] ring-1 ring-white/15 backdrop-blur-xl dark:bg-[rgba(255,255,255,0.1)]"
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
                  className="relative h-8 flex-1 rounded-[8px] font-subtitle text-[12px] font-medium"
                >
                  {filter === f.id && (
                    <motion.span
                      layoutId="notif-filter"
                      className="absolute inset-0 rounded-[8px] bg-white/90 shadow-sm dark:bg-[rgba(255,255,255,0.28)]"
                      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    />
                  )}
                  <span
                    className={cn(
                      'relative',
                      filter === f.id ? 'text-[#1c1c1e] dark:text-[#ffffff]' : 'text-[#ffffff]',
                    )}
                  >
                    {f.label}
                    {f.id === 'por-ler' && unread > 0 ? ` ${unread}` : ''}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3 max-h-[calc(100svh-12rem)] overflow-y-auto pb-2">
              {items === null ? (
                <p className="py-8 text-center font-subtitle text-sm text-[#ffffff]/80">A carregar…</p>
              ) : shown.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="mx-auto size-7 text-[#ffffff]/70" strokeWidth={1.5} />
                  <p className="mt-3 font-subtitle text-[15px] font-semibold text-[#ffffff]">
                    {items.length === 0 ? 'Sem notificações' : 'Nada aqui por agora'}
                  </p>
                  {items.length === 0 && (
                    <p className="mx-auto mt-1 max-w-[16rem] font-subtitle text-[13px] text-[#ffffff]/75">
                      As confirmações e os lembretes das tuas marcações aparecem aqui.
                    </p>
                  )}
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {shown.map((n, i) => (
                    <motion.li
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: fresh.has(n.id) ? -14 : 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -80, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.32, delay: Math.min(i, 8) * 0.035, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {/* Swipe left to delete, as on the iPhone. */}
                      <motion.button
                        type="button"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={{ left: 0.6, right: 0 }}
                        onDragEnd={(_, info) => info.offset.x < -90 && remove(n)}
                        onClick={() => openOne(n)}
                        className="flex w-full items-start gap-3 rounded-[22px] bg-[rgba(245,245,245,0.82)] p-3.5 text-left shadow-[0_4px_18px_rgba(0,0,0,0.12)] backdrop-blur-2xl dark:bg-[rgba(58,44,34,0.82)]"
                      >
                        {/* The app's icon. */}
                        <span
                          aria-hidden="true"
                          className={`flex size-[38px] shrink-0 items-center justify-center rounded-[10px] font-logo text-lg leading-none logo-weight ${BRAND_CIRCLE}`}
                        >
                          <span className="translate-y-[0.1em]">A</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="truncate font-subtitle text-[15px] font-semibold text-onyx">
                              {n.title}
                            </span>
                            <span className="shrink-0 font-subtitle text-[12px] text-onyx/50">{ago(n.createdAt)}</span>
                          </span>
                          <span className="mt-0.5 line-clamp-3 block font-subtitle text-[14px] leading-snug text-onyx/80">
                            {n.body}
                          </span>
                        </span>
                        {!n.readAt && (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-red-600" aria-label="Por ler" />
                        )}
                      </motion.button>
                    </motion.li>
                  ))}
                </ul>
              )}
              {failed && <p className="mt-2 px-2 font-subtitle text-xs text-[#ffffff]">{failed}</p>}
              {unread > 0 && (
                <button
                  type="button"
                  onClick={readAll}
                  className="mx-auto mt-3 block rounded-full bg-white/25 px-4 py-1.5 font-subtitle text-[13px] font-semibold text-[#ffffff] ring-1 ring-white/20 backdrop-blur-xl dark:bg-[rgba(255,255,255,0.14)]"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
