import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

/*
 * A booking as a calendar event (.ics). Opened by the app in Safari, which offers to add it to the iPhone's
 * Calendar (a downloaded file can't be handed to Calendar from inside the app). The booking id is long and random,
 * and the event holds only the hairstyle, the time and the studio's address.
 */
export const calendarRouter = Router()

const icsDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const icsText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`)

/** Session length: the first number in labels like "4-6h" (hours), otherwise 2 hours. */
function durationHours(label: string) {
  const match = label.match(/\d+(?:[.,]\d+)?/)
  const hours = match ? Number(match[0].replace(',', '.')) : NaN
  return Number.isFinite(hours) && hours > 0 && hours <= 12 ? hours : 2
}

calendarRouter.get('/:file', async (req, res) => {
  const id = req.params.file.replace(/\.ics$/i, '')
  const booking = await prisma.booking.findUnique({ where: { id }, include: { slot: true, service: true } })
  if (!booking || booking.status === 'CANCELLED' || booking.status === 'REJECTED') {
    res.status(404).json({ error: 'Marcação não encontrada.' })
    return
  }
  const settings = await prisma.businessSettings.findUnique({ where: { id: 'main' } })
  const start = booking.slot.startsAt
  const end = new Date(start.getTime() + durationHours(booking.service.durationLabel) * 3_600_000)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AFROGLOW//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@afroglow.pt`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(`AFROGLOW · ${booking.service.name}`)}`,
    ...(settings?.address ? [`LOCATION:${icsText(settings.address)}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(`Sessão AFROGLOW: ${booking.service.name}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', 'inline; filename="afroglow-marcacao.ics"')
  res.send(lines.join('\r\n'))
})
