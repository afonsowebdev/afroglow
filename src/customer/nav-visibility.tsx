import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface NavVisibility {
  hidden: boolean
  /** Only the screens' own request (not the scroll behaviour): the round menu button follows this one. */
  forced: boolean
  /** A screen that shows its own bottom button asks for the bar to step aside. */
  setHidden: (hidden: boolean) => void
  /** The scroll behaviour (hide while scrolling down) asks separately, so the two never undo each other. */
  setAutoHidden: (hidden: boolean) => void
}

const Context = createContext<NavVisibility>({
  hidden: false,
  forced: false,
  setHidden: () => {},
  setAutoHidden: () => {},
})

export function NavVisibilityProvider({ children }: { children: ReactNode }) {
  const [forced, setHidden] = useState(false)
  const [auto, setAutoHidden] = useState(false)
  return (
    <Context.Provider value={{ hidden: forced || auto, forced, setHidden, setAutoHidden }}>{children}</Context.Provider>
  )
}

export const useNavHidden = () => useContext(Context).hidden
export const useNavForcedHidden = () => useContext(Context).forced

/** A screen calls this with `true` while it shows its own bottom button, so the tab bar steps aside. */
export function useHideNav(hide: boolean) {
  const { setHidden } = useContext(Context)
  useEffect(() => {
    setHidden(hide)
    return () => setHidden(false)
  }, [hide, setHidden])
}

/**
 * Follows the page's scroll and reports whether the menu should be out of the way: hidden while scrolling down,
 * back as soon as the person scrolls up, is near the top, or reaches the end of the page. Returns the cleanup.
 */
function followScroll(setHidden: (hidden: boolean) => void) {
  // Reads the scroll position every frame instead of relying on scroll events, which the iPhone's web view
  // delivers late (or only at the end) while the page is still gliding.
  const read = () => window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
  let last = read()
  let frame = 0
  const tick = () => {
    const y = read()
    const atTop = y < 40
    const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 24
    const delta = y - last
    if (atTop || atEnd) setHidden(false)
    else if (delta > 6) setHidden(true)
    else if (delta < -6) setHidden(false)
    if (Math.abs(delta) > 6 || atTop) last = y
    frame = requestAnimationFrame(tick)
  }
  setHidden(false)
  frame = requestAnimationFrame(tick)
  return () => {
    cancelAnimationFrame(frame)
    setHidden(false)
  }
}

/** With the setting on, on every screen: the tab bar slides away while scrolling down (see `followScroll`). */
export function useAutoHideNav(enabled: boolean, routeKey: string) {
  const { setAutoHidden } = useContext(Context)
  useEffect(() => {
    if (!enabled) {
      setAutoHidden(false)
      return
    }
    return followScroll(setAutoHidden)
  }, [enabled, routeKey, setAutoHidden])
}

/** The same behaviour without the apps' provider (the website menu): true while the menu should be hidden. */
export function useHideOnScroll(enabled: boolean, routeKey: string) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    if (enabled) return followScroll(setHidden)
  }, [enabled, routeKey])
  return enabled && hidden
}
