import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * A pill with the label and a round arrow disc on the right; on hover the disc slides across to the left and turns,
 * while the label moves the other way. Colours follow what is behind it: dark over light sections, white over the
 * video (`tone="onDark"`).
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
        'group relative h-12 w-fit cursor-pointer overflow-hidden rounded-full p-1 ps-6 pe-14 font-subtitle text-sm font-medium transition-all duration-500 hover:ps-14 hover:pe-6 hover:brightness-100',
        onDark ? 'bg-[#ffffff] text-[#1a1008]' : 'bg-onyx text-white',
        className,
      )}
      {...props}
    >
      <span className="relative z-10 transition-all duration-500">{label}</span>
      <span
        className={cn(
          'absolute right-1 flex size-10 items-center justify-center rounded-full transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45',
          onDark ? 'bg-[#1a1008] text-[#ffffff]' : 'bg-white text-onyx',
        )}
        aria-hidden="true"
      >
        <ArrowUpRight size={16} />
      </span>
    </Button>
  )
}

export default ButtonWithIcon
