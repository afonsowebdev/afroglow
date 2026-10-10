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
  className,
  ...props
}: {
  label: string
  onClick?: () => void
  tone?: 'onLight' | 'onDark'
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  const onDark = tone === 'onDark'
  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn(
        'liquid-glass group relative h-[56px] w-fit cursor-pointer overflow-hidden rounded-full bg-transparent p-1 ps-6 pe-[3.75rem] font-subtitle text-sm font-normal transition-all duration-500 hover:ps-[3.75rem] hover:pe-6 hover:brightness-100',
        onDark ? 'text-[#ffffff] [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.25))]' : 'text-onyx',
        className,
      )}
      {...props}
    >
      <span className="relative z-10 transition-all duration-500">{label}</span>
      <span
        className={cn(
          'liquid-glass-bubble absolute right-1.5 flex size-11 items-center justify-center rounded-full transition-all duration-500 group-hover:right-[calc(100%-50px)] group-hover:rotate-45',
        )}
        aria-hidden="true"
      >
        <ArrowUpRight size={18} />
      </span>
    </Button>
  )
}

export default ButtonWithIcon
