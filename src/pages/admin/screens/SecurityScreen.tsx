import { useState } from 'react'
import { ForgotPasswordSheet } from '@/components/ui/forgot-password-sheet'
import { PasswordInput } from '@/components/ui/grouped-fields'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAdmin } from '../admin-context'
import { BarButton, Cell, Screen, Section, useToast } from '../ios'

/** How strong a new password looks, 0 – 4. */
function strength(password: string) {
  if (password.length < 8) return 0
  let score = 1
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return score
}
const STRENGTH = ['Curta demais', 'Fraca', 'Razoável', 'Boa', 'Forte']
const STRENGTH_COLOR = ['var(--ios-red)', 'var(--ios-red)', 'var(--ios-orange)', 'var(--ios-green)', 'var(--ios-green)']

/** The password change (with the iPhone's autofill), a way in if the current one is forgotten. */
export function SecurityScreen({ backLabel }: { backLabel: string }) {
  const { me, pop } = useAdmin()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)

  const score = strength(next)
  const mismatch = confirm.length > 0 && next !== confirm
  const same = next.length > 0 && next === current
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm && !same

  async function submit() {
    if (!canSubmit || busy) return
    setBusy(true)
    setError(null)
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next })
      setCurrent('')
      setNext('')
      setConfirm('')
      toast('Password alterada')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen
      title="Segurança"
      back={{ label: backLabel, onClick: pop }}
      trailing={<BarButton label={busy ? 'A guardar…' : 'Alterar'} bold disabled={!canSubmit || busy} onClick={() => void submit()} />}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {/* The account's email for the iPhone's password manager. */}
        <input type="email" autoComplete="username" value={me.email} readOnly hidden />
        <Section header="Password atual">
          <div className="ios-cell-body"><PasswordInput aria-label="Password atual" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Password atual" /></div>
        </Section>
        <Section
          header="Nova password"
          footer={
            <span className="flex flex-col gap-1">
              {next.length > 0 && (
                <span className="flex items-center gap-2">
                  <span className="flex h-1.5 w-24 gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <span
                        key={step}
                        className="flex-1 rounded-full"
                        style={{ background: score >= step ? STRENGTH_COLOR[score] : 'var(--ios-fill-strong)' }}
                      />
                    ))}
                  </span>
                  {STRENGTH[score]}
                </span>
              )}
              <span className={cn(mismatch || same ? 'text-[var(--ios-red)]' : undefined)}>
                {mismatch
                  ? 'As passwords não coincidem.'
                  : same
                    ? 'A nova password tem de ser diferente da atual.'
                    : 'Pelo menos 8 caracteres. Mistura letras, números e símbolos.'}
              </span>
            </span>
          }
        >
          <div className="ios-cell-body"><PasswordInput aria-label="Nova password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nova password" /></div>
          <div className="ios-cell-body"><PasswordInput aria-label="Repetir nova password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repetir" /></div>
        </Section>
        {error && <p className="mx-8 mt-3 text-[15px] text-[var(--ios-red)]">{error}</p>}
        <button type="submit" hidden />
      </form>

      <Section footer="Enviamos um código para o teu email para definires uma nova.">
        <Cell title="Não sabes a password atual?" tinted onClick={() => setForgotOpen(true)} />
      </Section>

      <ForgotPasswordSheet admin open={forgotOpen} initialEmail={me.email} onClose={() => setForgotOpen(false)} />
    </Screen>
  )
}
