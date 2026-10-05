import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ActionButton } from '@/components/ui/action-button'
import { Sheet } from '@/components/ui/sheet'
import { api, ApiError } from '@/lib/api'
import { shrinkAvatar } from '@/lib/avatar'
import { useCustomerAuth } from '@/lib/customer-auth'
import { tap } from '@/lib/haptics'
import { formatPrice, type Booking } from '@/lib/types'
import { TestimonialForm } from '@/pages/AccountPage'
import { dayParts, longDay, timeLabel } from './dates'
import { Fact, Facts, labelClass, panelClass, StatusDot } from './panel'

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
      <p className="font-subtitle text-2xl font-light leading-none tracking-tight text-onyx">{value}</p>
      <p className="mt-2 font-subtitle text-[10px] uppercase tracking-[0.14em] text-muted-dark">{label}</p>
    </div>
  )
}

/** Who the customer is and what they have done with us. Account settings live on their own screen. */
export default function ProfileScreen() {
  const navigate = useNavigate()
  const { customer } = useCustomerAuth()
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [testimonialOpen, setTestimonialOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api
      .get<{ dataUrl: string | null }>('/account/avatar')
      .then((data) => setPhoto(data.dataUrl))
      .catch(() => {})
  }, [])

  async function changePhoto(file: File | undefined) {
    if (!file) return
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      const data = await shrinkAvatar(file)
      await api.put('/account/avatar', { contentType: 'image/jpeg', data })
      setPhoto(`data:image/jpeg;base64,${data}`)
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
      setPhoto(null)
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

  if (!customer) return <div className="min-h-screen bg-white" />

  const initial = customer.name.trim().charAt(0).toUpperCase() || '?'
  const next = data.upcoming[0]
  const nextParts = next ? dayParts(next.slot.startsAt) : null
  const sinceLabel = data.since
    ? `${MONTHS[new Date(data.since).getMonth()]} de ${new Date(data.since).getFullYear()}`
    : null

  return (
    <main className="pb-40">
      <header className="relative overflow-hidden bg-gradient-to-b from-cream via-white to-white px-6 pb-8 pt-[calc(1.25rem+env(safe-area-inset-top))] text-center">
        {/* A soft golden glow behind the avatar, and the brand word barely visible */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,168,76,0.28),transparent)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 select-none whitespace-nowrap font-logo text-[30vw] leading-none text-gold/[0.10]"
        >
          AFROGLOW
        </span>

        <div className="relative flex items-center justify-between">
          <span className="font-subtitle text-[11px] uppercase tracking-[0.28em] text-muted-dark">O meu perfil</span>
          <button
            type="button"
            aria-label="Definições"
            onClick={() => {
              void tap()
              navigate('/definicoes')
            }}
            className="glass-chip flex h-10 w-10 items-center justify-center rounded-full text-xl text-onyx"
          >
            <i className="bx bx-cog" aria-hidden="true" />
          </button>
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="relative mx-auto mt-8 h-32 w-32"
        >
          {/* two fine rings around the monogram */}
          <span className="absolute inset-0 rounded-full border border-gold-ink/30" aria-hidden="true" />
          <span className="absolute inset-[7px] rounded-full border border-gold-ink/60" aria-hidden="true" />
          <button
            type="button"
            aria-label="Alterar foto de perfil"
            disabled={photoBusy}
            onClick={() => {
              void tap()
              photoInput.current?.click()
            }}
            className="absolute inset-[14px] flex items-center justify-center overflow-hidden rounded-full bg-white font-logo text-6xl text-gold-ink shadow-[0_8px_24px_rgba(201,168,76,0.25)]"
          >
            {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initial}
          </button>
          <span
            aria-hidden="true"
            className="glass-chip pointer-events-none absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full text-lg text-onyx"
          >
            <i className={photoBusy ? 'bx bx-loader-alt animate-spin' : 'bx bx-camera'} />
          </span>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void changePhoto(e.target.files?.[0])}
          />
        </motion.div>

        <h1 className="relative mt-6 truncate font-subtitle text-[28px] font-light tracking-tight text-onyx">
          {customer.name}
        </h1>
        <div className="relative mx-auto mt-3 flex items-center justify-center gap-3" aria-hidden="true">
          <span className="h-px w-8 bg-gold-ink/40" />
          <i className="bx bxs-diamond text-[10px] text-gold-ink" />
          <span className="h-px w-8 bg-gold-ink/40" />
        </div>
        <p className="relative mt-3 font-subtitle text-xs uppercase tracking-[0.22em] text-muted-dark">
          {sinceLabel ? `Cliente desde ${sinceLabel}` : 'Cliente AFROGLOW'}
        </p>
        <p className="relative mt-3 font-subtitle text-xs text-muted-dark">
          <button
            type="button"
            disabled={photoBusy}
            onClick={() => photoInput.current?.click()}
            className="underline underline-offset-4"
          >
            {photo ? 'Alterar foto' : 'Adicionar foto'}
          </button>
          {photo && (
            <>
              {' · '}
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => void removePhoto()}
                className="underline underline-offset-4"
              >
                Remover
              </button>
            </>
          )}
        </p>
        {photoError && <p className="relative mt-2 font-subtitle text-xs text-red-700">{photoError}</p>}
      </header>

      <div className="mx-auto max-w-2xl px-5">
        <div className="flex divide-x divide-gold-ink/25 border-y border-gold-ink/25 py-5">
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
