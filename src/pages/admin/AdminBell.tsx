import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_CIRCLE } from '@/components/ui/brand-logo'
import { tap } from '@/lib/haptics'
import { useScrollLock } from '@/lib/use-scroll-lock'
import type { Booking, Testimonial } from '@/lib/types'

type Kind = 'pedido' | 'testemunho' | 'cancelamento'
type Filter = 'todas' | Kind
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'todas', label: 'Todas' },
  { id: 'pedido', label: 'Pedidos' },
  { id: 'testemunho', label: 'Testemunhos' },
  { id: 'cancelamento', label: 'Cancelamentos' },
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
}: {
  requests: Booking[]
  testimonials: Testimonial[]
  cancelled: Booking[]
  onOpen: (kind: Kind) => void
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('todas')
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
        className={cn('relative flex size-12 items-center justify-center rounded-full', open && 'z-[61]', BRAND_CIRCLE)}
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
            <p className="px-2 font-subtitle text-[28px] font-bold tracking-tight text-[#ffffff] [text-shadow:0_1px_12px_rgba(0,0,0,0.25)]">
              Notificações
            </p>

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
                  className="relative h-8 flex-1 rounded-[8px] font-subtitle text-[11.5px] font-medium"
                >
                  {filter === f.id && (
                    <motion.span
                      layoutId="admin-notif-filter"
                      className="absolute inset-0 rounded-[8px] bg-white/90 shadow-sm dark:bg-[rgba(255,255,255,0.28)]"
                      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    />
                  )}
                  <span className={cn('relative', filter === f.id ? 'text-[#1c1c1e] dark:text-[#ffffff]' : 'text-[#ffffff]')}>
                    {f.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3 max-h-[calc(100svh-12rem)] overflow-y-auto pb-2">
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
