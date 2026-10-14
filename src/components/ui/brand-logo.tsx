import { cn } from '@/lib/utils'
import { LiquidLogo } from '@/components/ui/liquid-wordmark'

/**
 * The round buttons beside the "A" on phones and in the app (the "A", the bell, the "+"): the logo's colours, gold
 * on white, and white on the dark background in the dark theme.
 */
export const BRAND_CIRCLE =
  'bg-[#ffffff] text-[#c9a84c] shadow-[0_2px_10px_rgba(0,0,0,0.16)] dark:bg-[#2b1d12] dark:text-[#ffffff] dark:ring-1 dark:ring-[#ffffff]/15'

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
    // The whole logo in liquid particles, as the big word in the contact section.
    <LiquidLogo inkKey={onMedia ? 'media' : 'page'} className={cn('items-center', s.gap, className)}>
      <span
        aria-hidden="true"
        data-liquid="circle"
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full logo-weight font-logo leading-none shadow-[0_1px_4px_rgba(0,0,0,0.18)]',
          s.mark,
          onMedia ? 'bg-[#ffffff] text-[#111111]' : 'bg-onyx text-white',
        )}
      >
        <span data-liquid="text" className="translate-y-[0.1em] text-center">
          A
        </span>
      </span>
      {/* No colour transitions: the particles are drawn in the colours the logo has at that moment. */}
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
  )
}
