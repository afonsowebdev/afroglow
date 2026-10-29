import { cn } from '@/lib/utils'
import { LiquidLogo } from '@/components/ui/liquid-wordmark'

/**
 * The round buttons beside the "A" on phones and in the app (the "A", the bell, the "+"): the logo's colours, gold
 * on white, and white on the dark background in the dark theme.
 */
export const BRAND_CIRCLE =
  'bg-[#ffffff] text-[#c9a84c] shadow-[0_2px_10px_rgba(0,0,0,0.16)] dark:bg-[#2b1d12] dark:text-[#ffffff] dark:ring-1 dark:ring-[#ffffff]/15'

/** The same round button with its icon in black (white in the dark theme): the admin's header, where only the "A" is gold. */
export const INK_CIRCLE =
  'bg-[#ffffff] text-[#1a1008] shadow-[0_2px_10px_rgba(0,0,0,0.16)] dark:bg-[#2b1d12] dark:text-[#ffffff] dark:ring-1 dark:ring-[#ffffff]/15'

const SIZES = {
  sm: { mark: 'size-8 text-[1.35rem]', word: 'text-[1.1rem]', gap: 'gap-3' },
  md: { mark: 'size-10 text-[1.35rem]', word: 'text-[1.35rem]', gap: 'gap-3' },
  lg: { mark: 'size-12 text-[1.75rem]', word: 'text-[1.75rem]', gap: 'gap-3.5' },
}

/**
 * The one AFROGLOW logo of the site and the admin: the "A" in a circle, then the wordmark, both in the logo's
 * weight and spacing. The typeface sits high in its line, so the letters are nudged down by 0.1em to look centred
 * (in the circle and against it). `onMedia`: white, over the hero video.
 */
export function BrandLogo({
  size = 'md',
  onMedia = false,
  className,
}: {
  size?: keyof typeof SIZES
  onMedia?: boolean
  className?: string
}) {
  const s = SIZES[size]
  return (
    <span className={cn('flex items-center', s.gap, className)}>
      <span
        aria-hidden="true"
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full logo-weight font-logo leading-none shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-colors duration-500',
          s.mark,
          onMedia ? 'bg-[#ffffff] text-[#111111]' : 'bg-onyx text-white',
        )}
      >
        <span className="translate-y-[0.1em]">A</span>
      </span>
      {/* Only the written AFROGLOW in liquid particles, as the big word in the contact section. No colour transition:
          the particles are drawn in the colour the word has at that moment. */}
      <LiquidLogo inkKey={onMedia ? 'media' : 'page'}>
        <span
          data-liquid="text"
          className={cn(
            'translate-y-[0.1em] logo-weight font-logo leading-none tracking-[0.14em]',
            s.word,
            onMedia ? 'text-[#ffffff]' : 'text-onyx',
          )}
        >
          AFROGLOW
        </span>
      </LiquidLogo>
    </span>
  )
}
