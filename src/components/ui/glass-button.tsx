import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { tap } from '@/lib/haptics'

/**
 * Hero call-to-action for photos: half-transparent glass pill with a gold arrow disc. The arrow gently
 * nudges forward to invite a tap, and the whole button presses in under the finger.
 */
export function GlassButton({ label, to }: { label: string; to: string }) {
  return (
    <motion.div whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
      <Link
        to={to}
        onClick={() => void tap('medium')}
        className="glass-cta relative inline-flex h-16 items-center gap-5 rounded-full ps-8 pe-2 text-[#ffffff] outline-none"
      >
        <span className="whitespace-nowrap font-subtitle text-base font-medium tracking-wide [text-shadow:0_1px_10px_rgba(0,0,0,0.35)]">
          {label}
        </span>
        <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#ecd185] via-[#d4b055] to-[#a8842f] text-[#2a170a] shadow-[0_6px_18px_rgba(168,132,47,0.55),inset_0_1px_1px_rgba(255,255,255,0.6)]">
          <motion.i
            className="bx bx-right-arrow-alt text-3xl"
            aria-hidden="true"
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </Link>
    </motion.div>
  )
}
