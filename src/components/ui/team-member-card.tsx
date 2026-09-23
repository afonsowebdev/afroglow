import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface TeamMemberCardProps {
  position?: 'left' | 'right'
  jobPosition?: string
  firstName?: string
  lastName?: string
  description?: string
  instagramUrl?: string
  className?: string
}

/**
 * Editorial-style team member card with an overlapping placeholder portrait,
 * large display typography, and a circular link-out CTA.
 */
export function TeamMemberCard({
  position = 'left',
  jobPosition = 'Equipa AfroGlow',
  firstName = 'Nome',
  lastName = 'Apelido',
  description = '',
  instagramUrl,
  className,
}: TeamMemberCardProps) {
  const fullName = `${firstName} ${lastName}`
  const isPositionRight = position === 'right'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn('relative my-16 flex flex-col justify-center', className)}
    >
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <p
          className={cn(
            'mb-4 text-center font-subtitle text-xs font-medium uppercase tracking-[0.3em] text-muted-dark sm:text-left',
            isPositionRight && 'sm:text-right',
          )}
        >
          {jobPosition}
        </p>
      </motion.div>

      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-end sm:gap-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          role="img"
          aria-label={fullName}
          className={cn(
            'relative h-[360px] w-full max-w-[320px] shrink-0 overflow-hidden rounded-2xl bg-cream sm:h-[480px] sm:w-[340px]',
            isPositionRight && 'sm:order-1',
          )}
        >
          <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-onyx/20 via-transparent to-transparent" />
          <div className="flex h-full w-full items-center justify-center">
            <i className="bx bx-user text-8xl text-onyx/15" aria-hidden="true" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'relative z-10 flex w-full flex-col items-center gap-10 sm:w-[calc(100%-350px)] sm:-left-8 sm:items-start sm:gap-14',
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
