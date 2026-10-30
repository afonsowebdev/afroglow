import { useEffect, useState, type ComponentType } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ChevronRight } from 'lucide-react'
import type { MenuAction } from '@/components/ui/floating-action-button'
import { tap } from '@/lib/haptics'
import { useScrollLock } from '@/lib/use-scroll-lock'

/** One soft colour per main action, so the grid reads at a glance (the Google Photos way). */
const TINTS = ['#fabf00', '#8b5cf6', '#ec4899', '#16a34a', '#fa2e23', '#3b82f6']
const CARD = 'bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_20px_-12px_rgba(0,0,0,0.18)]'

/**
 * What the "+" opens, the Google Photos way, in the iPhone's sheet look: it rises from the bottom on a light grey, with
 * the main thing to do (a new booking) as a white pill on top, the main actions as white tiles with their icon on a soft
 * colour, and the rest grouped in a white card (signing out on its own at the end, asking once more).
 */
export function PlusSheet({
  open,
  actions,
  more,
  primary,
  onClose,
}: {
  open: boolean
  actions: MenuAction[]
  more: MenuAction[]
  /** The one thing done most: a pill on top. */
  primary?: { label: string; Icon: ComponentType<{ size?: number; className?: string }>; onClick: () => void }
  onClose: () => void
}) {
  const [confirming, setConfirming] = useState<string | null>(null)
  useScrollLock(open)
  useEffect(() => {
    if (!open) {
      setConfirming(null)
      return
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const run = (action: MenuAction) => {
    if (action.confirm && confirming !== action.label) {
      void tap()
      setConfirming(action.label)
      return
    }
    void tap()
    onClose()
    action.onClick?.()
  }
  const glyph = (action: MenuAction, size: number, className = '') =>
    action.Icon ? (
      <action.Icon size={size} className={className} />
    ) : (
      <i className={`${action.iconClass ?? ''} ${className}`} style={{ fontSize: size + 2 }} aria-hidden="true" />
    )

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Ações"
            data-no-pull
            className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[30px] bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) onClose()
            }}
          >
            {/* The handle: pull it down to close. */}
            <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-onyx/15" aria-hidden="true" />

            {/* The main thing to do, on top. */}
            {primary && (
              <motion.button
                type="button"
                onClick={() => {
                  void tap('medium')
                  onClose()
                  primary.onClick()
                }}
                className={`mb-3 flex h-14 w-full items-center gap-3 rounded-full pe-2 ps-5 text-left active:scale-[0.98] ${CARD}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                <primary.Icon size={19} className="shrink-0 text-onyx" />
                <span className="min-w-0 flex-1 truncate font-subtitle text-[15px] font-semibold text-onyx">{primary.label}</span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
                  <ArrowRight size={18} />
                </span>
              </motion.button>
            )}

            {/* The main actions, as white tiles, each icon on its own soft colour. */}
            <div className="grid grid-cols-3 gap-2.5">
              {actions.map((action, i) => {
                const tint = TINTS[i % TINTS.length]
                return (
                  <motion.button
                    key={action.label}
                    type="button"
                    onClick={() => run(action)}
                    className={`flex flex-col items-center gap-2 rounded-[20px] px-1.5 pb-3 pt-3.5 active:scale-95 ${CARD}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: 0.08 + i * 0.035, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span
                      className="relative flex size-11 items-center justify-center rounded-full"
                      style={{ background: `color-mix(in srgb, ${tint} 15%, transparent)`, color: tint }}
                    >
                      {glyph(action, 20)}
                      {action.badge ? (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-[#ffffff] ring-2 ring-white">
                          {action.badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="line-clamp-2 text-center font-subtitle text-[12px] font-semibold leading-tight text-onyx">{action.label}</span>
                  </motion.button>
                )
              })}
            </div>

            {/* The rest, grouped in a white card; signing out on its own at the end. */}
            {[more.filter((m) => !m.danger), more.filter((m) => m.danger)].map((list, part) =>
              list.length === 0 ? null : (
                <div key={part}>
                  {part === 0 && <p className="mb-2 mt-5 px-2 font-subtitle text-[12px] font-semibold text-muted-dark">Mais</p>}
                  <div className={`overflow-hidden rounded-[22px] ${CARD} ${part === 1 ? 'mt-3' : ''}`}>
                    {list.map((action, i) => {
                      const asking = confirming === action.label
                      const red = action.danger || asking
                      return (
                        <motion.button
                          key={action.label}
                          type="button"
                          onClick={() => run(action)}
                          className={`flex w-full items-center gap-3.5 px-4 py-3 text-left active:bg-onyx/[0.04] ${i ? 'border-t border-onyx/[0.06]' : ''}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.16 + (part * 6 + i) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <span
                            className="flex size-9 shrink-0 items-center justify-center rounded-full"
                            style={
                              red
                                ? { background: 'color-mix(in srgb, var(--c-cancelled) 13%, transparent)', color: 'var(--c-cancelled)' }
                                : { background: 'color-mix(in srgb, var(--color-onyx) 5%, transparent)', color: 'var(--color-onyx)' }
                            }
                          >
                            {glyph(action, 17)}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-subtitle text-[14px] font-medium" style={{ color: red ? 'var(--c-cancelled)' : 'var(--color-onyx)' }}>
                            {asking ? action.confirm : action.label}
                          </span>
                          {!red && <ChevronRight size={16} className="shrink-0 text-ink-3" />}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              ),
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
