import { useSyncExternalStore } from 'react'
import { api } from '@/lib/api'

/** The signed-in customer's profile photo (data URL), shared by the profile screen and the tab bar. */
let current: string | null = null
let loaded = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function setAvatar(dataUrl: string | null) {
  current = dataUrl
  loaded = true
  emit()
}

export async function loadAvatar() {
  try {
    const data = await api.get<{ dataUrl: string | null }>('/account/avatar')
    setAvatar(data.dataUrl)
  } catch {
    /* keep whatever we had */
  }
}

export function clearAvatar() {
  current = null
  loaded = false
  emit()
}

export function useAvatar() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}

export const avatarLoaded = () => loaded
