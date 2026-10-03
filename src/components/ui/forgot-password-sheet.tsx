import { useState } from 'react'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { ApiError } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/

/** "Esqueci-me da password": email → code from the email + new password → done. */
export function ForgotPasswordSheet({
  open,
  initialEmail = '',
  onClose,
}: {
  open: boolean
  initialEmail?: string
  onClose: () => void
}) {
  const { forgotPassword, resetPassword } = useCustomerAuth()
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email')
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    onClose()
    // Reset once the closing animation is under way.
    window.setTimeout(() => {
      setStep('email')
      setCode('')
      setPassword('')
      setError(null)
    }, 300)
  }

  async function run(action: () => Promise<void>, next: 'reset' | 'done') {
    setBusy(true)
    setError(null)
    try {
      await action()
      setStep(next)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.')
    } finally {
      setBusy(false)
    }
  }

  const passwordValid = PASSWORD_RULE.test(password)

  return (
    <Sheet
      open={open}
      icon="bx bx-key"
      title={step === 'done' ? 'Password alterada' : 'Recuperar password'}
      description={
        step === 'email'
          ? 'Enviamos um código de 6 dígitos para o teu email.'
          : step === 'reset'
            ? `Escreve o código que enviámos para ${email} e escolhe uma password nova.`
            : 'Já podes entrar com a tua password nova.'
      }
      busy={busy}
      error={error}
      hideSubmit={step === 'done'}
      submitLabel={step === 'email' ? 'Enviar código' : 'Guardar password'}
      submitDisabled={step === 'email' ? email.trim().length < 4 : !/^\d{6}$/.test(code) || !passwordValid}
      onSubmit={() =>
        step === 'email'
          ? void run(() => forgotPassword(email.trim()), 'reset')
          : void run(() => resetPassword(email.trim(), code, password), 'done')
      }
      onClose={close}
    >
      {step === 'email' && (
        <SheetField label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            className={sheetFieldClass}
          />
        </SheetField>
      )}

      {step === 'reset' && (
        <>
          <SheetField label="Código">
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              className={sheetFieldClass}
            />
          </SheetField>
          <SheetField label="Password nova">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className={sheetFieldClass}
            />
            {password.length > 0 && !passwordValid && (
              <span className="mt-1.5 block font-subtitle text-xs text-muted-dark">
                Pelo menos 8 caracteres, 1 maiúscula, 1 número e 1 caractere especial.
              </span>
            )}
          </SheetField>
          <button
            type="button"
            onClick={() => void run(() => forgotPassword(email.trim()), 'reset')}
            disabled={busy}
            className="self-start font-subtitle text-sm text-gold-deep underline-offset-4 hover:underline disabled:opacity-50"
          >
            Reenviar código
          </button>
        </>
      )}
    </Sheet>
  )
}
