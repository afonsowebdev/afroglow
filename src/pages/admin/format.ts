import { formatPrice } from '@/lib/types'

/** The admin thinks in Lisbon time, wherever the phone is. */
export const LISBON_TZ = 'Europe/Lisbon'

/** "2026-10-21", the Lisbon day of a moment. */
export function dateKey(iso: string | Date) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: LISBON_TZ })
}

export function todayKey() {
  return dateKey(new Date())
}

export function addDaysKey(key: string, days: number) {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function getLisbonYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: LISBON_TZ, year: 'numeric', month: 'numeric' }).formatToParts(date)
  return {
    year: Number(parts.find((p) => p.type === 'year')!.value),
    month: Number(parts.find((p) => p.type === 'month')!.value),
  }
}

export function monthLabel(viewMonth: { year: number; month: number }) {
  const label = new Date(viewMonth.year, viewMonth.month - 1, 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function dateParts(iso: string) {
  const d = new Date(iso)
  const tz = { timeZone: LISBON_TZ }
  return {
    day: d.toLocaleDateString('pt-PT', { ...tz, day: 'numeric' }),
    month: d.toLocaleDateString('pt-PT', { ...tz, month: 'short' }).replace('.', ''),
    weekday: d.toLocaleDateString('pt-PT', { ...tz, weekday: 'long' }),
    weekdayShort: d.toLocaleDateString('pt-PT', { ...tz, weekday: 'short' }).replace('.', ''),
    time: d.toLocaleTimeString('pt-PT', { ...tz, hour: '2-digit', minute: '2-digit' }),
  }
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** "Hoje", "Amanhã", or "Quinta-feira, 24 out". */
export function dayTitle(iso: string) {
  const key = dateKey(iso)
  if (key === todayKey()) return 'Hoje'
  if (key === addDaysKey(todayKey(), 1)) return 'Amanhã'
  if (key === addDaysKey(todayKey(), -1)) return 'Ontem'
  const { weekday, day, month } = dateParts(iso)
  return `${capital(weekday)}, ${day} ${month}`
}

/** "Hoje às 14:00", "Amanhã às 09:00", "Sáb, 24 out · 09:00". */
export function whenLabel(iso: string) {
  const { time, weekdayShort, day, month } = dateParts(iso)
  const title = dayTitle(iso)
  if (title === 'Hoje' || title === 'Amanhã' || title === 'Ontem') return `${title} às ${time}`
  return `${capital(weekdayShort)}, ${day} ${month} · ${time}`
}

/** "Há 5 min", "Há 3 h", "Ontem", "Há 4 dias". */
export function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'Agora'
  if (minutes < 60) return `Há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Há ${hours} h`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Ontem'
  if (days < 30) return `Há ${days} dias`
  return new Date(iso).toLocaleDateString('pt-PT', { timeZone: LISBON_TZ, day: 'numeric', month: 'short', year: 'numeric' })
}

/** "65 €", "62,50 €". */
export function euros(cents: number) {
  return formatPrice(cents).replace(/,00/, '')
}

export function longDate(key: string) {
  return capital(
    new Date(`${key}T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }),
  )
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "25 out". */
export function shortDate(key: string) {
  const [, month, day] = key.split('-').map(Number)
  return `${day} ${MONTHS[month - 1]}`
}

export function greeting() {
  const hour = Number(new Date().toLocaleTimeString('en-GB', { timeZone: LISBON_TZ, hour: '2-digit', hour12: false }))
  if (hour < 6) return 'Boa noite'
  if (hour < 13) return 'Bom dia'
  if (hour < 20) return 'Boa tarde'
  return 'Boa noite'
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/** A phone number for tel: links. */
export function telHref(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, '')}`
}
