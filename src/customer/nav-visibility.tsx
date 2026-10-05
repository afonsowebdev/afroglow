import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface NavVisibility {
  hidden: boolean
  /** A screen that shows its own bottom button asks for the bar to step aside. */
  setHidden: (hidden: boolean) => void
  /** The scroll behaviour (hide while scrolling down) asks separately, so the two never undo each other. */
  setAutoHidden: (hidden: boolean) => void
}

const Context = createContext<NavVisibility>({ hidden: false, setHidden: () => {}, setAutoHidden: () => {} })

export function NavVisibilityProvider({ children }: { children: ReactNode }) {
  const [forced, setHidden] = useState(false)
  const [auto, setAutoHidden] = useState(false)
  return <Context.Provider value={{ hidden: forced || auto, setHidden, setAutoHidden }}>{children}</Context.Provider>
}

export const useNavHidden = () => useContext(Context).hidden

/** A screen calls this with `true` while it shows its own bottom button, so the tab bar steps aside. */
export function useHideNav(hide: boolean) {
  const { setHidden } = useContext(Context)
  useEffect(() => {
    setHidden(hide)
    return () => setHidden(false)
  }, [hide, setHidden])
}

/**
 * With the setting on, on every screen: the tab bar slides away while scrolling down and comes back as soon as the
 * customer scrolls up, is near the top, or reaches the end of the page.
 */
export function useAutoHideNav(enabled: boolean, routeKey: string) {
  const { setAutoHidden } = useContext(Context)
  useEffect(() => {
    if (!enabled) {
      setAutoHidden(false)
      return
    }
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const atTop = y < 40
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 80
      const delta = y - last
      if (atTop || atEnd) setAutoHidden(false)
      else if (delta > 8) setAutoHidden(true)
      else if (delta < -8) setAutoHidden(false)
      if (Math.abs(delta) > 8) last = y
    }
    setAutoHidden(false)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      setAutoHidden(false)
    }
  }, [enabled, routeKey, setAutoHidden])
}
