import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { tap } from '@/lib/haptics'

/**
 * Hero call-to-action in the same liquid glass as the tab bar: a transparent pill with dark text and a glass
 * disc holding a dark arrow. Sits right above the tab bar and spans the same width.
 */
export function GlassButton({ label, to }: { label: string; to: string }) {
  return (
    <motion.div whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
      <Link
        to={to}
        onClick={() => void tap('medium')}
        className="liquid-glass flex h-14 w-full items-center justify-between rounded-full ps-7 pe-1.5 text-onyx outline-none"
      >
        <span className="whitespace-nowrap font-subtitle text-sm font-medium tracking-wide">{label}</span>
        <span className="liquid-glass-bubble flex size-11 items-center justify-center rounded-full text-onyx">
          <i className="bx bx-right-arrow-alt text-2xl" aria-hidden="true" />
        </span>
      </Link>
    </motion.div>
  )
}
