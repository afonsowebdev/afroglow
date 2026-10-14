import { Capacitor } from '@capacitor/core'
import { isCustomerApp } from '@/lib/app-mode'

/** Sent by the start screen's video once its picture is actually moving. */
export const HERO_READY_EVENT = 'afroglow:hero-ready'

/**
 * The customer app opens on its video: the splash stays until the video is moving, so the app starts all at once
 * instead of showing a still first. Never longer than `limit`, so a slow or refused video can't hold the app.
 */
function heroReady(limit: number) {
  if (!isCustomerApp || window.location.pathname !== '/') return Promise.resolve()
  return new Promise<void>((resolve) => {
    const done = () => {
      window.removeEventListener(HERO_READY_EVENT, done)
      window.clearTimeout(timer)
      resolve()
    }
    const timer = window.setTimeout(done, limit)
    window.addEventListener(HERO_READY_EVENT, done)
  })
}

/** No-ops on web — only runs inside the native iOS shell. */
export async function initNativeApp() {
  if (!Capacitor.isNativePlatform()) return

  // Light by default on first launch; after that the in-app toggle decides.
  try {
    if (!window.localStorage.getItem('afroglow-theme')) {
      document.documentElement.classList.remove('dark')
      window.localStorage.setItem('afroglow-theme', 'light')
    }
  } catch {
    // storage unavailable — fall through to the page's default theme
  }

  const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
  ])

  await StatusBar.setStyle({ style: document.documentElement.classList.contains('dark') ? Style.Dark : Style.Light })
  await heroReady(3000)
  await SplashScreen.hide({ fadeOutDuration: 250 })
}
