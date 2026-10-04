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
