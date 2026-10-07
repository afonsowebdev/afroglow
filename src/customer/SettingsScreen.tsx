import { useEffect, useState } from 'react'
import { ActionButton } from '@/components/ui/action-button'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { useNavigate } from 'react-router-dom'
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
      <i className={`${icon} w-6 shrink-0 text-center text-[22px] text-muted-dark`} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-left font-subtitle text-[15px] text-onyx">{label}</span>
      {value && <span className="max-w-[45%] truncate font-subtitle text-sm text-muted-dark">{value}</span>}
      <i
        className={`bx ${locked ? 'bx-lock-alt' : href ? 'bx-link-external' : 'bx-chevron-right'} shrink-0 text-lg text-muted-dark/50`}
        aria-hidden="true"
      />
    </>
  )
  const cls = 'flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-onyx/5'
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {content}
      </a>
    )
  if (locked || !onClick) return <div className="flex w-full items-center gap-3.5 px-4 py-3.5">{content}</div>
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
      <div className="divide-y divide-onyx/10 overflow-hidden rounded-2xl border-[1.5px] border-onyx/20 bg-white">
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
        <i className="bx bx-bell-plus w-6 shrink-0 text-center text-[22px] text-muted-dark" aria-hidden="true" />
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
      <header className="px-5 pb-1 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            aria-label="Voltar ao perfil"
            onClick={() => navigate('/conta')}
            className="glass-chip flex h-10 w-10 items-center justify-center rounded-full text-xl text-onyx"
          >
            <i className="bx bx-chevron-left" aria-hidden="true" />
          </button>
          <h1 className="mt-5 font-subtitle text-[32px] font-semibold leading-none tracking-tight text-onyx">
            Definições
          </h1>
          <p className="mt-2 font-subtitle text-sm font-light text-muted-dark">A tua conta e as preferências da app.</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        {notice && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border-[1.5px] border-onyx/25 bg-white p-4">
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

        <div className="mt-6 flex items-center gap-4 rounded-2xl border-[1.5px] border-onyx/20 bg-white p-4">
          {photo ? (
            <img src={photo} alt="" className="size-14 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-onyx/5 font-logo text-3xl text-gold-ink">
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
          <p className="mt-4 font-subtitle text-xs text-muted-dark">
            AFROGLOW · versão {__APP_VERSION__}
            <br />
            build {__APP_BUILD__} · {__APP_COMMIT__}
          </p>
        </div>
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
