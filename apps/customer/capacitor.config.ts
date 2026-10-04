import type { CapacitorConfig } from '@capacitor/cli'

// The customer app: separate bundle id/name from the admin app (../../capacitor.config.ts),
// same server and same web source.
const config: CapacitorConfig = {
  appId: 'pt.afroglow.app',
  appName: 'AFROGLOW',
  webDir: '../../dist-customer',
  backgroundColor: '#ffffff',
  // The web view runs edge to edge (under the status bar and home indicator); screens use safe-area insets.
  ios: {
    contentInset: 'never',
  },
  // Routes fetch/XHR through native URLSession so the session survives the
  // capacitor://localhost -> onrender.com cross-origin setup.
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
}

export default config
