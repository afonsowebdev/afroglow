import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * A pill with the label and a round arrow disc on the right; on hover the disc slides across to the left and turns,
 * while the label moves the other way. In the header's "liquid glass" (as the logo, tabs and account button), with
 * white letters over the video (`tone="onDark"`) and dark ones over the light sections.
 */
export function ButtonWithIcon({
  label,
  onClick,
  tone = 'onLight',
  solid = false,
  compact = false,
  large = false,
  className,
  ...props
}: {
  label: string
  onClick?: () => void
  tone?: 'onLight' | 'onDark'
  /** Filled (dark over light sections, white over the video) instead of glass, e.g. inside the header bar. */
  solid?: boolean
  /** Glass but smaller (header beside the bar): less padding, smaller disc and text. */
  compact?: boolean
  /** With `solid`: the full-size version (48px, larger disc), e.g. a page's main action. */
  large?: boolean
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  const onDark = tone === 'onDark'
  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-fit cursor-pointer overflow-hidden rounded-full p-1 font-subtitle text-sm font-normal transition-all duration-500 hover:brightness-100',
        solid
          ? cn(
              large ? 'h-12 ps-6 pe-14 hover:ps-14 hover:pe-6' : 'h-9 ps-4 pe-10 text-[13px] hover:ps-10 hover:pe-4',
              onDark ? 'bg-[#ffffff] text-[#111111]' : 'bg-onyx text-white',
            )
          : cn(
              'liquid-glass bg-transparent',
              compact
                ? 'h-11 ps-4 pe-11 text-[13px] hover:ps-11 hover:pe-4'
                : 'h-[56px] ps-6 pe-[3.75rem] hover:ps-[3.75rem] hover:pe-6',
              onDark ? 'text-[#ffffff] [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.25))]' : 'text-onyx',
            ),
        className,
      )}
      {...props}
    >
      <span className="relative z-10 transition-all duration-500">{label}</span>
      <span
        className={cn(
          'absolute flex items-center justify-center rounded-full transition-all duration-500 group-hover:rotate-45',
          solid
            ? cn(
                large ? 'right-1 size-10 group-hover:right-[calc(100%-44px)]' : 'right-1 size-7 group-hover:right-[calc(100%-32px)]',
                onDark ? 'bg-[#111111] text-[#ffffff]' : 'bg-white text-onyx',
              )
            : compact
              ? 'liquid-glass-bubble right-1 size-9 group-hover:right-[calc(100%-40px)]'
              : 'liquid-glass-bubble right-1.5 size-11 group-hover:right-[calc(100%-50px)]',
        )}
        aria-hidden="true"
      >
        <ArrowUpRight size={18} />
      </span>
    </Button>
  )
}

export default ButtonWithIcon
