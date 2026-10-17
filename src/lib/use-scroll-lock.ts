import { useEffect } from 'react'

let locks = 0
let savedY = 0

/**
 * Keeps the page behind still while `active` (an open menu or panel): it can't be scrolled, on the iPhone too, until
 * it closes; then it is back exactly where it was. Several at once are counted, so one closing doesn't free the page.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const body = document.body
    if (locks++ === 0) {
      savedY = window.scrollY
      Object.assign(body.style, { position: 'fixed', top: `-${savedY}px`, left: '0', right: '0', width: '100%' })
    }
    return () => {
      if (--locks === 0) {
        Object.assign(body.style, { position: '', top: '', left: '', right: '', width: '' })
        window.scrollTo({ top: savedY, behavior: 'instant' as ScrollBehavior })
      }
    }
  }, [active])
}
