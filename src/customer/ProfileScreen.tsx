import { useState, type ComponentType } from 'react'
import { FavouritesRow } from './FavouritesRow'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Camera,
  CalendarCheck,
  CalendarPlus,
  ChevronRight,
  History,
  LogOut,
  MessageSquareQuote,
  Settings,
} from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { bookPath } from '@/lib/app-mode'
import { useCustomerAuth } from '@/lib/customer-auth'
import { bookingExtras } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import { dayParts, longDay, timeLabel } from './dates'
import { StatusDot } from './panel'
import { TestimonialForm } from './TestimonialForm'
import { useProfile } from './use-profile'

/** One line of a grouped list: an icon, the label, an optional value, and a chevron. */
function Row({
  Icon,
  text,
  value,
  onClick,
  danger = false,
}: {
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>
  text: string
  value?: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left font-subtitle text-[15px] active:bg-onyx/[0.05]"
    >
      <Icon
        className={cn('size-5 shrink-0', danger ? 'text-red-700 dark:text-red-400' : 'text-onyx/70')}
        strokeWidth={1.75}
      />
      <span className={cn('flex-1', danger ? 'text-red-700 dark:text-red-400' : 'text-onyx')}>{text}</span>
      {value && <span className="text-sm text-onyx/45">{value}</span>}
      {!danger && <ChevronRight className="size-4 shrink-0 text-onyx/30" strokeWidth={2} />}
    </button>
  )
}

