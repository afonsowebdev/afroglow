import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { tap } from '@/lib/haptics'

/** Hero call-to-action for photos: small, almost fully transparent glass pill with a discreet gold arrow disc. */
export function GlassButton({ label, to }: { label: string; to: string }) {
  return (
    <motion.div whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
      <Link
        to={to}
        onClick={() => void tap('medium')}
        className="glass-cta relative inline-flex h-12 items-center gap-4 rounded-full ps-6 pe-1.5 text-[#ffffff] outline-none"
      >
        <span className="whitespace-nowrap font-subtitle text-[13px] font-normal tracking-wide">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d4b055]/90 text-[#ffffff]">
          <i className="bx bx-right-arrow-alt text-xl" aria-hidden="true" />
        </span>
      </Link>
    </motion.div>
  )
}
