import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { tap } from '@/lib/haptics'

/**
 * "Marcar sessão" over the hero video: a larger frosted-glass pill with white letters and a solid white disc with
 * the arrow, a soft light sweeping across it now and then, and a gentle press.
 */
export function HeroCta() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.96 }}
    >
      <Link
        to="/marcar"
        onClick={() => void tap('medium')}
        className="relative inline-flex h-14 items-center gap-6 overflow-hidden rounded-full bg-[rgba(255,255,255,0.16)] pe-2 ps-7 shadow-[0_8px_30px_rgba(0,0,0,0.22)] ring-1 ring-inset ring-[rgba(255,255,255,0.4)] backdrop-blur-xl backdrop-saturate-150"
      >
        {/* A soft light passing across the glass every few seconds. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.28)] to-transparent [animation:hero-cta-sheen_5s_ease-in-out_1.5s_infinite]"
        />
        <span className="relative font-subtitle text-[16px] font-semibold tracking-wide text-[#ffffff] [text-shadow:0_1px_8px_rgba(0,0,0,0.35)]">
          Marcar sessão
        </span>
        <span className="relative flex size-10 items-center justify-center rounded-full bg-[#ffffff] text-[#1a1008] shadow-md shadow-black/15">
          <i className="bx bx-right-arrow-alt text-[22px]" aria-hidden="true" />
        </span>
      </Link>
    </motion.div>
  )
}