/** A rounded group of rows with hairlines between them, as in the iPhone's settings. */
function Group({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-onyx/[0.04]">{children}</div>
}

/**
 * The customer app's own profile: simple and in black and white, laid out like the iPhone's settings. The photo
 * and name at the top, the next session, then the account in grouped lists. The website keeps its own profile page.
 */
export default function ProfileScreen() {
  const navigate = useNavigate()
  const { customer, logout } = useCustomerAuth()
  const { bookings, upcoming, done, sinceLabel, photo, photoBusy, photoError, photoInput, changePhoto, removePhoto } =
    useProfile()
  // /conta?tab=testemunho (from the testimonials) opens the form straight away.
  const [searchParams] = useSearchParams()
  const [testimonialOpen, setTestimonialOpen] = useState(() => searchParams.get('tab') === 'testemunho')
  const [historyOpen, setHistoryOpen] = useState(false)

  if (!customer) return <div className="min-h-screen bg-white" />

  const initial = customer.name.trim().charAt(0).toUpperCase() || '?'
  const next = upcoming[0]
  const nextParts = next ? dayParts(next.slot.startsAt) : null

  return (
    <main className="mx-auto max-w-lg px-5 pb-36 pt-[calc(4.75rem+env(safe-area-inset-top))]">
      {/* Who the customer is. Tapping the photo changes it. */}
      <section className="flex flex-col items-center text-center">
        <button
          type="button"
          aria-label={photo ? 'Alterar foto de perfil' : 'Adicionar foto de perfil'}
          disabled={photoBusy}
          onClick={() => photoInput.current?.click()}
          className="relative size-24"
        >
          <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-onyx/[0.08] font-logo text-4xl text-onyx">
            {photo ? <img src={photo} alt="" className="size-full object-cover" /> : initial}
          </span>
          <span className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border-2 border-white bg-onyx text-white">
            <Camera className="size-4" strokeWidth={2} />
          </span>
        </button>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void changePhoto(e.target.files?.[0])}
        />
        <h1 className="mt-4 font-subtitle text-xl font-semibold text-onyx">{customer.name}</h1>
        <p className="mt-0.5 font-subtitle text-sm text-onyx/55">{customer.email}</p>
        <p className="mt-1 font-subtitle text-xs text-onyx/40">
          {photoBusy ? 'A guardar a foto...' : sinceLabel ? `Cliente desde ${sinceLabel}` : 'Cliente AFROGLOW'}
        </p>
        {photo && !photoBusy && (
          <button
            type="button"
            onClick={() => void removePhoto()}
            className="mt-2 font-subtitle text-xs text-onyx/55 underline underline-offset-4"
          >
            Remover foto
          </button>
        )}
        {photoError && <p className="mt-2 font-subtitle text-xs text-red-700">{photoError}</p>}
      </section>

      {/* The next session, or a way to book one. */}
      <section className="mt-8">
        <h2 className="mb-2 px-1 font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-onyx/45">
          Próxima sessão
        </h2>
        {bookings === null ? (
          <div className="h-[92px] animate-pulse rounded-2xl bg-onyx/[0.04]" />
        ) : next && nextParts ? (
          <button
            type="button"
            onClick={() => navigate('/marcacoes')}
            className="flex w-full items-center gap-4 rounded-2xl bg-onyx/[0.04] p-4 text-left active:bg-onyx/[0.07]"
          >
            <span className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-white py-2 shadow-sm shadow-black/5">
              <span className="font-subtitle text-[10px] font-medium uppercase tracking-wider text-onyx/50">
                {nextParts.month}
              </span>
              <span className="font-subtitle text-2xl font-semibold leading-tight text-onyx">{nextParts.day}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-subtitle text-[15px] font-medium text-onyx">
                {next.service.name}
              </span>
              {bookingExtras(next) && (
                <span className="block truncate font-subtitle text-xs text-onyx/55">{bookingExtras(next)}</span>
              )}
              <span className="block font-subtitle text-xs text-onyx/55">
                {longDay(next.slot.startsAt)} às {timeLabel(next.slot.startsAt)}
              </span>
              <span className="mt-1.5 block">
                <StatusDot status={next.status} />
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-onyx/30" strokeWidth={2} />
          </button>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-onyx/[0.04] p-4">
            <p className="font-subtitle text-sm text-onyx/60">Ainda sem sessões marcadas.</p>
            <button
              type="button"
              onClick={() => navigate(bookPath)}
              className="h-9 shrink-0 rounded-full bg-onyx px-4 font-subtitle text-sm font-medium text-white"
            >
              Marcar
            </button>
          </div>
        )}
      </section>

      {/* The hairstyles she hearted. */}
      <div className="mt-8">
        <FavouritesRow labelClass="mb-2 px-1 font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-onyx/45" />
      </div>

      {/* The account, in grouped lists. */}
      <section className="mt-8 flex flex-col gap-4">
        <Group>
          <Row
            Icon={CalendarCheck}
            text="As minhas marcações"
            value={bookings && upcoming.length > 0 ? String(upcoming.length) : undefined}
            onClick={() => navigate('/marcacoes')}
          />
          <Row Icon={CalendarPlus} text="Marcar sessão" onClick={() => navigate(bookPath)} />
          <Row
            Icon={History}
            text="Histórico"
            value={bookings ? String(done.length) : undefined}
            onClick={() => setHistoryOpen(true)}
          />
        </Group>
        <Group>
          <Row Icon={MessageSquareQuote} text="Deixar testemunho" onClick={() => setTestimonialOpen(true)} />
          <Row Icon={Settings} text="Definições" onClick={() => navigate('/definicoes')} />
        </Group>
        <Group>
          <Row Icon={LogOut} text="Terminar sessão" danger onClick={() => void logout().then(() => navigate('/'))} />
        </Group>
      </section>

      {/* The sessions already done, each with a way to book it again. */}
      <Sheet
        open={historyOpen}
        icon="bx bx-history"
        title="Histórico"
        description="As tuas sessões concluídas."
        hideSubmit
        submitLabel=""
        onSubmit={() => {}}
        onClose={() => setHistoryOpen(false)}
      >
        {done.length === 0 ? (
          <p className="py-6 text-center font-subtitle text-sm text-onyx/55">
            As tuas sessões concluídas aparecem aqui.
          </p>
        ) : (
          <ul className="divide-y divide-onyx/[0.08]">
            {done.map((b) => {
              const parts = dayParts(b.slot.startsAt)
              return (
                <li key={b.id} className="flex items-center gap-3 py-3">
                  <span className="w-14 shrink-0 font-subtitle text-xs text-onyx/55">
                    {parts.day} {parts.month}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-subtitle text-sm font-medium text-onyx">{b.service.name}</span>
                    {bookingExtras(b) && (
                      <span className="block truncate font-subtitle text-xs text-onyx/55">{bookingExtras(b)}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryOpen(false)
                      navigate(`${bookPath}?service=${b.serviceId}`)
                    }}
                    className="shrink-0 font-subtitle text-xs text-onyx underline underline-offset-4"
                  >
                    Marcar de novo
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Sheet>

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
