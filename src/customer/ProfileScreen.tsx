import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ActionButton } from '@/components/ui/action-button'
import { Sheet } from '@/components/ui/sheet'
import { api } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'
import { tap } from '@/lib/haptics'
import { formatPrice, type Booking } from '@/lib/types'
import { TestimonialForm } from '@/pages/AccountPage'
import { dayParts, longDay, timeLabel } from './dates'
import { Fact, Facts, labelClass, panelClass, StatusDot } from './panel'
import { useLightStatusBar } from './useLightStatusBar'

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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 px-2 text-center">
      <p className="font-subtitle text-3xl font-semibold leading-none tracking-tight text-onyx">{value}</p>
      <p className="mt-2 font-subtitle text-[10px] uppercase tracking-[0.14em] text-muted-dark">{label}</p>
    </div>
  )
}

/** Who the customer is and what they have done with us. Account settings live on their own screen. */
export default function ProfileScreen() {
  useLightStatusBar()
  const navigate = useNavigate()
  const { customer } = useCustomerAuth()
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [testimonialOpen, setTestimonialOpen] = useState(false)

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

  if (!customer) return <div className="min-h-screen bg-white" />

  const initial = customer.name.trim().charAt(0).toUpperCase() || '?'
  const next = data.upcoming[0]
  const nextParts = next ? dayParts(next.slot.startsAt) : null
  const sinceLabel = data.since
    ? `${MONTHS[new Date(data.since).getMonth()]} de ${new Date(data.since).getFullYear()}`
    : null

  return (
    <main className="pb-40">
      <header className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-b from-[#1c1c1e] via-[#2c2a26] to-[#7d6a2f] px-6 pb-20 pt-[calc(1.25rem+env(safe-area-inset-top))] text-center text-[#f5efdf] dark:from-[#2b1d12] dark:via-[#3b2616] dark:to-[#7a5a22]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-logo text-[26vw] leading-none text-[#ffffff]/[0.06]"
        >
          AFROGLOW
        </span>

        <div className="relative flex items-center justify-between">
          <span className="font-subtitle text-[11px] uppercase tracking-[0.22em] text-[#f5efdf]/70">O meu perfil</span>
          <button
            type="button"
            aria-label="Definições"
            onClick={() => {
              void tap()
              navigate('/definicoes')
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ffffff]/30 bg-[#ffffff]/10 text-xl text-[#ffffff] backdrop-blur-md"
          >
            <i className="bx bx-cog" aria-hidden="true" />
          </button>
        </div>

        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="relative mx-auto mt-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#e0c36e] to-[#a8842f] p-[3px] shadow-xl shadow-black/30"
        >
          <span className="flex h-full w-full items-center justify-center rounded-full bg-[#1c1c1e] font-logo text-6xl text-[#e0c36e] dark:bg-[#2b1d12]">
            {initial}
          </span>
        </motion.div>

        <h1 className="relative mt-5 truncate font-subtitle text-3xl font-semibold tracking-tight text-[#ffffff]">
          {customer.name}
        </h1>
        <p className="relative mt-1 font-subtitle text-sm text-[#f5efdf]/70">
          {sinceLabel ? `Cliente desde ${sinceLabel}` : 'Cliente AFROGLOW'}
        </p>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        <div className="relative z-10 -mt-10 flex divide-x divide-onyx/10 rounded-2xl border border-onyx/15 bg-white py-5 shadow-md shadow-black/10">
          <Stat value={bookings ? String(data.done.length) : '–'} label="Sessões" />
          <Stat value={nextParts ? `${nextParts.day} ${nextParts.month}` : '–'} label="Próxima" />
          <Stat value={bookings ? formatPrice(data.spent).replace(/,00/, '') : '–'} label="Investido" />
        </div>

        <section className="mt-8">
          <h2 className={`${labelClass} mb-3 px-1`}>Próxima sessão</h2>
          {next ? (
            <button
              type="button"
              onClick={() => navigate('/marcacoes')}
              className={`${panelClass} block w-full text-left`}
            >
              <div className="flex items-center justify-between">
                <p className="font-subtitle text-xl font-semibold tracking-tight text-onyx">{next.service.name}</p>
                <StatusDot status={next.status} />
              </div>
              <Facts columns="2fr 1fr">
                <Fact label="Data">{longDay(next.slot.startsAt)}</Fact>
                <Fact label="Hora">{timeLabel(next.slot.startsAt)}</Fact>
              </Facts>
            </button>
          ) : (
            <div className={panelClass}>
              <p className="font-subtitle text-base text-onyx">Sem sessões marcadas.</p>
              <ActionButton label="Marcar sessão" className="mt-4" onClick={() => navigate('/marcar')} />
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className={`${labelClass} mb-3 px-1`}>Histórico</h2>
          {data.done.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-onyx/20 px-5 py-6 text-center font-subtitle text-sm text-muted-dark">
              As tuas sessões concluídas aparecem aqui.
            </p>
          ) : (
            <ol className="relative ml-2 border-l border-onyx/15">
              {data.done.slice(0, 4).map((b) => {
                const parts = dayParts(b.slot.startsAt)
                return (
                  <li key={b.id} className="relative pb-6 pl-6 last:pb-0">
                    <span
                      className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-onyx"
                      aria-hidden="true"
                    />
                    <p className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                      {parts.day} {parts.month}
                    </p>
                    <p className="mt-0.5 font-subtitle text-base font-semibold text-onyx">{b.service.name}</p>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <section className={`${panelClass} mt-8`}>
          <p className={labelClass}>Testemunho</p>
          <p className="mt-2 font-subtitle text-xl font-semibold tracking-tight text-onyx">Conta como foi</p>
          <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">
            Depois de aprovado, aparece na página principal com o teu nome.
          </p>
          <ActionButton label="Escrever testemunho" className="mt-4" onClick={() => setTestimonialOpen(true)} />
        </section>
      </div>

      <Sheet
        open={testimonialOpen}
        icon="bx bx-message-rounded-dots"
        title="O teu testemunho"
        description="Depois de aprovado, aparece na página principal com o teu nome."
        hideSubmit
        submitLabel=""
        onSubmit={() => {}}
        onClose={() => setTestimonialOpen(false)}
      >
        <TestimonialForm />
      </Sheet>
    </main>
  )
}
