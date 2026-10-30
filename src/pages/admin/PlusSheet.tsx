import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { MenuAction } from '@/components/ui/floating-action-button'
import { tap } from '@/lib/haptics'
import { useScrollLock } from '@/lib/use-scroll-lock'

/**
 * What the "+" opens, the Google Photos way: a sheet that rises from the bottom of the screen with the main actions as a
 * grid of round icons with their names, and the rest as a list below (asking once more for the ones that need it).
 */
export function PlusSheet({ open, actions, more, onClose }: { open: boolean; actions: MenuAction[]; more: MenuAction[]; onClose: () => void }) {
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
            className="relative w-full max-w-md overflow-hidden rounded-t-[30px] bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 shadow-2xl"
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

            {/* The main actions, as a grid of round icons. */}
            <div className="grid grid-cols-3 gap-x-2 gap-y-4 pb-2">
              {actions.map((action, i) => (
                <motion.button
                  key={action.label}
                  type="button"
                  onClick={() => run(action)}
                  className="flex flex-col items-center gap-2 rounded-2xl py-1 active:scale-95"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.06 + i * 0.035, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="relative flex size-14 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
                    {glyph(action, 22)}
                    {action.badge ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-[#ffffff] ring-2 ring-white">
                        {action.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="line-clamp-2 px-1 text-center font-subtitle text-[12px] font-medium leading-tight text-onyx">{action.label}</span>
                </motion.button>
              ))}
            </div>

            {/* The rest, as a list. */}
            {more.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-[22px] bg-onyx/[0.04]">
                {more.map((action, i) => {
                  const asking = confirming === action.label
                  const apart = i > 0 && action.group === 'app' && more[i - 1].group !== 'app'
                  return (
                    <motion.button
                      key={action.label}
                      type="button"
                      onClick={() => run(action)}
                      className={`flex w-full items-center gap-3.5 px-4 py-3 text-left active:bg-onyx/[0.04] ${i ? 'border-t border-onyx/[0.06]' : ''} ${apart ? 'mt-1.5' : ''}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.14 + i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full"
                        style={
                          action.danger || asking
                            ? { background: 'color-mix(in srgb, var(--c-cancelled) 13%, transparent)', color: 'var(--c-cancelled)' }
                            : { background: 'var(--color-white)', color: 'var(--color-onyx)' }
                        }
                      >
                        {glyph(action, 17)}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate font-subtitle text-[14px] font-medium"
                        style={{ color: action.danger || asking ? 'var(--c-cancelled)' : 'var(--color-onyx)' }}
                      >
                        {asking ? action.confirm : action.label}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
