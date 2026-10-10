import { useEffect, useMemo, useRef, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { shrinkAvatar } from '@/lib/avatar'
import { setAvatar, useAvatar } from '@/lib/avatar-store'
import type { Booking } from '@/lib/types'

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** The customer's bookings, what they add up to, and their profile photo: shared by the app's and the website's profile. */
export function useProfile() {
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const photo = useAvatar()
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)

  async function changePhoto(file: File | undefined) {
    if (!file) return
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      const data = await shrinkAvatar(file)
      await api.put('/account/avatar', { contentType: 'image/jpeg', data })
      setAvatar(`data:image/jpeg;base64,${data}`)
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : 'Não foi possível guardar a foto.')
    } finally {
      setPhotoBusy(false)
      if (photoInput.current) photoInput.current.value = ''
    }
  }

  async function removePhoto() {
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      await api.delete('/account/avatar')
      setAvatar(null)
    } catch {
      setPhotoError('Não foi possível remover a foto.')
    } finally {
      setPhotoBusy(false)
    }
  }

  useEffect(() => {
    api
      .get<Booking[]>('/account/bookings')
      .then(setBookings)
      .catch(() => setBookings([]))
  }, [])

  const data = useMemo(() => {
    const now = Date.now()
    const all = bookings ?? []
    const upcoming = all
      .filter((b) => (b.status === 'PENDING' || b.status === 'ACCEPTED') && new Date(b.slot.startsAt).getTime() >= now)
      .sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))
    const done = all
      .filter((b) => b.status === 'ACCEPTED' && new Date(b.slot.startsAt).getTime() < now)
      .sort((a, b) => b.slot.startsAt.localeCompare(a.slot.startsAt))
    const since = all.length ? all.reduce((min, b) => (b.createdAt < min ? b.createdAt : min), all[0].createdAt) : null
    const spent = done.reduce((sum, b) => sum + b.service.priceCents, 0)
    return { upcoming, done, since, spent }
  }, [bookings])

  const sinceLabel = data.since
    ? `${MONTHS[new Date(data.since).getMonth()]} de ${new Date(data.since).getFullYear()}`
    : null

  return { bookings, ...data, sinceLabel, photo, photoBusy, photoError, photoInput, changePhoto, removePhoto }
}
