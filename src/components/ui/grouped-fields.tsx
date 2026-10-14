import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/** A field inside a grouped list: no box of its own, just the row. 16px text so iOS doesn't zoom in on focus. */
export const fieldClass =
  'field-plain block h-[52px] w-full min-w-0 bg-transparent px-4 font-subtitle text-base text-onyx outline-none placeholder:text-onyx/35'

/** Fields stacked in one rounded group with hairlines between them, as in the iPhone's settings. */
export function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]">
      {children}
    </div>
  )
}

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative block">
      <input {...props} type={visible ? 'text' : 'password'} className={cn(fieldClass, 'pr-12')} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Esconder password' : 'Mostrar password'}
        className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-onyx/40"
      >
        {visible ? (
          <EyeOff className="size-[18px]" strokeWidth={1.75} />
        ) : (
          <Eye className="size-[18px]" strokeWidth={1.75} />
        )}
      </button>
    </span>
  )
}
