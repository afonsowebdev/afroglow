import { useEffect, useState } from 'react'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { useNavigate } from 'react-router-dom'
import { useBackButton, useHideNav } from './nav-visibility'
import { api, ApiError } from '@/lib/api'
import { useAvatar } from '@/lib/avatar-store'
import { useCustomerAuth } from '@/lib/customer-auth'
import { disableCustomerPush, enableCustomerPush, pushSupported, pushWanted } from '@/lib/customer-push'
import { siteConfig } from '@/lib/site-config'

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/

type SheetId = 'name' | 'phone' | 'password' | 'delete' | null

function errorText(err: unknown) {
  return err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.'
}

function Item({
  icon,
  label,
  value,
  onClick,
  href,
  locked,
}: {
  icon: string
  label: string
  value?: string
  onClick?: () => void
  href?: string
  locked?: boolean
}) {
  const content = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-onyx text-[18px] text-white">
        <i className={icon} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate text-left font-subtitle text-[15px] text-onyx">{label}</span>
      {value && <span className="max-w-[45%] truncate font-subtitle text-sm text-muted-dark">{value}</span>}
      <i
        className={`bx ${locked ? 'bx-lock-alt' : href ? 'bx-link-external' : 'bx-chevron-right'} shrink-0 text-lg text-muted-dark/50`}
        aria-hidden="true"
      />
    </>
  )
  const cls = 'flex w-full items-center gap-3.5 px-4 py-3 transition-colors active:bg-onyx/5'
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
    <section className="mt-8">
      <h2 className="mb-2 px-1 font-subtitle text-[11px] font-medium uppercase tracking-[0.18em] text-muted-dark">
        {title}
      </h2>
      <div className="divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]">
        {children}
      </div>
    </section>
  )
}

