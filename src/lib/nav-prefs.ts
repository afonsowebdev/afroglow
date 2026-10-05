import { useSyncExternalStore } from 'react'

const KEY = 'afroglow-hide-nav'
const listeners = new Set<() => void>()

function read() {
  try {
    // On unless the customer switched it off.
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}
let current = read()

export function setHideNavOnScroll(on: boolean) {
  current = on
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    /* storage unavailable: the choice lasts until the app closes */
  }
  listeners.forEach((l) => l())
}

/** Customer setting: slide the tab bar away while scrolling down (every screen). On by default. */
export function useHideNavOnScrollSetting() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}
