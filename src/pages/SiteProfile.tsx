import { useState, type ComponentType, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarCheckFill,
  CalendarPlusFill,
  GearFill,
  QuoteBubbleFill,
  SignOutFill,
} from '@/components/ui/apple-icons'
import { MotionButton } from '@/components/ui/motion-button'
import { Sheet } from '@/components/ui/sheet'
import { dayParts, longDay, timeLabel } from '@/customer/dates'
import { StatusDot } from '@/customer/panel'
import { TestimonialForm } from '@/customer/TestimonialForm'
import { useProfile } from '@/customer/use-profile'
import { bookPath } from '@/lib/app-mode'
import { useCustomerAuth } from '@/lib/customer-auth'
import { formatPrice } from '@/lib/types'

const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
})

function SectionTitle({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">{eyebrow}</p>
      <h2 className="mt-1 font-logo text-3xl text-onyx sm:text-4xl">{children}</h2>
    </div>
  )
}

function AccountLink({
  Icon,
  label,
  onClick,
  danger = false,
}: {
  Icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-cream"
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
          danger ? 'bg-red-600/10 text-red-700 dark:text-red-400' : 'bg-gold-deep/10 text-gold-ink'
        }`}
      >
        <Icon className="size-5" />
      </span>
      <span className={`flex-1 font-subtitle text-sm font-medium ${danger ? 'text-red-700 dark:text-red-400' : 'text-onyx'}`}>
        {label}
      </span>
      <i
        className="bx bx-chevron-right text-xl text-muted-dark transition-transform duration-300 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </button>
  )
}

/**
 * The website's profile page: the same data as the app's profile screen (useProfile), laid out as a page of the
 * site — a wide header with the photo and the numbers, then the next session and history beside the account card.
 */
export default function SiteProfile() {
  const navigate = useNavigate()
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
    { value: bookings ? String(done.length) : '–', label: done.length === 1 ? 'Sessão' : 'Sessões' },
    { value: nextParts ? `${nextParts.day} ${nextParts.month}` : '–', label: 'Próxima' },
    { value: bookings ? formatPrice(spent).replace(/,00/, '') : '–', label: 'Investido' },
  ]

  return (
    <main className="pb-32 pt-4">
      <section className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          {...reveal(0)}
          className="relative overflow-hidden rounded-[2rem] border border-gold/20 bg-cream px-6 py-10 sm:px-12 sm:py-12"
        >
          {/* The brand word, faint, behind the right-hand side. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-6 -right-4 select-none whitespace-nowrap bg-gradient-to-b from-gold/20 to-transparent bg-clip-text font-logo text-[clamp(4rem,11vw,9rem)] leading-none text-transparent"
          >
            AFROGLOW
          </span>

          <div className="relative flex flex-col items-center gap-8 text-center lg:flex-row lg:gap-10 lg:text-left">
            <div className="relative size-32 shrink-0 sm:size-36">
              <button
                type="button"
                aria-label="Alterar foto de perfil"
                disabled={photoBusy}
                onClick={() => photoInput.current?.click()}
                className="flex size-full items-center justify-center overflow-hidden rounded-full bg-white font-logo text-6xl text-gold-ink shadow-lg shadow-gold-deep/15 ring-4 ring-white"
              >
                {photo ? <img src={photo} alt="" className="size-full object-cover" /> : initial}
              </button>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-1 right-1 flex size-9 items-center justify-center rounded-full bg-gold-deep text-lg text-[#ffffff] shadow-md"
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
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">
                O meu perfil
              </p>
              <h1 className="mt-1 truncate font-logo text-4xl text-onyx sm:text-5xl">Olá, {firstName}</h1>
              <p className="mt-3 font-subtitle text-sm text-muted-dark">
                {sinceLabel ? `Cliente desde ${sinceLabel}` : 'Cliente AFROGLOW'}
                {/* On its own line on phones, so the address never breaks in the middle. */}
                <span className="mx-2 hidden text-gold sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="block truncate sm:inline">{customer.email}</span>
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={() => photoInput.current?.click()}
                  className="flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-onyx/15 bg-white/70 px-4 font-subtitle text-xs font-medium text-onyx transition-colors hover:border-onyx/40"
                >
                  <i className="bx bx-camera text-base" aria-hidden="true" />
                  {photo ? 'Alterar foto' : 'Adicionar foto'}
                </button>
                {photo && (
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={() => void removePhoto()}
                    className="flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-onyx/15 bg-white/70 px-4 font-subtitle text-xs font-medium text-onyx transition-colors hover:border-onyx/40"
                  >
                    <i className="bx bx-trash text-base" aria-hidden="true" />
                    Remover
                  </button>
                )}
              </div>
              {photoError && <p className="mt-2 font-subtitle text-xs text-red-700">{photoError}</p>}
            </div>

            <dl className="grid w-full grid-cols-3 divide-x divide-gold/25 rounded-2xl border border-gold/20 bg-white/70 py-5 backdrop-blur-sm sm:max-w-md lg:w-auto lg:min-w-[380px]">
              {stats.map((stat) => (
                // Label first in the markup, shown under the number.
                <div key={stat.label} className="flex flex-col-reverse px-3 text-center">
                  <dt className="mt-2 font-subtitle text-[10px] font-medium uppercase tracking-[0.16em] text-muted-dark">
                    {stat.label}
                  </dt>
                  <dd className="font-logo text-2xl leading-none text-onyx sm:text-3xl">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </motion.div>
      </section>

      <div className="mx-auto mt-14 grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_340px] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-14">
          <motion.section {...reveal(0.1)}>
            <SectionTitle eyebrow="A seguir">Próxima sessão</SectionTitle>
            {next && nextParts ? (
              <div className="flex flex-col gap-6 rounded-3xl border border-gold/20 bg-white p-6 shadow-sm shadow-black/5 sm:flex-row sm:items-center sm:p-7">
                <div className="flex w-24 shrink-0 flex-col items-center rounded-2xl bg-gold-deep py-3 text-[#ffffff]">
                  <span className="font-subtitle text-[11px] font-medium uppercase tracking-[0.16em] opacity-80">
                    {nextParts.weekday}
                  </span>
                  <span className="font-logo text-4xl leading-tight">{nextParts.day}</span>
                  <span className="font-subtitle text-xs uppercase tracking-wide opacity-80">{nextParts.month}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <h3 className="font-logo text-2xl text-onyx">{next.service.name}</h3>
                    <StatusDot status={next.status} />
                  </div>
                  <p className="mt-2 font-subtitle text-sm text-muted-dark">
                    {longDay(next.slot.startsAt)} às {timeLabel(next.slot.startsAt)}
                    {next.service.durationLabel ? ` · ${next.service.durationLabel}` : ''}
                  </p>
                  {upcoming.length > 1 && (
                    <p className="mt-1 font-subtitle text-xs text-muted-dark">
                      E mais {upcoming.length - 1} {upcoming.length === 2 ? 'sessão marcada' : 'sessões marcadas'}.
                    </p>
                  )}
                </div>
                <MotionButton label="Ver marcações" size="sm" onClick={() => navigate('/marcacoes')} />
              </div>
            ) : (
              <div className="flex flex-col items-start gap-4 rounded-3xl border border-dashed border-gold/40 bg-white p-7 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-logo text-2xl text-onyx">Ainda sem sessões marcadas</p>
                  <p className="mt-1 font-subtitle text-sm text-muted-dark">Escolhe o estilo, o dia e a hora.</p>
                </div>
                <MotionButton label="Agendar" onClick={() => navigate(bookPath)} />
              </div>
            )}
          </motion.section>

          <motion.section {...reveal(0.2)}>
            <SectionTitle eyebrow="O teu percurso">Histórico</SectionTitle>
            {done.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-gold/40 px-6 py-8 text-center font-subtitle text-sm text-muted-dark">
                As tuas sessões concluídas aparecem aqui.
              </p>
            ) : (
              <ul className="divide-y divide-gold/15 overflow-hidden rounded-3xl border border-gold/20 bg-white shadow-sm shadow-black/5">
                {done.map((b) => {
                  const parts = dayParts(b.slot.startsAt)
                  return (
                    <li key={b.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                      <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-cream leading-none">
                        <span className="font-logo text-lg text-onyx">{parts.day}</span>
                        <span className="mt-0.5 font-subtitle text-[10px] uppercase tracking-wide text-muted-dark">
                          {parts.month}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-subtitle text-base font-medium text-onyx">{b.service.name}</p>
                        <p className="font-subtitle text-xs text-muted-dark">{longDay(b.slot.startsAt)}</p>
                      </div>
                      <span className="hidden font-subtitle text-sm text-onyx sm:block">
                        {formatPrice(b.service.priceCents)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Marcar de novo: ${b.service.name}`}
                        onClick={() => navigate(`${bookPath}?service=${b.serviceId}`)}
                        className="flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-onyx/15 p-2 font-subtitle text-xs font-medium text-onyx transition-colors hover:border-onyx/40 sm:px-3.5 sm:py-1.5"
                      >
                        <i className="bx bx-revision text-base" aria-hidden="true" />
                        <span className="hidden sm:inline">Marcar de novo</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.section>
        </div>

        <motion.aside {...reveal(0.15)} className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
          <div className="relative overflow-hidden rounded-3xl bg-cream p-7">
            <span className="flex size-12 items-center justify-center rounded-full bg-white text-gold-ink shadow-sm">
              <QuoteBubbleFill className="size-6" />
            </span>
            <h3 className="mt-5 font-logo text-2xl text-onyx">Conta como foi</h3>
            <p className="mt-2 font-subtitle text-sm font-light leading-relaxed text-muted-dark">
              Deixa o teu testemunho. Depois de aprovado, aparece na página principal com o teu nome.
            </p>
            <MotionButton label="Escrever testemunho" size="sm" className="mt-6" onClick={() => setTestimonialOpen(true)} />
          </div>

          <nav aria-label="A minha conta" className="rounded-3xl border border-gold/20 bg-white p-2 shadow-sm shadow-black/5">
            <AccountLink Icon={CalendarCheckFill} label="As minhas marcações" onClick={() => navigate('/marcacoes')} />
            <AccountLink Icon={CalendarPlusFill} label="Agendar nova sessão" onClick={() => navigate(bookPath)} />
            <AccountLink Icon={GearFill} label="Definições da conta" onClick={() => navigate('/definicoes')} />
            <div className="mx-4 my-1 border-t border-gold/15" />
            <AccountLink
              Icon={SignOutFill}
              label="Terminar sessão"
              danger
              onClick={() => void logout().then(() => navigate('/'))}
            />
          </nav>
        </motion.aside>
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
