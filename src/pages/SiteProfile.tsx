import { useState, type ComponentType } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarCheck, CalendarPlus, LayoutGrid, LogOut, MessageSquareQuote, Settings } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { dayParts, longDay, timeLabel } from '@/customer/dates'
import { StatusDot } from '@/customer/panel'
import { TestimonialForm } from '@/customer/TestimonialForm'
import { useProfile } from '@/customer/use-profile'
import { bookPath } from '@/lib/app-mode'
import { useCustomerAuth } from '@/lib/customer-auth'
import { formatPrice } from '@/lib/types'
import { cn } from '@/lib/utils'
import { bookingName, bookingPrice, bookingExtras } from '@/lib/pricing'

/** Small caps label used over every block of the page. */
const label = 'font-subtitle text-[11px] font-medium uppercase tracking-[0.18em] text-onyx/50'

function SideLink({
  Icon,
  text,
  onClick,
  active = false,
  danger = false,
}: {
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>
  text: string
  onClick: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-3 border-l-2 py-2.5 pl-4 text-left font-subtitle text-sm transition-colors',
        active ? 'border-onyx font-medium text-onyx' : 'border-transparent text-onyx/60 hover:text-onyx',
        danger && 'text-red-700 hover:text-red-800 dark:text-red-400',
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
      {text}
    </button>
  )
}

/**
 * The website's profile page, laid out like an account page: who the customer is and the account links in a
 * column on the left; the numbers, the next session, the history and the testimonial on the right. Black and
 * white only. Same data as the app's profile screen (useProfile); the app keeps its own design.
 */
