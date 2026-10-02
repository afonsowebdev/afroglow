import { Capacitor } from '@capacitor/core'

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
  await SplashScreen.hide()
}
