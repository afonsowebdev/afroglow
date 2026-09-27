import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.afroglow.app2',
  appName: 'AFROGLOW Admin',
  webDir: 'dist',
  // Routes fetch/XHR through native URLSession instead of WKWebView's own
  // network stack — WKWebView's cookie jar won't reliably persist a
  // cross-origin (capacitor://localhost -> onrender.com) session cookie,
  // which was causing login to silently drop the session and bounce back
  // to the login screen right after signing in.
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
}

export default config
