import { Capacitor } from '@capacitor/core'
import { isCustomerApp } from '@/lib/app-mode'

/** Sent by the start screen's video once its picture is actually moving. */
export const HERO_READY_EVENT = 'afroglow:hero-ready'
/** Sent by the opening (SiteIntro) once AFROGLOW is on screen. */
export const INTRO_READY_EVENT = 'afroglow:intro-ready'
/** Set once the opening has been shown in this visit (in the apps: since the app was launched). */
export const INTRO_SEEN_KEY = 'afroglow-intro-seen'

/** Whether the opening is going to show now. */
export function introWillShow() {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) !== '1'
  } catch {
    return true
  }
}

/** Waits for `event`, never longer than `limit`. */
function waitFor(event: string, limit: number) {
  return new Promise<void>((resolve) => {
    const done = () => {
      window.removeEventListener(event, done)
      window.clearTimeout(timer)
      resolve()
    }
    const timer = window.setTimeout(done, limit)
    window.addEventListener(event, done)
  })
}

/**
 * The customer app opens on its video: the splash stays until the video is moving, so the app starts all at once
 * instead of showing a still first. Never longer than `limit`, so a slow or refused video can't hold the app.
 */
function heroReady(limit: number) {
  if (!isCustomerApp || window.location.pathname !== '/') return Promise.resolve()
  return waitFor(HERO_READY_EVENT, limit)
}

/** No-ops on web — only runs inside the native iOS shell. */
export async function initNativeApp() {
  if (!Capacitor.isNativePlatform()) return
  // Read before React mounts the opening, which marks it as seen.
  const intro = introWillShow()

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
  // The opening shows first when it is due (once per launch): the splash gives way to it as soon as the word is
  // on screen. Otherwise the customer app's video.
  await (intro ? waitFor(INTRO_READY_EVENT, 3000) : heroReady(3000))
  await SplashScreen.hide({ fadeOutDuration: 250 })
}
