import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { MotionButton } from '@/components/ui/motion-button'
import { useBusinessInfo } from '@/lib/site-config'

type Interval = [open: number, close: number]

const DAY_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function dayIndex(word: string) {
  const key = word.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().slice(0, 3)
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
function useOpeningStatus(rows: Array<{ days: string; hours: string }>) {
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
function dayList(days: number[]) {
  const names = days.map((day) => DAY_NAMES[day])
  const text = names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : names[0]
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
})

/** Stylised street map behind the pin; decorative only, no third-party map is loaded. */
function MapArt() {
  return (
    <svg className="absolute inset-0 h-full w-full text-gold" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M-10 150 C 80 120, 140 170, 230 120 S 360 60, 420 80" strokeWidth="14" opacity="0.18" />
        <path d="M120 -10 C 140 60, 110 120, 150 210" strokeWidth="10" opacity="0.16" />
        <path d="M300 -10 L 260 210" strokeWidth="8" opacity="0.14" />
        <path d="M-10 40 L 420 20" strokeWidth="6" opacity="0.12" />
        <path d="M30 210 L 70 -10" strokeWidth="4" opacity="0.12" />
        <path d="M200 -10 C 210 40, 190 80, 230 120" strokeWidth="4" opacity="0.14" />
        <path d="M340 210 C 330 160, 370 130, 420 140" strokeWidth="4" opacity="0.12" />
      </g>
      <rect x="160" y="40" width="70" height="44" rx="10" fill="currentColor" opacity="0.08" />
      <rect x="40" y="70" width="50" height="34" rx="8" fill="currentColor" opacity="0.07" />
      <rect x="310" y="120" width="60" height="40" rx="10" fill="currentColor" opacity="0.07" />
    </svg>
  )
}

function HoursRow({ days, hours, today, closed = false }: { days: string; hours: string; today: boolean; closed?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 font-subtitle text-[15px] sm:px-4 sm:text-base ${
        today ? 'bg-gold/15' : ''
      }`}
    >
      <dt className={`flex items-center gap-2 ${today ? 'font-medium text-onyx' : 'text-muted-dark'}`}>
        {days}
        {today && (
          <span className="rounded-full bg-gold-deep px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ffffff]">
            Hoje
          </span>
        )}
      </dt>
      <dd className={`shrink-0 tabular-nums ${closed ? 'text-muted' : 'text-onyx'} ${today ? 'font-medium' : ''}`}>{hours}</dd>
    </div>
  )
}

/** Address and opening hours. Renders nothing until the business has filled them in (site-config). */
export default function Location() {
  const business = useBusinessInfo()
  const { todayRows, closedDays, todayClosed, status } = useOpeningStatus(business.openingHours)
  const [copied, setCopied] = useState(false)
  const hasHours = business.openingHours.length > 0
  if (!business.address && !hasHours) return null

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(business.address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: the address is on screen to select by hand.
    }
  }

  const both = business.address && hasHours

  return (
    <section id="localizacao" className="bg-white px-5 py-24 sm:px-8 md:py-32">
      <div className="mx-auto max-w-5xl">
        <p className="text-center font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">
          Visita-nos
        </p>
        <h2 className="mt-2 text-center font-logo text-4xl sm:text-5xl">Onde estamos</h2>
        <p className="mx-auto mt-4 max-w-xl text-center font-subtitle text-base font-light text-muted-dark">
          A morada, o horário e tudo o que precisas para chegar até nós.
        </p>

        <div className={`mt-14 grid gap-6 ${both ? 'md:grid-cols-[1.1fr_1fr]' : 'mx-auto max-w-xl'}`}>
          {business.address && (
            <motion.div
              {...reveal(0)}
              className="flex flex-col overflow-hidden rounded-3xl border border-gold/20 bg-white shadow-sm shadow-black/5"
            >
              <div className="relative h-44 overflow-hidden bg-cream sm:h-52">
                <MapArt />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[70%]">
                  <span className="absolute left-1/2 top-full h-3 w-8 -translate-x-1/2 -translate-y-1 rounded-full bg-gold-deep/30 blur-[2px]" />
                  <span className="absolute inset-0 animate-ping rounded-full bg-gold/40 motion-reduce:animate-none" />
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gold-deep text-2xl text-[#ffffff] shadow-lg shadow-gold-deep/30">
                    <i className="bx bxs-map" aria-hidden="true" />
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-7">
                <h3 className="font-logo text-xl text-onyx">Morada</h3>
                <address className="mt-2 font-subtitle text-lg not-italic leading-snug text-onyx">
                  {business.address}
                </address>

                <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                  {business.mapUrl && (
                    <MotionButton label="Abrir no mapa" size="sm" href={business.mapUrl} target="_blank" rel="noreferrer" />
                  )}
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="flex h-10 items-center gap-2 rounded-full border-[1.5px] border-onyx/15 px-4 font-subtitle text-xs font-medium text-onyx transition-colors hover:border-onyx/40"
                  >
                    <i className={`bx ${copied ? 'bx-check text-gold-ink' : 'bx-copy'} text-base`} aria-hidden="true" />
                    <span aria-live="polite">{copied ? 'Copiada' : 'Copiar morada'}</span>
                  </button>
                  {business.phone && (
                    <a
                      href={`tel:${business.phone.replace(/[^+\d]/g, '')}`}
                      className="flex h-10 items-center gap-2 rounded-full border-[1.5px] border-onyx/15 px-4 font-subtitle text-xs font-medium text-onyx transition-colors hover:border-onyx/40"
                    >
                      <i className="bx bx-phone text-base" aria-hidden="true" />
                      {business.phone}
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {hasHours && (
            <motion.div
              {...reveal(0.1)}
              className="flex flex-col rounded-3xl border border-gold/20 bg-white p-7 shadow-sm shadow-black/5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-deep/10 text-xl text-gold-ink">
                    <i className="bx bx-time-five" aria-hidden="true" />
                  </span>
                  <h3 className="font-logo text-xl text-onyx">Horário</h3>
                </div>
                {status && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-cream px-3 py-1.5 font-subtitle text-xs font-medium text-onyx">
                    <span className="relative flex h-2 w-2">
                      {status.open && (
                        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70 motion-reduce:animate-none" />
                      )}
                      <span className={`relative h-2 w-2 rounded-full ${status.open ? 'bg-emerald-500' : 'bg-muted'}`} />
                    </span>
                    {status.text}
                  </span>
                )}
              </div>

              <dl className="mt-6 flex flex-col gap-1">
                {business.openingHours.map((row, index) => (
                  <HoursRow key={row.days} days={row.days} hours={row.hours} today={todayRows.has(index)} />
                ))}
                {closedDays.length > 0 && (
                  <HoursRow days={dayList(closedDays)} hours="Fechado" today={todayClosed} closed />
                )}
              </dl>

              <div className="mt-auto pt-7">
                <MotionButton label="Marcar sessão" size="sm" href="/agendar" />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}
