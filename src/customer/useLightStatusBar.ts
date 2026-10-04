import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'

/** Light status-bar text (clock, battery) while a screen starts with a dark photo / gradient. */
export function useLightStatusBar() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let cancelled = false
    void import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      if (!cancelled) void StatusBar.setStyle({ style: Style.Dark })
    })
    return () => {
      cancelled = true
      void import('@capacitor/status-bar').then(({ StatusBar, Style }) =>
        StatusBar.setStyle({ style: document.documentElement.classList.contains('dark') ? Style.Dark : Style.Light }),
      )
    }
  }, [])
}
