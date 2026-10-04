import { Capacitor } from '@capacitor/core'

/** Small physical feedback on iPhone (taps, success). No-ops on the web. */
export async function tap(style: 'light' | 'medium' = 'light') {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({
      style: style === 'light' ? ImpactStyle.Light : ImpactStyle.Medium,
    })
  } catch {
    // haptics unavailable: purely cosmetic
  }
}

export async function success() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    // haptics unavailable: purely cosmetic
  }
}
