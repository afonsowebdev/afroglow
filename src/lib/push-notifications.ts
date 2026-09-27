import { Capacitor } from '@capacitor/core'
import { api } from './api'

/** No-ops on web — push tokens only make sense inside the native app. */
export async function registerForPushNotifications() {
  if (!Capacitor.isNativePlatform()) return

  const { PushNotifications } = await import('@capacitor/push-notifications')

  const current = await PushNotifications.checkPermissions()
  let status = current.receive
  if (status === 'prompt' || status === 'prompt-with-rationale') {
    const requested = await PushNotifications.requestPermissions()
    status = requested.receive
  }
  if (status !== 'granted') return

  await PushNotifications.addListener('registration', (token) => {
    void api.post('/admin/push-token', { token: token.value }).catch(() => {
      // Non-fatal — the dashboard's live polling still keeps data fresh
      // even if this particular device never got its push token saved.
    })
  })

  await PushNotifications.addListener('registrationError', (error) => {
    console.error('[push] registration error:', error)
  })

  await PushNotifications.register()
}
