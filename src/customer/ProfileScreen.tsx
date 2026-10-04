import { useEffect, useState } from 'react'
import { ActionButton, actionClasses } from '@/components/ui/action-button'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { TestimonialForm } from '@/pages/AccountPage'
import { api } from '@/lib/api'
import type { Booking } from '@/lib/types'
import { useNavigate } from 'react-router-dom'
import { dayParts } from './dates'
import { useLightStatusBar } from './useLightStatusBar'
import { ApiError } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'
import { disableCustomerPush, enableCustomerPush, pushSupported, pushWanted } from '@/lib/customer-push'
import { instagramDmUrl, siteConfig, useWhatsapp } from '@/lib/site-config'

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/
const APP_VERSION = '1.0'

type SheetId = 'name' | 'phone' | 'password' | 'delete' | 'testimonial' | null

function errorText(err: unknown) {
  return err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.'
}

type Tone = 'gold' | 'rose' | 'sage' | 'sky' | 'plum' | 'ink'

const TONES: Record<Tone, string> = {
  gold: 'bg-onyx/5 text-onyx',
  rose: 'bg-onyx/5 text-onyx',
  sage: 'bg-onyx/5 text-onyx',
  sky: 'bg-onyx/5 text-onyx',
  plum: 'bg-onyx/5 text-onyx',
  ink: 'bg-onyx/5 text-onyx',
}

function Item({
  icon,
  tone = 'gold',
  label,
  value,
  onClick,
  href,
  locked,
}: {
  icon: string
  tone?: Tone
  label: string
  value?: string
  onClick?: () => void
  href?: string
  locked?: boolean
}) {
  const content = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${TONES[tone]}`}>
        <i className={icon} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-subtitle text-[15px] text-onyx">{label}</span>
        {value && <span className="block truncate font-subtitle text-xs text-muted-dark">{value}</span>}
      </span>
      <i
        className={`bx ${locked ? 'bx-lock-alt' : href ? 'bx-link-external' : 'bx-chevron-right'} shrink-0 text-lg text-muted-dark/60`}
        aria-hidden="true"
      />
    </>
  )
  const cls = 'flex w-full items-center gap-3.5 px-4 py-3 transition-colors active:bg-gold-deep/10'
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {content}
      </a>
    )
  if (locked || !onClick) return <div className="flex w-full items-center gap-3.5 px-4 py-3">{content}</div>
  return (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2.5 px-2 font-subtitle text-[11px] font-medium uppercase tracking-[0.18em] text-muted-dark">
        {title}
      </h2>
      <div className="divide-y divide-onyx/10 overflow-hidden rounded-2xl border border-onyx/15 bg-white">
        {children}
      </div>
    </section>
  )
}

/** Notifications row: switches this iPhone's booking notifications on or off. */
function NotificationsRow() {
  const [on, setOn] = useState(pushWanted())
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    setOn(pushWanted())
  }, [])

  async function toggle() {
    setNote(null)
    if (on) {
      setOn(false)
      await disableCustomerPush({ remember: true })
      return
    }
    const result = await enableCustomerPush()
    if (result === 'granted') setOn(true)
    else setNote('Ativa as notificações da AFROGLOW nas Definições do iPhone.')
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3.5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${TONES.rose}`}>
          <i className="bx bx-bell" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-subtitle text-[15px] text-onyx">Notificações</span>
          <span className="block font-subtitle text-xs text-muted-dark">Marcação confirmada e lembrete da sessão</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Notificações"
          onClick={() => void toggle()}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-onyx/20'}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-[#ffffff] shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
          />
        </button>
      </div>
      {note && <p className="mt-2 pl-[54px] font-subtitle text-xs text-red-700">{note}</p>}
    </div>
  )
}

