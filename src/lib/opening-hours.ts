import { useEffect, useState } from 'react'

/* Opening hours as the admin types them (free text), read for the website's open / closed status. */

type Interval = [open: number, close: number]

const DAY_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function dayIndex(word: string) {
  const key = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().slice(0, 3)
  return DAY_KEYS.indexOf(key)
}

/** "Terça-feira", "Segunda a Sexta", "Sábado e Domingo" → weekday indexes; null when it can't be read. */
function parseDays(label: string): number[] | null {
  const days: number[] = []
  for (const part of label.split(/\s*,\s*|\s+e\s+/)) {
    const range = part.match(/^(.+?)\s+(?:a|até|-|–)\s+(.+)$/i)
    const from = dayIndex(range ? range[1] : part)
    const to = range ? dayIndex(range[2]) : from
    if (from < 0 || to < 0) return null
    for (let day = from; ; day = (day + 1) % 7) {
      days.push(day)
      if (day === to) break
    }
  }
  return days
}

/** "09:00-18:00" or "09:00-13:00, 14:00-18:00" → minutes since midnight. */
function parseHours(text: string): Interval[] {
  return [...text.matchAll(/(\d{1,2})[:h](\d{2})\s*(?:-|–|às|até|a)\s*(\d{1,2})[:h](\d{2})/g)].map((m) => [
    +m[1] * 60 + +m[2],
    +m[3] * 60 + +m[4],
  ])
}

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** Weekday and minutes right now in Portugal, whatever the visitor's timezone. */
function lisbonNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
    minutes: +get('hour') * 60 + +get('minute'),
  }
}

/**
 * Reads the free-text opening hours the admin typed. Rows it can't understand are still
 * listed, they just don't count towards the open / closed status.
 */
export function useOpeningStatus(rows: Array<{ days: string; hours: string }>) {
  const [now, setNow] = useState(lisbonNow)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(lisbonNow()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const week: Interval[][] = Array.from({ length: 7 }, () => [])
  const todayRows = new Set<number>()
  const listed = new Set<number>()
  let understood = false
  rows.forEach((row, index) => {
    const days = parseDays(row.days)
    const intervals = parseHours(row.hours)
    if (!days || (!intervals.length && !/fechad/i.test(row.hours))) return
    understood = true
    days.forEach((day) => {
      week[day].push(...intervals)
      listed.add(day)
    })
    if (days.includes(now.day)) todayRows.add(index)
  })
  if (!understood) return { todayRows, closedDays: [], todayClosed: false, status: null }

  // Days the admin didn't list at all are closed; shown as one extra row, Monday first.
  const closedDays = [1, 2, 3, 4, 5, 6, 0].filter((day) => !listed.has(day))
  const todayClosed = closedDays.includes(now.day)
  const base = { todayRows, closedDays, todayClosed }

  const current = week[now.day].find(([open, close]) => now.minutes >= open && now.minutes < close)
  if (current) return { ...base, status: { open: true, text: `Aberto agora · fecha às ${clock(current[1])}` } }

  for (let ahead = 0; ahead < 7; ahead++) {
    const day = (now.day + ahead) % 7
    const next = week[day]
      .filter(([open]) => ahead > 0 || open > now.minutes)
      .sort((a, b) => a[0] - b[0])[0]
    if (!next) continue
    const when = ahead === 0 ? 'hoje' : ahead === 1 ? 'amanhã' : DAY_NAMES[day]
    return { ...base, status: { open: false, text: `Fechado · abre ${when} às ${clock(next[0])}` } }
  }
  return { ...base, status: { open: false, text: 'Fechado' } }
}

/** [1, 6, 0] → "Segunda, sábado e domingo". */
export function dayList(days: number[]) {
  const names = days.map((day) => DAY_NAMES[day])
  const text = names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : names[0]
  return text.charAt(0).toUpperCase() + text.slice(1)
}
