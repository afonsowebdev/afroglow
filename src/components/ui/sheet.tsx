import { AnimatePresence, motion } from 'motion/react'
import { useEffect, type FormEvent, type ReactNode } from 'react'

const fieldLabel = 'mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark'

export const sheetFieldClass =
  'w-full rounded-xl border border-gold/30 bg-white px-3 py-2.5 font-subtitle text-sm text-onyx outline-none placeholder:text-onyx/30 focus-visible:border-gold-deep'

export function SheetField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={fieldLabel}>{label}</span>
      {children}
    </label>
  )
}

/**
 * Bottom sheet (centred dialog on wide screens) used for short forms and
 * confirmations: edit profile, change password, delete account, reset password.
 */
export function Sheet({
  open,
  title,
  description,
  icon = 'bx bx-pencil',
  destructive = false,
  busy = false,
  error,
  submitLabel,
  submitDisabled = false,
  hideSubmit = false,
  sober = false,
  children,
  onSubmit,
  onClose,
}: {
  open: boolean
  title: string
  description?: string
  icon?: string
  destructive?: boolean
  busy?: boolean
  error?: string | null
  submitLabel: string
  submitDisabled?: boolean
  hideSubmit?: boolean
  /** Customer-app look: rounded-rectangle buttons, dark primary action. */
  sober?: boolean
  children: ReactNode
  onSubmit: () => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              onSubmit()
            }}
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="flex items-start gap-4">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${
                  destructive ? 'bg-red-700/10 text-red-700' : 'bg-gold-deep/10 text-gold-deep'
                }`}
              >
                <i className={icon} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-subtitle text-xl font-semibold tracking-tight text-onyx">{title}</h2>
                {description && <p className="mt-1 font-subtitle text-sm text-muted-dark">{description}</p>}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-4">{children}</div>

            {error && <p className="mt-4 font-subtitle text-sm text-red-700">{error}</p>}

            <div className={`mt-6 grid gap-3 ${hideSubmit ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className={`border py-3 font-subtitle text-sm text-onyx transition-colors disabled:opacity-50 ${
                  sober ? 'rounded-xl border-onyx/20 font-medium' : 'rounded-full border-gold/30 hover:border-gold-deep'
                }`}
              >
                {hideSubmit ? 'Fechar' : 'Cancelar'}
              </button>
              {!hideSubmit && (
                <button
                  type="submit"
                  disabled={busy || submitDisabled}
                  className={`py-3 font-subtitle text-sm transition-opacity hover:opacity-90 disabled:opacity-40 ${
                    sober ? 'rounded-xl font-medium' : 'rounded-full'
                  } ${destructive ? 'bg-red-700 text-[#ffffff]' : sober ? 'bg-onyx text-white' : 'bg-gold-deep text-[#ffffff]'}`}
                >
                  {busy ? 'A processar...' : submitLabel}
                </button>
              )}
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  )
}