function QuickAction({
  icon,
  label,
  onClick,
  href,
}: {
  icon: string
  label: string
  onClick?: () => void
  href?: string
}) {
  const inner = (
    <>
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-onyx/15 bg-white text-2xl text-onyx">
        <i className={icon} aria-hidden="true" />
      </span>
      <span className="mt-2 font-subtitle text-xs text-onyx">{label}</span>
    </>
  )
  const cls = 'flex flex-1 flex-col items-center'
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

export default function ProfileScreen() {
  useLightStatusBar()
  const whatsapp = useWhatsapp()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[] | null>(null)

  useEffect(() => {
    api
      .get<Booking[]>('/account/bookings')
      .then(setBookings)
      .catch(() => setBookings([]))
  }, [])
  const { customer, updateProfile, changePassword, deleteAccount, logout } = useCustomerAuth()
  const [sheet, setSheet] = useState<SheetId>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteAck, setDeleteAck] = useState(false)

  if (!customer) return <div className="min-h-screen bg-white" />

  const now = Date.now()
  const live = (bookings ?? []).filter(
    (b) => (b.status === 'PENDING' || b.status === 'ACCEPTED') && new Date(b.slot.startsAt).getTime() >= now,
  )
  const nextBooking = [...live].sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))[0]
  const sessions = (bookings ?? []).filter(
    (b) => b.status === 'ACCEPTED' && new Date(b.slot.startsAt).getTime() < now,
  ).length
  const nextParts = nextBooking ? dayParts(nextBooking.slot.startsAt) : null

  function open(next: Exclude<SheetId, null>) {
    setError(null)
    setNotice(null)
    if (next === 'name') setName(customer!.name)
    if (next === 'phone') setPhone(customer!.phone)
    if (next === 'password') {
      setCurrentPassword('')
      setNewPassword('')
    }
    if (next === 'delete') {
      setDeletePassword('')
      setDeleteAck(false)
    }
    setSheet(next)
  }

  async function run(action: () => Promise<void>, done?: string) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setSheet(null)
      if (done) setNotice(done)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const initial = customer.name.trim().charAt(0).toUpperCase() || '?'
  const stats: Array<[string, string]> = [
    ['Sessões feitas', bookings ? String(sessions) : '–'],
    ['Próxima', nextParts ? `${nextParts.day} ${nextParts.month}` : '–'],
    ['Por confirmar', bookings ? String(live.filter((b) => b.status === 'PENDING').length) : '–'],
  ]

  return (
    <main className="pb-40">
      {/* Header: brand gradient, big avatar, name */}
      <header className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-b from-[#1c1c1e] via-[#2c2a26] to-[#7d6a2f] px-6 pb-24 pt-[calc(3rem+env(safe-area-inset-top))] text-center text-[#f5efdf]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-logo text-[26vw] leading-none text-[#ffffff]/[0.06]"
        >
          AFROGLOW
        </span>
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#e0c36e] to-[#a8842f] p-[3px] shadow-xl shadow-black/30">
          <span className="flex h-full w-full items-center justify-center rounded-full bg-[#1c1c1e] font-logo text-5xl text-[#e0c36e]">
            {initial}
          </span>
        </div>
        <h1 className="relative mt-5 truncate font-subtitle font-semibold tracking-tight text-4xl text-[#f5efdf]">
          {customer.name}
        </h1>
        <p className="relative mt-1 truncate font-subtitle text-sm text-[#f5efdf]/70">{customer.email}</p>
        <span className="relative mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#e0c36e]/40 bg-[#ffffff]/10 px-3.5 py-1.5 font-subtitle text-[11px] uppercase tracking-[0.18em] text-[#e0c36e]">
          <i className="bx bx-crown" aria-hidden="true" /> Cliente AFROGLOW
        </span>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        {/* Numbers overlap the header */}
        <div className="relative z-10 -mt-12 grid grid-cols-3 gap-3">
          {stats.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-onyx/15 bg-white px-2 py-4 text-center shadow-lg shadow-black/10"
            >
              <p className="font-subtitle font-semibold tracking-tight text-2xl leading-none text-onyx">{value}</p>
              <p className="mt-2 font-subtitle text-[10px] uppercase tracking-wide text-muted-dark">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 flex">
          <QuickAction icon="bx bx-calendar-plus" label="Marcar" onClick={() => navigate('/marcar')} />
          <QuickAction icon="bx bx-calendar-check" label="Marcações" onClick={() => navigate('/marcacoes')} />
          {whatsapp.enabled && (
            <QuickAction
              icon="bx bxl-whatsapp"
              label="WhatsApp"
              href={whatsapp.url('Olá! Preciso de ajuda com a minha conta AFROGLOW.')}
            />
          )}
          <QuickAction icon="bx bxl-instagram" label="Instagram" href={instagramDmUrl()} />
        </div>

        {notice && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-onyx/15 bg-white p-4">
            <i className="bx bx-check-circle mt-0.5 text-xl text-gold-ink" aria-hidden="true" />
            <p className="flex-1 font-subtitle text-sm text-onyx">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Fechar aviso"
              className="text-lg text-muted-dark"
            >
              <i className="bx bx-x" aria-hidden="true" />
            </button>
          </div>
        )}

        <Section title="Conta">
          <Item icon="bx bx-user" tone="gold" label="Nome" value={customer.name} onClick={() => open('name')} />
          <Item icon="bx bx-phone" tone="sage" label="Telemóvel" value={customer.phone} onClick={() => open('phone')} />
          <Item icon="bx bx-envelope" tone="sky" label="Email" value={customer.email} locked />
          <Item icon="bx bx-key" tone="plum" label="Alterar password" onClick={() => open('password')} />
        </Section>

        {pushSupported() && (
          <Section title="Preferências">
            <NotificationsRow />
          </Section>
        )}

        <button
          type="button"
          onClick={() => open('testimonial')}
          className="mt-7 block w-full rounded-2xl border border-onyx/15 bg-white p-5 text-left"
        >
          <span className="block font-subtitle text-[11px] font-medium uppercase tracking-[0.18em] text-muted-dark">
            Testemunho
          </span>
          <span className="mt-2 block font-subtitle text-xl font-semibold tracking-tight text-onyx">
            Conta como foi
          </span>
          <span className="mt-1 block font-subtitle text-sm font-light text-muted-dark">
            Deixa um testemunho sobre o teu atendimento.
          </span>
          <span className={`${actionClasses()} mt-4`}>
            Escrever testemunho <i className="bx bx-right-arrow-alt text-xl" aria-hidden="true" />
          </span>
        </button>

        <Section title="Ajuda e informação">
          <Item icon="bx bx-envelope" tone="sky" label={siteConfig.email} href={`mailto:${siteConfig.email}`} />
          <Item
            icon="bx bx-shield-quarter"
            tone="sage"
            label="Política de privacidade"
            href="https://www.afroglow.pt/privacidade"
          />
          <Item icon="bx bx-file" tone="ink" label="Termos e condições" href="https://www.afroglow.pt/termos" />
        </Section>

        <ActionButton
          label="Terminar sessão"
          variant="secondary"
          icon="bx bx-log-out"
          className="mt-7"
          onClick={() => void logout()}
        />

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => open('delete')}
            className="font-subtitle text-xs text-red-700/80 underline underline-offset-4"
          >
            Eliminar a minha conta
          </button>
          <p className="mt-4 font-subtitle text-xs text-muted-dark">AFROGLOW · versão {APP_VERSION}</p>
        </div>
      </div>

      <Sheet
        sober
        open={sheet === 'testimonial'}
        icon="bx bx-message-rounded-dots"
        title="O teu testemunho"
        description="Depois de aprovado, aparece na página principal com o teu nome."
        hideSubmit
        submitLabel=""
        onSubmit={() => {}}
        onClose={() => setSheet(null)}
      >
        <TestimonialForm />
      </Sheet>

      {/* Edit name */}
      <Sheet
        sober
        open={sheet === 'name'}
        title="Alterar nome"
        description="É o nome que aparece nas tuas marcações."
        busy={busy}
        error={error}
        submitLabel="Guardar"
        submitDisabled={name.trim().length < 2 || name.trim() === customer.name}
        onSubmit={() => void run(() => updateProfile({ name: name.trim(), phone: customer.phone }), 'Nome atualizado.')}
        onClose={() => setSheet(null)}
      >
        <SheetField label="Nome">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoComplete="name"
            className={sheetFieldClass}
          />
        </SheetField>
      </Sheet>

      {/* Edit phone */}
      <Sheet
        sober
        open={sheet === 'phone'}
        icon="bx bx-phone"
        title="Alterar telemóvel"
        description="Usamos este número para te contactar sobre as marcações."
        busy={busy}
        error={error}
        submitLabel="Guardar"
        submitDisabled={phone.trim().length < 6 || phone.trim() === customer.phone}
        onSubmit={() =>
          void run(() => updateProfile({ name: customer.name, phone: phone.trim() }), 'Telemóvel atualizado.')
        }
        onClose={() => setSheet(null)}
      >
        <SheetField label="Telemóvel">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
            autoComplete="tel"
            className={sheetFieldClass}
          />
        </SheetField>
      </Sheet>

      {/* Change password */}
      <Sheet
        sober
        open={sheet === 'password'}
        icon="bx bx-key"
        title="Alterar password"
        busy={busy}
        error={error}
        submitLabel="Guardar"
        submitDisabled={currentPassword.length < 1 || !PASSWORD_RULE.test(newPassword)}
        onSubmit={() => void run(() => changePassword(currentPassword, newPassword), 'Password alterada.')}
        onClose={() => setSheet(null)}
      >
        <SheetField label="Password atual">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className={sheetFieldClass}
          />
        </SheetField>
        <SheetField label="Password nova">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            className={sheetFieldClass}
          />
          {newPassword.length > 0 && !PASSWORD_RULE.test(newPassword) && (
            <span className="mt-1.5 block font-subtitle text-xs text-muted-dark">
              Pelo menos 8 caracteres, 1 maiúscula, 1 número e 1 caractere especial.
            </span>
          )}
        </SheetField>
      </Sheet>

      {/* Delete account */}
      <Sheet
        sober
        open={sheet === 'delete'}
        icon="bx bx-trash"
        destructive
        title="Eliminar conta"
        description="Esta ação é permanente e não pode ser desfeita."
        busy={busy}
        error={error}
        submitLabel="Eliminar a minha conta"
        submitDisabled={deletePassword.length < 1 || !deleteAck}
        onSubmit={() => void run(() => deleteAccount(deletePassword))}
        onClose={() => setSheet(null)}
      >
        <ul className="flex flex-col gap-2 rounded-xl bg-red-700/5 p-4 font-subtitle text-sm text-onyx">
          <li className="flex gap-2">
            <i className="bx bx-x-circle mt-0.5 text-red-700" aria-hidden="true" />
            As tuas marcações futuras são canceladas.
          </li>
          <li className="flex gap-2">
            <i className="bx bx-x-circle mt-0.5 text-red-700" aria-hidden="true" />O teu nome, telemóvel e notas são
            removidos, bem como os teus testemunhos.
          </li>
          <li className="flex gap-2">
            <i className="bx bx-x-circle mt-0.5 text-red-700" aria-hidden="true" />
            Deixas de poder entrar com este email. Podes criar uma conta nova quando quiseres.
          </li>
        </ul>
        <SheetField label="Confirma com a tua password">
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            autoComplete="current-password"
            className={sheetFieldClass}
          />
        </SheetField>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={deleteAck}
            onChange={(e) => setDeleteAck(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-red-700"
          />
          <span className="font-subtitle text-sm text-onyx">Compreendo que não pode ser desfeito.</span>
        </label>
      </Sheet>
    </main>
  )
}
