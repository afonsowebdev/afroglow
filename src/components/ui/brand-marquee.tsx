import { motion } from 'motion/react'

/**
 * The brand name sliding across the background in two rows: one right to left, one left to right, very faint and
 * slow. Each row holds two identical halves, so moving by half its width loops without a jump. Put it inside a
 * `relative overflow-hidden` section, behind the content.
 */
export function BrandMarquee({ seconds = 80 }: { seconds?: number }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none absolute inset-0 flex select-none flex-col justify-center gap-[6vw] overflow-hidden"
    >
      {(['marquee-left', 'marquee-right'] as const).map((direction) => (
        <div
          key={direction}
          className="flex w-max whitespace-nowrap"
          style={{ animation: `${direction} ${seconds}s linear infinite` }}
        >
          {[0, 1].map((copy) => (
            <span key={copy} className="flex shrink-0">
              {[0, 1, 2, 3].map((n) => (
                <span key={n} className="px-[3vw] font-logo text-[15vw] leading-none tracking-tight text-onyx/5">
                  AFROGLOW
                </span>
              ))}
            </span>
          ))}
        </div>
      ))}
    </motion.div>
  )
}
