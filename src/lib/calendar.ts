import { siteConfig } from '@/lib/site-config'

function icsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function icsText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`)
}

/** Session length: the first number in labels like "4-6 horas" (hours), otherwise 2 hours. */
function durationHours(durationLabel: string) {
  const match = durationLabel.match(/\d+(?:[.,]\d+)?/)
  const hours = match ? Number(match[0].replace(',', '.')) : NaN
  return Number.isFinite(hours) && hours > 0 && hours <= 12 ? hours : 2
}

/** Builds a calendar event for a booking and triggers its download as an .ics file. */
export function downloadBookingIcs(booking: { serviceName: string; startsAtIso: string; durationLabel: string }) {
  const start = new Date(booking.startsAtIso)
  const end = new Date(start.getTime() + durationHours(booking.durationLabel) * 3_600_000)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${siteConfig.name}//PT`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${start.getTime()}-${Math.random().toString(36).slice(2)}@afroglow.pt`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(`${siteConfig.name} · ${booking.serviceName}`)}`,
    ...(siteConfig.address ? [`LOCATION:${icsText(siteConfig.address)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'afroglow-marcacao.ics'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
