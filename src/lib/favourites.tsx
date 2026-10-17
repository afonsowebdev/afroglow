import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { api } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'
import { tap } from '@/lib/haptics'
import { bookPath, isCustomerApp } from '@/lib/app-mode'
import { cn } from '@/lib/utils'

/*
 * The customer's favourite hairstyles (the heart), kept on the server so the app and the website share them. One
 * list for the whole app: every heart and the favourites list update together.
 */
let ids: string[] = []
let loadedFor: string | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((run) => run())

async function load(customerId: string) {
  loadedFor = customerId
  try {
    ids = await api.get<string[]>('/account/favourites')
  } catch {
    ids = []
  }
  notify()
}

export function useFavourites() {
  const { customer } = useCustomerAuth()
  const [, setVersion] = useState(0)

  useEffect(() => {
    const run = () => setVersion((v) => v + 1)
    listeners.add(run)
    return () => {
      listeners.delete(run)
    }
  }, [])

  useEffect(() => {
    if (!customer) {
      if (loadedFor) {
        loadedFor = null
        ids = []
        notify()
      }
      return
    }
    if (loadedFor !== customer.id) void load(customer.id)
  }, [customer])

  const toggle = (serviceId: string) => {
    const on = ids.includes(serviceId)
    ids = on ? ids.filter((id) => id !== serviceId) : [serviceId, ...ids]
    notify()
    const request = on ? api.delete(`/account/favourites/${serviceId}`) : api.put(`/account/favourites/${serviceId}`)
    void request.catch(() => {
      // put it back as it was
      ids = on ? [serviceId, ...ids] : ids.filter((id) => id !== serviceId)
      notify()
    })
  }

  return { ids, isFavourite: (serviceId: string) => ids.includes(serviceId), toggle, signedIn: Boolean(customer) }
}

/**
 * The heart on a hairstyle: empty, or filled red when it is a favourite, with a small pop. Signed out (website), it
 * leads to signing in.
 */
export function FavouriteButton({
  serviceId,
  name,
  onMedia = false,
  className,
}: {
  serviceId: string
  name: string
  /** Over a photo: a dark round backing so the heart reads on any picture. */
  onMedia?: boolean
  className?: string
}) {
  const { isFavourite, toggle, signedIn } = useFavourites()
  const navigate = useNavigate()
  const on = isFavourite(serviceId)
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Retirar ${name} das favoritas` : `Juntar ${name} às favoritas`}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        if (!signedIn) {
          navigate(isCustomerApp ? '/entrar' : `/entrar?next=${encodeURIComponent(bookPath)}`)
          return
        }
        void tap(on ? 'light' : 'medium')
        toggle(serviceId)
      }}
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full text-[1.35rem] transition-colors',
        onMedia ? 'bg-black/40 text-[#ffffff] backdrop-blur-md' : 'bg-onyx/[0.06] text-onyx',
        className,
      )}
    >
      <motion.i
        key={on ? 'on' : 'off'}
        initial={{ scale: on ? 0.4 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 14 }}
        className={cn('bx', on ? 'bxs-heart text-red-500' : 'bx-heart')}
        aria-hidden="true"
      />
    </button>
  )
}
