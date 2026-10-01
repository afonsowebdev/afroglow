import { Capacitor } from '@capacitor/core'

/** No-ops on web — only runs inside the native iOS shell. */
export async function initNativeApp() {
  if (!Capacitor.isNativePlatform()) return

  // The admin app is always light, regardless of the phone's dark-mode setting.
  document.documentElement.classList.remove('dark')
  try {
    window.localStorage.setItem('afroglow-theme', 'light')
  } catch {
    // storage unavailable — the class removal above still applies for this session
  }

  const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
  ])

  await StatusBar.setStyle({ style: Style.Light })
  await SplashScreen.hide()
}
