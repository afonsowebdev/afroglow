import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { tap } from '@/lib/haptics'

interface Notification {
  id: string
  title: string
  body: string
  bookingId: string | null
  readAt: string | null
  createdAt: string
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
 * cancelled, reminders), listed newest first. A red count shows the unread ones; opening the list marks them read.
 * Checks again every minute and when the tab comes back to the front.
 */
export function NotificationBell({ tone, className }: { tone: 'onLight' | 'onDark'; className?: string }) {
  const navigate = useNavigate()
  const [items, setItems] = useState<Notification[] | null>(null)
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  // Ids already shown once, so only notifications that just arrived drop in (and ring the bell).
  const known = useRef<Set<string> | null>(null)
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [ring, setRing] = useState(0)

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
    if (!next) setFresh(new Set())
    if (next && unread > 0) {
      setUnread(0)
      void api.post('/account/notifications/read').catch(() => {})
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread ? `Notificações, ${unread} por ler` : 'Notificações'}
        aria-expanded={open}
        className={cn(
          'liquid-glass relative flex items-center justify-center rounded-full transition-colors duration-500',
          tone === 'onDark' ? 'text-[#ffffff]' : 'text-onyx',
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
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 font-subtitle text-[10px] font-semibold leading-none text-[#ffffff] ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notificações"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-10 mt-3 w-[22rem] origin-top-right max-md:fixed max-md:inset-x-4 max-md:top-[calc(5.5rem+env(safe-area-inset-top))] max-md:mt-0 max-md:w-auto overflow-hidden rounded-2xl border border-onyx/10 bg-white shadow-xl shadow-black/15"
          >
            <div className="flex items-center justify-between border-b border-onyx/10 px-4 py-3">
              <p className="font-subtitle text-sm font-medium text-onyx">Notificações</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate('/marcacoes')
                }}
                className="font-subtitle text-xs text-onyx/60 underline-offset-4 hover:text-onyx hover:underline"
              >
                As minhas marcações
              </button>
            </div>
            {items === null ? (
              <p className="px-4 py-8 text-center font-subtitle text-sm text-onyx/55">A carregar…</p>
            ) : items.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Bell className="mx-auto size-6 text-onyx/30" strokeWidth={1.5} />
                <p className="mt-3 font-subtitle text-sm text-onyx">Ainda sem notificações</p>
                <p className="mt-1 font-subtitle text-xs text-onyx/55">
                  Quando a tua marcação for confirmada, ou antes da sessão, aparece aqui.
                </p>
              </div>
            ) : (
              <ul className="max-h-[22rem] divide-y divide-onyx/10 overflow-y-auto">
                {items.map((n, i) => (
                  <motion.li
                    key={n.id}
                    // New ones fall in from above, one after another.
                    initial={fresh.has(n.id) ? { opacity: 0, y: -14 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <button
                      type="button"
                      // Opens the booking it is about, with its details (reschedule / cancel) already showing.
                      onClick={() => {
                        setOpen(false)
                        navigate(n.bookingId ? `/marcacoes?abrir=${n.bookingId}` : '/marcacoes')
                      }}
                      className="flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-onyx/[0.03]"
                    >
                      <span
                        className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-red-600')}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-subtitle text-sm font-medium text-onyx">{n.title}</span>
                          <span className="shrink-0 font-subtitle text-[11px] text-onyx/45">{ago(n.createdAt)}</span>
                        </span>
                        <span className="mt-0.5 block font-subtitle text-xs leading-relaxed text-onyx/60">{n.body}</span>
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
