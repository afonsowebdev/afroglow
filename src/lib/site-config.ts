import { useEffect, useSyncExternalStore } from 'react'
import { api } from '@/lib/api'

/**
 * Business contact data. Everything optional below is hidden on the site and in the app
 * until it is filled in, so no placeholder is ever shown to customers.
 */
export const siteConfig = {
  name: 'AFROGLOW',
  instagramHandle: 'afroogloww',
  instagramUrl: 'https://www.instagram.com/afroogloww',
  location: 'Portugal',
  email: 'geral@afroglow.pt',
}

/** Details the business edits from the admin app (Definições). Empty values are hidden everywhere. */
export interface BusinessInfo {
  /** International format, digits only, e.g. '351912345678'. */
  whatsappNumber: string
  phone: string
  address: string
  /** Link to the place on a map (Google Maps / Apple Maps "share" link). */
  mapUrl: string
  openingHours: Array<{ days: string; hours: string }>
  /** Shown before a booking is confirmed and when cancelling. */
  cancellationPolicy: string
}

const EMPTY_INFO: BusinessInfo = {
  whatsappNumber: '',
  phone: '',
  address: '',
  mapUrl: '',
  openingHours: [],
  cancellationPolicy: '',
}

// Until the admin saves its own WhatsApp number, fall back to the provisional one.
const FALLBACK_WHATSAPP = '351967022608'

let info: BusinessInfo = { ...EMPTY_INFO, whatsappNumber: FALLBACK_WHATSAPP }
let loadStarted = false
const listeners = new Set<() => void>()

function setInfo(next: Partial<BusinessInfo>) {
  info = { ...EMPTY_INFO, ...next, whatsappNumber: next.whatsappNumber || FALLBACK_WHATSAPP }
  listeners.forEach((listener) => listener())
}

/** Loads the business details once; called by the first component that needs them. */
export function loadBusinessInfo(force = false) {
  if (loadStarted && !force) return
  loadStarted = true
  api
    .get<BusinessInfo>('/settings')
    .then(setInfo)
    .catch(() => {
      // Offline or server asleep: keep whatever we have; nothing breaks, details just stay hidden.
    })
}

export function getBusinessInfo() {
  return info
}

/** Current business details; re-renders when they load or the admin saves new ones. */
export function useBusinessInfo() {
  useEffect(() => loadBusinessInfo(), [])
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => info,
  )
}

export function hasWhatsappNumber(number: string) {
  return number.replace(/\D/g, '').length >= 9
}

export function whatsappLink(number: string, message: string) {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}

export function instagramDmUrl() {
  return siteConfig.instagramUrl
}

/** Builds a wa.me link from a customer-entered phone number (assumes PT if no country code was typed). */
export function customerWhatsappUrl(rawPhone: string, message: string) {
  const digits = rawPhone.replace(/\D/g, '')
  const withCountryCode = digits.startsWith('351') ? digits : `351${digits}`
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${withCountryCode}?text=${encoded}`
}

/** WhatsApp availability + link builder, kept in sync with the admin's settings. */
export function useWhatsapp() {
  const { whatsappNumber } = useBusinessInfo()
  return {
    enabled: hasWhatsappNumber(whatsappNumber),
    url: (message: string) => whatsappLink(whatsappNumber, message),
  }
}
