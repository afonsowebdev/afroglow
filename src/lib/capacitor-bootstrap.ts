import { Capacitor } from '@capacitor/core'

/** No-ops on web — only runs inside the native iOS shell. */
export async function initNativeApp() {
  if (!Capacitor.isNativePlatform()) return

  const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
  ])

  await StatusBar.setStyle({ style: Style.Light })
  await SplashScreen.hide()
}
