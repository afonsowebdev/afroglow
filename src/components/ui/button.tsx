import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-body text-sm tracking-wide transition-colors duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        solid: 'bg-gold text-onyx hover:brightness-95',
        outline: 'border border-gold text-gold-deep hover:bg-gold hover:text-onyx',
        ghost: 'text-onyx hover:text-gold-deep',
        destructive: 'border border-red-700/40 text-red-700 hover:bg-red-700 hover:text-white',
      },
      size: {
        default: 'px-7 py-3',
        sm: 'px-5 py-2 text-xs',
      },
    },
    defaultVariants: {
      variant: 'solid',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
