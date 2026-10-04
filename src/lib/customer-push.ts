import { Capacitor } from '@capacitor/core'
import { api } from './api'

const TOKEN_KEY = 'afroglow-push-token'
const ENABLED_KEY = 'afroglow-push-enabled'

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // storage unavailable: the choice just won't persist
  }
}

export const pushSupported = () => Capacitor.isNativePlatform()

/** True unless the customer switched notifications off inside the app. */
export const pushWanted = () => read(ENABLED_KEY) !== 'off'

let listening = false

/**
 * Asks iOS for permission (first time only), then sends this iPhone's token to the server so the
 * business can notify about confirmed / declined bookings. Safe to call on every launch.
 */
export async function enableCustomerPush(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!pushSupported()) return 'unsupported'
  const { PushNotifications } = await import('@capacitor/push-notifications')

  let status = (await PushNotifications.checkPermissions()).receive
  if (status === 'prompt' || status === 'prompt-with-rationale')
    status = (await PushNotifications.requestPermissions()).receive
  if (status !== 'granted') return 'denied'

  if (!listening) {
    listening = true
    await PushNotifications.addListener('registration', (token) => {
      write(TOKEN_KEY, token.value)
      void api.post('/account/push-token', { token: token.value }).catch(() => {
        // retried on the next launch
      })
    })
    await PushNotifications.addListener('registrationError', (error) =>
      console.error('[push] registration error:', error),
    )
  }
  write(ENABLED_KEY, 'on')
  await PushNotifications.register()
  return 'granted'
}

/** Forgets this iPhone on the server (notifications off, or logging out). */
export async function disableCustomerPush(options: { remember?: boolean } = {}) {
  const token = read(TOKEN_KEY)
  if (options.remember) write(ENABLED_KEY, 'off')
  if (token) {
    await api.delete('/account/push-token', { token }).catch(() => {
      // the server drops dead tokens by itself
    })
    write(TOKEN_KEY, null)
  }
}

/** Opens the bookings tab when the customer taps a notification. */
export async function onNotificationOpened(handler: () => void) {
  if (!pushSupported()) return () => {}
  const { PushNotifications } = await import('@capacitor/push-notifications')
  const handle = await PushNotifications.addListener('pushNotificationActionPerformed', handler)
  return () => void handle.remove()
}
