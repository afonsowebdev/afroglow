import { useEffect, useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { ActionButton } from '@/components/ui/action-button'
import { ForgotPasswordSheet } from '@/components/ui/forgot-password-sheet'
import { Group, PasswordInput } from '@/components/ui/grouped-fields'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

/** How strong a new password looks, 0 – 4, from its length and the kinds of characters in it. */
function strength(password: string) {
  if (password.length < 8) return 0
  let score = 1
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return score
}
const STRENGTH = ['Curta demais', 'Fraca', 'Razoável', 'Boa', 'Forte']

const label = 'mb-2 px-1 font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark'

/**
 * The admin's account and security, in the app's grouped lists: who is signed in, the password change (current, new,
 * repeat; the iPhone's password autofill; a strength bar and the rule), a way in if the current one is forgotten, and
 * signing out of this device.
 */
export function SecurityView({ onLogout }: { onLogout: () => void }) {
  const [email, setEmail] = useState<string | null>(null)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)

  useEffect(() => {
    api
      .get<{ email: string }>('/auth/me')
      .then((me) => setEmail(me.email))
      .catch(() => {})
  }, [])

  const score = strength(next)
  const mismatch = confirm.length > 0 && next !== confirm
  const sameAsCurrent = next.length > 0 && next === current
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm && !sameAsCurrent

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || busy) return
    setBusy(true)
    setMessage(null)
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next })
      setCurrent('')
      setNext('')
      setConfirm('')
      setMessage({ ok: true, text: 'Password alterada. Usa a nova da próxima vez que entrares.' })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      {/* Who is signed in. */}
      <section>
        <h2 className={label}>Conta</h2>
        <div className="flex items-center gap-4 rounded-2xl bg-onyx/[0.04] p-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-onyx text-xl text-white">
            <i className="bx bx-shield-quarter" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block font-subtitle text-xs text-muted-dark">Sessão iniciada como</span>
            <span className="block truncate font-subtitle text-base font-semibold text-onyx">{email ?? '…'}</span>
          </span>
        </div>
      </section>

      {/* The password change. */}
      <form onSubmit={submit}>
        <h2 className={label}>Alterar password</h2>
        {/* The account's email for the iPhone's password manager, so it saves the new one against it. */}
        <input type="email" autoComplete="username" value={email ?? ''} readOnly hidden />
        <Group>
          <PasswordInput
            aria-label="Password atual"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Password atual"
          />
        </Group>
        <div className="mt-3">
          <Group>
            <PasswordInput
              aria-label="Nova password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Nova password"
            />
            <PasswordInput
              aria-label="Repetir nova password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repetir nova password"
            />
          </Group>
        </div>

        {/* How strong the new one is, and the rule. */}
        <div className="mt-3 px-1">
          <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={cn(
                  'h-1.5 rounded-full transition-colors duration-300',
                  next.length > 0 && score >= step ? 'bg-onyx' : 'bg-onyx/10',
                )}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 font-subtitle text-xs">
            <span className={cn('flex items-center gap-1.5', next.length >= 8 ? 'text-onyx' : 'text-muted-dark')}>
              <Check className={cn('size-3.5', next.length >= 8 ? 'opacity-100' : 'opacity-30')} strokeWidth={2.5} />
              Pelo menos 8 caracteres
            </span>
            {next.length > 0 && <span className="font-medium text-onyx">{STRENGTH[score]}</span>}
          </div>
          {mismatch && <p className="mt-2 font-subtitle text-xs text-red-700">As passwords não coincidem.</p>}
          {sameAsCurrent && (
            <p className="mt-2 font-subtitle text-xs text-red-700">A nova password tem de ser diferente da atual.</p>
          )}
        </div>

        {message && (
          <p
            role={message.ok ? 'status' : 'alert'}
            className={cn('mt-4 px-1 font-subtitle text-sm', message.ok ? 'text-onyx' : 'text-red-700')}
          >
            {message.text}
          </p>
        )}

        <div className="mt-5 flex flex-col items-center gap-3">
          <ActionButton
            type="submit"
            disabled={!canSubmit || busy}
            label={busy ? 'A guardar...' : 'Alterar password'}
          />
          <button type="button" onClick={() => setForgotOpen(true)} className="font-subtitle text-sm text-onyx/60">
            Não sabes a password atual?
          </button>
        </div>
      </form>

      {/* Leaving this device. */}
      <section>
        <h2 className={label}>Este aparelho</h2>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3.5 rounded-2xl bg-onyx/[0.04] px-4 py-3.5 text-left font-subtitle text-[15px] text-red-700 active:bg-onyx/[0.07] dark:text-red-400"
        >
          <i className="bx bx-log-out text-xl" aria-hidden="true" />
          Terminar sessão
        </button>
        <p className="mt-2 px-1 font-subtitle text-xs text-muted-dark">
          Para voltar a entrar precisas do email e da password.
        </p>
      </section>

      <ForgotPasswordSheet admin open={forgotOpen} initialEmail={email ?? ''} onClose={() => setForgotOpen(false)} />
    </div>
  )
}
