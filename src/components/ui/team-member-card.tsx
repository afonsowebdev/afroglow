import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

interface TeamMemberCardProps {
  position?: 'left' | 'right'
  jobPosition?: string
  firstName?: string
  lastName?: string
  description?: string
  instagramUrl?: string
  /** Portrait photos (URLs). They take turns with a soft cross-fade; with none, a placeholder is shown. */
  photos?: string[]
  className?: string
}

const PLACEHOLDER_TINTS = ['from-[#f5efdf] to-[#cfc6b3]', 'from-[#efe3cc] to-[#c8b99a]', 'from-[#f1e8d8] to-[#bfae92]']
const SLIDE_SECONDS = 4.5

/**
 * Editorial-style team member card with an overlapping placeholder portrait,
 * large display typography, and a circular link-out CTA.
 */
export function TeamMemberCard({
  position = 'left',
  jobPosition = 'Equipa AFROGLOW',
  firstName = 'Nome',
  lastName = 'Apelido',
  description = '',
  instagramUrl,
  photos = [],
  className,
}: TeamMemberCardProps) {
  const fullName = `${firstName} ${lastName}`
  const isPositionRight = position === 'right'
  const reduceMotion = useReducedMotion()
  // With no photos yet, three placeholder slides show how the change will look.
  const slideCount = Math.max(photos.length, 3)
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (reduceMotion || paused || slideCount < 2) return
    const timer = window.setInterval(() => setCurrent((i) => (i + 1) % slideCount), SLIDE_SECONDS * 1000)
    return () => window.clearInterval(timer)
  }, [reduceMotion, paused, slideCount])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn('relative my-16 flex flex-col justify-center', className)}
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <p
          className={cn(
            'mb-4 text-center font-subtitle text-xs font-medium uppercase tracking-[0.3em] text-muted-dark sm:text-left',
            isPositionRight && 'sm:text-right',
          )}
        >
          {jobPosition}
        </p>
      </motion.div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-end sm:gap-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          role="img"
          aria-label={fullName}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onClick={() => setCurrent((i) => (i + 1) % slideCount)}
          className={cn(
            'relative h-[min(420px,26dvh)] w-full max-w-[360px] shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-cream sm:h-[min(560px,55dvh)] sm:w-[380px]',
            isPositionRight && 'sm:order-1',
          )}
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={current}
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {photos[current] ? (
                <img src={photos[current]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className={cn(
                    'flex h-full w-full items-center justify-center bg-linear-to-b',
                    PLACEHOLDER_TINTS[current % PLACEHOLDER_TINTS.length],
                  )}
                >
                  <i className="bx bx-user text-8xl text-onyx/15" aria-hidden="true" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-onyx/25 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5" aria-hidden="true">
            {Array.from({ length: slideCount }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-500',
                  i === current ? 'w-6 bg-[#ffffff]' : 'w-1.5 bg-[#ffffff]/60',
                )}
              />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'relative z-10 flex w-full flex-col items-center gap-5 sm:w-[calc(100%-390px)] sm:-left-8 sm:items-start sm:gap-[min(3.5rem,5dvh)]',
            isPositionRight && 'sm:left-8 sm:items-end',
          )}
        >
          <p className="text-center font-logo text-4xl leading-[1.1] text-onyx sm:text-left sm:text-5xl">
            {firstName}
            <br />
            {lastName}
          </p>

          <div className={cn('flex items-start gap-6 sm:gap-8', isPositionRight && 'sm:justify-end')}>
            {instagramUrl && (
              <motion.a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Instagram de ${fullName}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'group flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border border-onyx/20 transition-colors duration-300 hover:border-onyx hover:bg-onyx sm:h-20 sm:w-20',
                  isPositionRight && 'sm:order-1',
                )}
              >
                <i
                  className={cn(
                    'bx bx-right-arrow-alt text-xl text-onyx/60 transition-all duration-300 group-hover:-rotate-45 group-hover:text-cream sm:text-2xl',
                    isPositionRight && 'rotate-180 group-hover:rotate-[225deg]',
                  )}
                  aria-hidden="true"
                />
              </motion.a>
            )}

            <p
              className={cn(
                'flex-1 font-subtitle text-sm leading-[1.8] text-muted-dark',
                isPositionRight && 'text-right',
              )}
            >
              {description}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default TeamMemberCard
