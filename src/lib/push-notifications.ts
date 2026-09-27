import { Capacitor } from '@capacitor/core'
import { api } from './api'

/** No-ops on web — push tokens only make sense inside the native app. */
export async function registerForPushNotifications() {
  console.log('[push] starting registerForPushNotifications, isNative:', Capacitor.isNativePlatform())
  if (!Capacitor.isNativePlatform()) return

  const { PushNotifications } = await import('@capacitor/push-notifications')
  console.log('[push] plugin loaded')

  const current = await PushNotifications.checkPermissions()
  console.log('[push] current permission status:', current.receive)
  let status = current.receive
  if (status === 'prompt' || status === 'prompt-with-rationale') {
    const requested = await PushNotifications.requestPermissions()
    status = requested.receive
    console.log('[push] requested permission, got:', status)
  }
  if (status !== 'granted') {
    console.log('[push] permission not granted, stopping:', status)
    return
  }

  await PushNotifications.addListener('registration', (token) => {
    console.log('[push] got device token:', token.value.slice(0, 12) + '...')
    void api
      .post('/admin/push-token', { token: token.value })
      .then(() => console.log('[push] token saved to backend'))
      .catch((err) => {
        console.error('[push] failed to save token to backend:', err)
      })
  })

  await PushNotifications.addListener('registrationError', (error) => {
    console.error('[push] registration error:', JSON.stringify(error))
  })

  console.log('[push] calling PushNotifications.register()')
  await PushNotifications.register()
  console.log('[push] register() call completed')
}
