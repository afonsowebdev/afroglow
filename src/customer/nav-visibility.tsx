import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface NavVisibility {
  hidden: boolean
  setHidden: (hidden: boolean) => void
}

const Context = createContext<NavVisibility>({ hidden: false, setHidden: () => {} })

export function NavVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false)
  return <Context.Provider value={{ hidden, setHidden }}>{children}</Context.Provider>
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
 * Long screens: the tab bar slides away while scrolling down and comes back as soon as the customer scrolls up,
 * is near the top, or reaches the end of the page.
 */
export function useHideNavOnScroll() {
  const { setHidden } = useContext(Context)
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const atTop = y < 40
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 80
      const delta = y - last
      if (atTop || atEnd) setHidden(false)
      else if (delta > 8) setHidden(true)
      else if (delta < -8) setHidden(false)
      if (Math.abs(delta) > 8) last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      setHidden(false)
    }
  }, [setHidden])
}
