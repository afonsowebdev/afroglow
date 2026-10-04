import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { tap } from '@/lib/haptics'

/**
 * Hero call-to-action in the same liquid glass as the tab bar: a compact transparent pill with dark text and a
 * glass disc holding a dark arrow.
 */
export function GlassButton({ label, to }: { label: string; to: string }) {
  return (
    <motion.div whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
      <Link
        to={to}
        onClick={() => void tap('medium')}
        className="liquid-glass inline-flex h-12 items-center gap-5 rounded-full ps-6 pe-1.5 text-onyx outline-none"
      >
        <span className="whitespace-nowrap font-subtitle text-sm font-medium tracking-wide">{label}</span>
        <span className="liquid-glass-bubble flex size-9 items-center justify-center rounded-full text-onyx">
          <i className="bx bx-right-arrow-alt text-xl" aria-hidden="true" />
        </span>
      </Link>
    </motion.div>
  )
}