/** Where the reminder 48 hours before a session is sent besides the app notification: email or a text message. */
function ReminderRow({ phone, email }: { phone: string; email: string }) {
  const [channel, setChannel] = useState<'EMAIL' | 'PHONE' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ reminderChannel?: 'EMAIL' | 'PHONE' }>('/account/me')
      .then((me) => setChannel(me.reminderChannel ?? 'EMAIL'))
      .catch(() => setChannel('EMAIL'))
  }, [])

  async function choose(next: 'EMAIL' | 'PHONE') {
    if (next === channel) return
    const before = channel
    setChannel(next)
    setError(null)
    try {
      await api.patch('/account/reminder-channel', { channel: next })
    } catch {
      setChannel(before)
      setError('Não foi possível guardar. Tenta novamente.')
    }
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-onyx text-[18px] text-white">
          <i className="bx bx-bell-plus" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-subtitle text-[15px] text-onyx">Lembrete da sessão</span>
          <span className="block font-subtitle text-xs text-muted-dark">Enviado 48 horas antes</span>
        </span>
      </div>
      <div className="glass-chip mt-3 flex rounded-full p-1" role="tablist" aria-label="Lembrete da sessão">
        {(
          [
            ['EMAIL', 'Email'],
            ['PHONE', 'Telemóvel'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={channel === id}
            disabled={channel === null}
            onClick={() => void choose(id)}
            className={`flex-1 rounded-full py-2.5 font-subtitle text-sm text-onyx ${
              channel === id ? 'glass-chip-on font-semibold' : 'opacity-70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 font-subtitle text-xs text-muted-dark">
        {channel === 'PHONE' ? `Uma mensagem para ${phone}.` : `Um email para ${email}.`} Recebes sempre a notificação
        da app.
      </p>
      {error && <p className="mt-1 font-subtitle text-xs text-red-700">{error}</p>}
    </div>
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
        <i className="bx bx-bell w-6 shrink-0 text-center text-[22px] text-muted-dark" aria-hidden="true" />
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
          className={`relative h-7 w-12 shrink-0 rounded-full ${on ? 'glass-chip-on' : 'glass-chip'}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full shadow transition-all ${on ? 'left-[22px] bg-onyx' : 'left-0.5 bg-onyx/40'}`}
          />
        </button>
      </div>
      {note && <p className="mt-2 pl-[54px] font-subtitle text-xs text-red-700">{note}</p>}
    </div>
  )
}

export default function SettingsScreen() {
  const navigate = useNavigate()
  // Back to the account, from the top row (in place of the "A").
  useBackButton(true, () => navigate('/conta'))
  // A page reached from the account, not a tab: no tab bar, the way back is the button at the top.
  useHideNav(true)
  const photo = useAvatar()
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

  return (
    <main className="pb-40">
      <header className="px-5 pb-1 pt-[calc(4.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-subtitle text-[32px] font-semibold leading-none tracking-tight text-onyx">Definições</h1>
          <p className="mt-2 font-subtitle text-sm font-light text-muted-dark">A tua conta e as preferências da app.</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        {notice && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-onyx/10 shadow-sm shadow-black/5 bg-white p-4">
            <i className="bx bx-check-circle mt-0.5 text-xl text-onyx" aria-hidden="true" />
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

        <div className="mt-6 flex items-center gap-4 rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))] p-4">
          {photo ? (
            <img src={photo} alt="" className="size-14 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-onyx/5 font-logo text-3xl text-onyx">
              {customer.name.trim().charAt(0).toUpperCase() || '?'}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-subtitle text-lg font-semibold tracking-tight text-onyx">
              {customer.name}
            </span>
            <span className="block truncate font-subtitle text-sm text-muted-dark">{customer.email}</span>
          </span>
        </div>

        <Section title="Conta">
          <Item icon="bx bx-user" label="Nome" value={customer.name} onClick={() => open('name')} />
          <Item icon="bx bx-phone" label="Telemóvel" value={customer.phone} onClick={() => open('phone')} />
          <Item icon="bx bx-envelope" label="Email" value={customer.email} locked />
          <Item icon="bx bx-key" label="Alterar password" onClick={() => open('password')} />
        </Section>

        <Section title="Preferências">
          {pushSupported() && <NotificationsRow />}
          <ReminderRow phone={customer.phone} email={customer.email} />
        </Section>

        <Section title="Ajuda e informação">
          <Item icon="bx bx-envelope" label={siteConfig.email} href={`mailto:${siteConfig.email}`} />
          <Item
            icon="bx bx-shield-quarter"

            label="Política de privacidade"
            href="https://www.afroglow.pt/privacidade"
          />
          <Item icon="bx bx-file" label="Termos e condições" href="https://www.afroglow.pt/termos" />
        </Section>

        <section className="mt-8">
          <div className="overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]">
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center gap-3.5 px-4 py-3 active:bg-onyx/5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-onyx/10 text-[18px] text-onyx">
                <i className="bx bx-log-out" aria-hidden="true" />
              </span>
              <span className="flex-1 text-left font-subtitle text-[15px] text-onyx">Terminar sessão</span>
            </button>
          </div>
        </section>

        {/* Deleting the account: on its own, plainly marked in red. */}
        <section className="mt-8">
          <h2 className="mb-2 px-1 font-subtitle text-[11px] font-medium uppercase tracking-[0.18em] text-red-700 dark:text-red-400">
            Zona de perigo
          </h2>
          <button
            type="button"
            onClick={() => open('delete')}
            className="flex w-full items-center gap-3.5 rounded-2xl bg-red-600/[0.07] px-4 py-3.5 text-left ring-1 ring-inset ring-red-600/20 active:bg-red-600/[0.12]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-red-600 text-[19px] text-[#ffffff]">
              <i className="bx bx-trash" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-subtitle text-[15px] font-semibold text-red-700 dark:text-red-400">
                Eliminar a minha conta
              </span>
              <span className="block font-subtitle text-xs text-muted-dark">Apaga a conta e os teus dados de vez</span>
            </span>
            <i className="bx bx-chevron-right text-xl text-red-700/50 dark:text-red-400/60" aria-hidden="true" />
          </button>
        </section>

        <p className="mt-8 text-center font-subtitle text-xs text-muted-dark">
          AFROGLOW · versão {__APP_VERSION__}
          <br />
          build {__APP_BUILD__} · {__APP_COMMIT__}
        </p>
      </div>

      {/* Edit name */}
      <Sheet
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
        open={sheet === 'delete'}
        icon="bx bxs-trash"
        destructive
        title="Eliminar conta"
        description="É permanente: não há forma de recuperar a conta."
        busy={busy}
        error={error}
        submitLabel="Eliminar conta"
        submitDisabled={deletePassword.length < 1 || !deleteAck}
        onSubmit={() => void run(() => deleteAccount(deletePassword))}
        onClose={() => setSheet(null)}
      >
        {/* What goes, as a short list. */}
        <div className="overflow-hidden rounded-2xl bg-red-600/[0.06] ring-1 ring-inset ring-red-600/15">
          <p className="px-4 pb-1 pt-3 font-subtitle text-[11px] font-semibold uppercase tracking-[0.14em] text-red-700 dark:text-red-400">
            O que acontece
          </p>
          <ul className="divide-y divide-red-600/10 font-subtitle text-sm text-onyx">
            {[
              ['bx bx-calendar-x', 'As tuas marcações futuras são canceladas.'],
              ['bx bx-user-x', 'O teu nome, telemóvel, favoritas e testemunhos são apagados.'],
              ['bx bx-log-out', 'Deixas de entrar com este email (podes criar uma conta nova quando quiseres).'],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-start gap-3 px-4 py-2.5">
                <i className={`${icon} mt-0.5 text-lg text-red-600`} aria-hidden="true" />
                <span className="leading-snug">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <SheetField label="Confirma com a tua password">
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            autoComplete="current-password"
            placeholder="A tua password"
            className={sheetFieldClass}
          />
        </SheetField>
        {/* The acknowledgement as an iPhone switch. */}
        <button
          type="button"
          role="switch"
          aria-checked={deleteAck}
          onClick={() => setDeleteAck(!deleteAck)}
          className="flex items-center justify-between gap-4 rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))] px-4 py-3 text-left"
        >
          <span className="font-subtitle text-sm text-onyx">Compreendo que não pode ser desfeito</span>
          <span
            className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${
              deleteAck ? 'bg-red-600' : 'bg-onyx/15'
            }`}
          >
            <span
              className={`absolute top-[2px] size-[27px] rounded-full bg-[#ffffff] shadow transition-transform duration-200 ${
                deleteAck ? 'translate-x-[22px]' : 'translate-x-[2px]'
              }`}
            />
          </span>
        </button>
      </Sheet>
    </main>
  )
}
