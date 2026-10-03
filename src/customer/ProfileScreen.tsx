import { useState } from 'react'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { TestimonialForm } from '@/pages/AccountPage'
import { ApiError } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'
import { instagramDmUrl, siteConfig, whatsappUrl } from '@/lib/site-config'

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/
const APP_VERSION = '1.0'

type SheetId = 'name' | 'phone' | 'password' | 'delete' | null

function errorText(err: unknown) {
  return err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.'
}

function Row({
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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-deep/10 text-lg text-gold-deep">
        <i className={icon} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-subtitle text-sm text-onyx">{label}</span>
        {value && <span className="block truncate font-subtitle text-xs text-muted-dark">{value}</span>}
      </span>
      <i
        className={`bx ${locked ? 'bx-lock-alt' : 'bx-chevron-right'} shrink-0 text-xl text-muted-dark/70`}
        aria-hidden="true"
      />
    </>
  )
  const cls = 'flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gold-deep/5'
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {content}
      </a>
    )
  }
  if (locked || !onClick) return <div className={cls.replace('hover:bg-gold-deep/5', '')}>{content}</div>
  return (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 px-1 font-subtitle text-xs uppercase tracking-wide text-muted-dark">{title}</h2>
      <div className="divide-y divide-gold/15 overflow-hidden rounded-2xl border border-gold/20 bg-white shadow-sm shadow-black/5">
        {children}
      </div>
    </section>
  )
}

export default function ProfileScreen() {
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

  const initial = customer.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <main className="mx-auto max-w-2xl px-5 pb-40 pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gold-deep font-logo text-3xl text-[#ffffff]">
          {initial}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-logo text-3xl text-onyx">{customer.name}</h1>
          <p className="truncate font-subtitle text-sm text-muted-dark">{customer.email}</p>
        </div>
      </div>

      {notice && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-gold/20 bg-white p-4 shadow-sm shadow-black/5">
          <i className="bx bx-check-circle mt-0.5 text-xl text-gold-deep" aria-hidden="true" />
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

      <Group title="Os meus dados">
        <Row icon="bx bx-user" label="Nome" value={customer.name} onClick={() => open('name')} />
        <Row icon="bx bx-phone" label="Telemóvel" value={customer.phone} onClick={() => open('phone')} />
        <Row icon="bx bx-envelope" label="Email" value={customer.email} locked />
      </Group>

      <Group title="Segurança">
        <Row icon="bx bx-key" label="Alterar password" onClick={() => open('password')} />
      </Group>

      <section className="mt-8">
        <h2 className="mb-2 px-1 font-subtitle text-xs uppercase tracking-wide text-muted-dark">
          Deixar um testemunho
        </h2>
        <div className="rounded-2xl border border-gold/20 bg-white p-4 shadow-sm shadow-black/5">
          <p className="mb-4 font-subtitle text-sm font-light text-muted-dark">
            Conta como foi o teu atendimento. Depois de aprovado, aparece na página principal com o teu nome.
          </p>
          <TestimonialForm />
        </div>
      </section>

      <Group title="Ajuda e informação">
        <Row
          icon="bx bxl-whatsapp"
          label="Falar connosco no WhatsApp"
          href={whatsappUrl('Olá! Preciso de ajuda com a minha conta AFROGLOW.')}
        />
        <Row icon="bx bxl-instagram" label={`Instagram @${siteConfig.instagramHandle}`} href={instagramDmUrl()} />
        <Row icon="bx bx-shield-quarter" label="Política de privacidade" href="https://www.afroglow.pt/privacidade" />
      </Group>

      <button
        type="button"
        onClick={() => void logout()}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/30 bg-white py-3.5 font-subtitle text-sm text-onyx transition-colors hover:border-gold-deep"
      >
        <i className="bx bx-log-out text-lg" aria-hidden="true" />
        Terminar sessão
      </button>

      <div className="mt-12">
        <p className="mb-2 px-1 font-subtitle text-xs uppercase tracking-wide text-muted-dark">Zona de perigo</p>
        <button
          type="button"
          onClick={() => open('delete')}
          className="flex w-full items-center gap-3 rounded-2xl border border-red-700/20 bg-red-700/5 p-4 text-left transition-colors hover:bg-red-700/10"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-700/10 text-lg text-red-700">
            <i className="bx bx-trash" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-subtitle text-sm font-semibold text-red-700">Eliminar conta</span>
            <span className="block font-subtitle text-xs text-muted-dark">Apaga os teus dados de forma permanente</span>
          </span>
          <i className="bx bx-chevron-right text-xl text-red-700/70" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-10 text-center font-subtitle text-xs text-muted-dark">AFROGLOW · versão {APP_VERSION}</p>

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
