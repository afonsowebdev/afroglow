import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.afroglow.app2',
  appName: 'AFRO ADMIN',
  webDir: 'dist',
  // Matches the white page so overscroll/bounce never flashes another colour.
  backgroundColor: '#ffffff',
  // Routes fetch/XHR through native URLSession instead of WKWebView's own
  // network stack — WKWebView's cookie jar won't reliably persist a
  // cross-origin (capacitor://localhost -> onrender.com) session cookie,
  // which was causing login to silently drop the session and bounce back
  // to the login screen right after signing in.
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    // The app hides the splash itself, once the opening's AFROGLOW is on screen (see capacitor-bootstrap).
    SplashScreen: {
      launchAutoHide: false,
    },
  },
}

export default config
