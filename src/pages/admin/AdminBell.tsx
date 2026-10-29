import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, CalendarClock, CalendarX2, Check, ListFilter, MessageSquareQuote, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_CIRCLE } from '@/components/ui/brand-logo'
import { tap } from '@/lib/haptics'
import { useScrollLock } from '@/lib/use-scroll-lock'
import type { Booking, Testimonial } from '@/lib/types'

type Kind = 'pedido' | 'testemunho' | 'cancelamento'
type Filter = 'todas' | Kind
const FILTERS: Array<{ id: Filter; label: string; Icon: LucideIcon }> = [
  { id: 'todas', label: 'Todas', Icon: Bell },
  { id: 'pedido', label: 'Pedidos', Icon: CalendarClock },
  { id: 'testemunho', label: 'Testemunhos', Icon: MessageSquareQuote },
  { id: 'cancelamento', label: 'Cancelamentos', Icon: CalendarX2 },
]

interface Item {
  id: string
  kind: Kind
  title: string
  body: string
  at: string
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

/** "sáb, 12 out às 14:00". */
function when(iso: string) {
  const d = new Date(iso)
  const day = d.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
  const time = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  return `${day} às ${time}`
}

/**
 * The admin's bell, beside the account at the top: what is waiting for the owner (requests to accept or refuse,
 * testimonials to approve) and the cancellations of the last week, newest first, in the customer app's bell look.
 * The count on it is what still waits for a decision; tapping a notification opens where it is dealt with.
 */
export function AdminBell({
  requests,
  testimonials,
  cancelled,
  onOpen,
  onOpenChange,
  bare = false,
  shrink = false,
}: {
  requests: Booking[]
  testimonials: Testimonial[]
  cancelled: Booking[]
  onOpen: (kind: Kind) => void
  /** Told when the list opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** A plain 40px round button with no fill, for sitting inside a glass island. */
  bare?: boolean
  /** The round button a little smaller (a header that has scrolled); only the button, so the list keeps its place. */
  shrink?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('todas')
  const [choosing, setChoosing] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  // The page behind stays still while the list is open.
  useScrollLock(open)
  // While the list is open (and a moment after), the "+" and account menus ignore taps.
  useEffect(() => {
    const html = document.documentElement
    if (open) {
      html.dataset.overlay = 'bell'
      return
    }
    const timer = window.setTimeout(() => html.dataset.overlay === 'bell' && delete html.dataset.overlay, 400)
    return () => window.clearTimeout(timer)
  }, [open])
  useEffect(() => onOpenChange?.(open), [open, onOpenChange])

  // Closes on a tap anywhere else or on Esc.
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

  const items: Item[] = [
    ...requests.map((b) => ({
      id: `p-${b.id}`,
      kind: 'pedido' as const,
      title: 'Novo pedido',
      body: `${b.customerName} pediu ${b.service.name} para ${when(b.slot.startsAt)}`,
      at: b.createdAt,
    })),
    ...testimonials.map((t) => ({
      id: `t-${t.id}`,
      kind: 'testemunho' as const,
      title: 'Testemunho por aprovar',
      body: `${t.customer.name}: “${t.content}”`,
      at: t.createdAt,
    })),
    ...cancelled.map((b) => ({
      id: `c-${b.id}`,
      kind: 'cancelamento' as const,
      title: 'Marcação cancelada',
      body: `${b.customerName} · ${b.service.name}, ${when(b.slot.startsAt)}`,
      at: b.updatedAt,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const waiting = requests.length + testimonials.length
  const shown = items.filter((n) => filter === 'todas' || n.kind === filter)

  const toggle = () => {
    if (document.documentElement.dataset.overlay === 'menu') return
    void tap()
    setOpen((current) => !current)
    setChoosing(false)
  }

  return (
    <div ref={root} className="relative">
      {/* While the list is open, everything else is dimmed and blurred and only the bell stays clear. */}
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label="Fechar notificações"
            onClick={toggle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] cursor-default bg-black/50 backdrop-blur-md"
          />
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={toggle}
        aria-label={waiting ? `Notificações, ${waiting} à espera` : 'Notificações'}
        aria-expanded={open}
        className={cn(
          'relative z-[62] flex items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          shrink && 'scale-[0.86]',
          bare ? 'size-10 text-onyx transition-colors hover:bg-onyx/[0.06]' : cn('size-12', BRAND_CIRCLE),
        )}
      >
        <Bell className="size-[18px]" strokeWidth={1.75} />
        {waiting > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 font-subtitle text-[10px] font-semibold leading-none text-[#ffffff]">
            {waiting > 9 ? '9+' : waiting}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notificações"
            initial={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(6px)', transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-[61] mt-4 w-[22rem] max-md:fixed max-md:inset-x-3 max-md:top-[calc(5.25rem+env(safe-area-inset-top))] max-md:mt-0 max-md:w-auto"
          >
            {/* The title, and one button that opens the filters (all of them by default). */}
            <div className="relative flex items-center justify-between gap-3 px-2">
              <p className="font-subtitle text-[28px] font-bold tracking-tight text-[#ffffff] [text-shadow:0_1px_12px_rgba(0,0,0,0.25)]">
                Notificações
              </p>
              <button
                type="button"
                onClick={() => setChoosing((current) => !current)}
                aria-expanded={choosing}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-full px-3.5 font-subtitle text-[13px] font-semibold backdrop-blur-xl transition-colors',
                  filter === 'todas'
                    ? 'bg-white/25 text-[#ffffff] ring-1 ring-white/20 dark:bg-[rgba(255,255,255,0.14)]'
                    : 'bg-white/90 text-[#1c1c1e] dark:bg-[rgba(255,255,255,0.28)] dark:text-[#ffffff]',
                )}
              >
                <ListFilter className="size-4" strokeWidth={2} />
                {filter === 'todas' ? 'Filtrar' : FILTERS.find((f) => f.id === filter)?.label}
              </button>
              {/* The choices as in the "+" and account menus: the name in a pill beside a round white button, on nothing. */}
              <AnimatePresence>
                {choosing && (
                  <div role="menu" className="absolute right-2 top-full z-10 mt-3 flex flex-col items-end gap-1.5">
                    {FILTERS.map(({ id, label, Icon }, index) => (
                      <motion.button
                        key={id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={filter === id}
                        onClick={() => {
                          setFilter(id)
                          setChoosing(false)
                        }}
                        initial={{ opacity: 0, y: -16, scale: 0.9, filter: 'blur(2px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -12, scale: 0.9, filter: 'blur(2px)', transition: { duration: 0.15 } }}
                        transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3, delay: index * 0.04 }}
                        className="flex items-center gap-3"
                      >
                        <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-onyx/10 bg-white px-3.5 py-1.5 font-subtitle text-xs font-medium text-onyx shadow-md shadow-black/10">
                          {label}
                          {filter === id && <Check className="size-3.5" strokeWidth={2.5} />}
                        </span>
                        <span className="flex size-12 items-center justify-center rounded-full border border-onyx/10 bg-white shadow-md shadow-black/10">
                          <Icon size={20} className="text-onyx" />
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Faded while a filter is being chosen, so the choices read clearly over it. */}
            <div
              className={cn(
                'mt-3 max-h-[calc(100svh-12rem)] overflow-y-auto pb-2 transition-opacity duration-200',
                choosing && 'pointer-events-none opacity-15',
              )}
            >
              {shown.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="mx-auto size-7 text-[#ffffff]/70" strokeWidth={1.5} />
                  <p className="mt-3 font-subtitle text-[15px] font-semibold text-[#ffffff]">Nada por agora</p>
                  {items.length === 0 && (
                    <p className="mx-auto mt-1 max-w-[16rem] font-subtitle text-[13px] text-[#ffffff]/75">
                      Os novos pedidos, os testemunhos por aprovar e os cancelamentos aparecem aqui.
                    </p>
                  )}
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-white/15">
                  {shown.map((n, i) => (
                    <motion.li
                      key={n.id}
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.32, delay: Math.min(i, 8) * 0.035, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          void tap()
                          setOpen(false)
                          onOpen(n.kind)
                        }}
                        className="flex w-full items-start gap-3 rounded-2xl px-2 py-3.5 text-left [text-shadow:0_1px_8px_rgba(0,0,0,0.3)] active:bg-white/10"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex size-[38px] shrink-0 items-center justify-center rounded-[10px] font-logo text-lg leading-none logo-weight ${BRAND_CIRCLE}`}
                        >
                          <span className="translate-y-[0.1em]">A</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="truncate font-subtitle text-[15px] font-semibold text-[#ffffff]">{n.title}</span>
                            <span className="shrink-0 font-subtitle text-[12px] text-[#ffffff]/60">{ago(n.at)}</span>
                          </span>
                          <span className="mt-0.5 line-clamp-3 block font-subtitle text-[14px] leading-snug text-[#ffffff]/80">
                            {n.body}
                          </span>
                        </span>
                        {n.kind !== 'cancelamento' && (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-red-600" aria-label="À espera" />
                        )}
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