export default function SiteProfile() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { customer, logout } = useCustomerAuth()
  const {
    bookings,
    upcoming,
    done,
    spent,
    sinceLabel,
    photo,
    photoBusy,
    photoError,
    photoInput,
    changePhoto,
    removePhoto,
  } = useProfile()
  // /conta?tab=testemunho (from the website's testimonials) opens the form straight away.
  const [searchParams] = useSearchParams()
  const [testimonialOpen, setTestimonialOpen] = useState(() => searchParams.get('tab') === 'testemunho')

  if (!customer) return <div className="min-h-screen bg-white" />

  const firstName = customer.name.trim().split(/\s+/)[0] || customer.name
  const initial = customer.name.trim().charAt(0).toUpperCase() || '?'
  const next = upcoming[0]
  const nextParts = next ? dayParts(next.slot.startsAt) : null

  const stats = [
    { value: bookings ? String(done.length) : '–', label: done.length === 1 ? 'Sessão feita' : 'Sessões feitas' },
    { value: bookings ? String(upcoming.length) : '–', label: upcoming.length === 1 ? 'Marcada' : 'Marcadas' },
    { value: bookings ? formatPrice(spent).replace(/,00/, '') : '–', label: 'Investido' },
  ]

  return (
    <main className="mx-auto grid max-w-6xl gap-12 px-5 pb-32 pt-6 sm:px-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16 lg:pt-10">
      {/* Who the customer is, and the account links. Phones: the links move to the end of the page. */}
      <aside className="contents lg:sticky lg:top-28 lg:block lg:self-start">
        <div className="order-1 flex items-center gap-4 lg:flex-col lg:items-start">
          <div className="relative size-20 shrink-0 lg:size-28">
            <button
              type="button"
              aria-label="Alterar foto de perfil"
              disabled={photoBusy}
              onClick={() => photoInput.current?.click()}
              className="flex size-full items-center justify-center overflow-hidden rounded-full bg-onyx font-logo text-4xl text-white lg:text-5xl"
            >
              {photo ? <img src={photo} alt="" className="size-full object-cover" /> : initial}
            </button>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void changePhoto(e.target.files?.[0])}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-subtitle text-lg font-medium text-onyx">{customer.name}</p>
            <p className="truncate font-subtitle text-sm text-onyx/55">{customer.email}</p>
            <p className="mt-1 font-subtitle text-xs text-onyx/45">
              {sinceLabel ? `Cliente desde ${sinceLabel}` : 'Cliente AFROGLOW'}
            </p>
            <div className="mt-3 flex gap-4 font-subtitle text-xs">
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => photoInput.current?.click()}
                className="text-onyx underline underline-offset-4 hover:no-underline"
              >
                {photoBusy ? 'A guardar...' : photo ? 'Alterar foto' : 'Adicionar foto'}
              </button>
              {photo && (
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={() => void removePhoto()}
                  className="text-onyx/55 underline underline-offset-4 hover:text-onyx"
                >
                  Remover
                </button>
              )}
            </div>
            {photoError && <p className="mt-2 font-subtitle text-xs text-red-700">{photoError}</p>}
          </div>
        </div>

        <nav aria-label="A minha conta" className="order-3 border-t border-onyx/10 pt-6 lg:mt-8">
          <SideLink
            Icon={LayoutGrid}
            text="Resumo"
            active={pathname === '/conta'}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />
          <SideLink Icon={CalendarCheck} text="As minhas marcações" onClick={() => navigate('/marcacoes')} />
          <SideLink Icon={CalendarPlus} text="Agendar sessão" onClick={() => navigate(bookPath)} />
          <SideLink Icon={MessageSquareQuote} text="Deixar testemunho" onClick={() => setTestimonialOpen(true)} />
          <SideLink Icon={Settings} text="Definições" onClick={() => navigate('/definicoes')} />
          <div className="my-3 border-t border-onyx/10" />
          <SideLink Icon={LogOut} text="Terminar sessão" danger onClick={() => void logout().then(() => navigate('/'))} />
        </nav>
      </aside>

      <div className="order-2 min-w-0 lg:order-none">
        <h1 className="font-logo text-4xl text-onyx sm:text-5xl">Olá, {firstName}</h1>

        {/* The numbers, in a row of three separated by hairlines. */}
        <dl className="mt-8 grid grid-cols-3 border-y border-onyx/10">
          {stats.map((stat, i) => (
            <div key={stat.label} className={cn('flex flex-col-reverse py-6', i > 0 && 'border-l border-onyx/10 pl-5 sm:pl-8')}>
              <dt className={`mt-2 ${label}`}>{stat.label}</dt>
              <dd className="font-logo text-3xl leading-none text-onyx sm:text-4xl">{stat.value}</dd>
            </div>
          ))}
        </dl>

        {/* The next session, as a black band. */}
        <section className="mt-12">
          <h2 className={label}>Próxima sessão</h2>
          {next && nextParts ? (
            <button
              type="button"
              onClick={() => navigate('/marcacoes')}
              className="group mt-4 flex w-full flex-col gap-5 rounded-2xl bg-onyx p-6 text-left text-white sm:flex-row sm:items-center sm:p-8"
            >
              <div className="flex shrink-0 items-baseline gap-3 sm:w-36 sm:flex-col sm:gap-1">
                <span className="font-logo text-5xl leading-none">{nextParts.day}</span>
                <span className="font-subtitle text-xs uppercase tracking-[0.18em] opacity-70">
                  {nextParts.month} · {nextParts.weekday}
                </span>
              </div>
              <div className="min-w-0 flex-1 sm:border-l sm:border-white/15 sm:pl-8">
                <p className="font-subtitle text-xl font-medium">{next.service.name}</p>
                {bookingExtras(next) && <p className="font-subtitle text-sm opacity-70">{bookingExtras(next)}</p>}
                <p className="mt-1 font-subtitle text-sm opacity-70">
                  {longDay(next.slot.startsAt)} às {timeLabel(next.slot.startsAt)}
                  {next.service.durationLabel ? ` · ${next.service.durationLabel}` : ''}
                </p>
                {/* The status in white over the black band; the dot keeps its colour. */}
                <div className="mt-3 [&>span]:text-white">
                  <StatusDot status={next.status} />
                </div>
              </div>
              <span className="flex items-center gap-1 font-subtitle text-sm opacity-80 transition-opacity group-hover:opacity-100">
                Ver marcações
                <i
                  className="bx bx-right-arrow-alt text-lg transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </button>
          ) : (
            <div className="mt-4 flex flex-col items-start gap-4 rounded-2xl border border-onyx/10 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <p className="font-subtitle text-base text-onyx">Ainda sem sessões marcadas.</p>
              <button
                type="button"
                onClick={() => navigate(bookPath)}
                className="h-11 rounded-full bg-onyx px-6 font-subtitle text-sm font-medium text-white transition-colors hover:bg-onyx/85"
              >
                Agendar sessão
              </button>
            </div>
          )}
          {upcoming.length > 1 && (
            <p className="mt-3 font-subtitle text-sm text-onyx/55">
              E mais {upcoming.length - 1} {upcoming.length === 2 ? 'sessão marcada' : 'sessões marcadas'}.
            </p>
          )}
        </section>

        {/* The history, as a table. */}
        <section className="mt-14">
          <h2 className={label}>Histórico</h2>
          {done.length === 0 ? (
            <p className="mt-4 border-y border-onyx/10 py-8 text-center font-subtitle text-sm text-onyx/55">
              As tuas sessões concluídas aparecem aqui.
            </p>
          ) : (
            <table className="mt-4 w-full border-collapse font-subtitle text-sm">
              <thead>
                <tr className="border-b border-onyx/10 text-left">
                  <th className={`py-3 pr-4 font-medium ${label}`}>Data</th>
                  <th className={`py-3 pr-4 font-medium ${label}`}>Serviço</th>
                  <th className={`hidden py-3 pr-4 text-right font-medium sm:table-cell ${label}`}>Preço</th>
                  <th className="py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {done.map((b) => {
                  const parts = dayParts(b.slot.startsAt)
                  return (
                    <tr key={b.id} className="border-b border-onyx/10">
                      <td className="whitespace-nowrap py-4 pr-4 text-onyx/60">
                        {parts.day} {parts.month}
                      </td>
                      <td className="py-4 pr-4 font-medium text-onyx">{bookingName(b)}</td>
                      <td className="hidden whitespace-nowrap py-4 pr-4 text-right tabular-nums text-onyx sm:table-cell">
                        {formatPrice(bookingPrice(b))}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`${bookPath}?service=${b.serviceId}`)}
                          className="whitespace-nowrap text-onyx underline underline-offset-4 hover:no-underline"
                        >
                          Marcar de novo
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* The testimonial, as a closing line. */}
        <section className="mt-14 flex flex-col items-start gap-4 border-t border-onyx/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-logo text-2xl text-onyx">Conta como foi</p>
            <p className="mt-1 font-subtitle text-sm text-onyx/55">
              Depois de aprovado, o teu testemunho aparece na página principal com o teu nome.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTestimonialOpen(true)}
            className="h-11 shrink-0 rounded-full border border-onyx px-6 font-subtitle text-sm font-medium text-onyx transition-colors hover:bg-onyx hover:text-white"
          >
            Escrever testemunho
          </button>
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
