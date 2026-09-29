import { useEffect, useRef, useState } from 'react'
import { MotionButton } from '@/components/ui/motion-button'
import { ApiError } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'

const inputClasses =
  'rounded-xl border border-gold/30 bg-white px-4 py-3 font-subtitle text-onyx outline-none transition-colors duration-300 focus-visible:border-gold-deep'

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">{label}</span>
      <input className={inputClasses} {...props} />
    </label>
  )
}

const RESEND_COOLDOWN_SECONDS = 60

export function AccountAuthForm({ onSuccess }: { onSuccess?: () => void }) {
  const { login, startRegistration, verifyEmail, resendCode } = useCustomerAuth()
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (resendCooldown <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1))
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [resendCooldown])

  const passwordValid = PASSWORD_RULE.test(password)

  const canSubmit =
    mode === 'login'
      ? email.trim().length > 3 && password.length >= 1
      : mode === 'register'
        ? email.trim().length > 3 &&
          name.trim().length >= 2 &&
          phone.trim().length >= 6 &&
          passwordValid &&
          confirmPassword === password
        : /^\d{6}$/.test(code)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
        onSuccess?.()
      } else if (mode === 'register') {
        await startRegistration({ name: name.trim(), email: email.trim(), phone: phone.trim(), password })
        setMode('verify')
        setResendCooldown(RESEND_COOLDOWN_SECONDS)
      } else {
        await verifyEmail(email.trim(), code)
        onSuccess?.()
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await resendCode(email.trim())
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'verify') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="font-subtitle text-lg text-onyx">Confirma o teu email</h2>
          <p className="mt-1 text-sm text-muted-dark">
            Enviámos um código de 6 dígitos para <strong>{email}</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            label="Código de verificação"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
          />

          {error && <p className="font-subtitle text-sm text-red-700">{error}</p>}

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <MotionButton
              label={submitting ? 'A verificar...' : 'Confirmar'}
              disabled={!canSubmit || submitting}
              type="submit"
            />
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || submitting}
              className="font-subtitle text-sm text-gold-deep underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-onyx/40 disabled:no-underline"
            >
              {resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : 'Reenviar código'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 rounded-full border border-gold/20 bg-cream p-1">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex flex-1 items-center justify-center rounded-full py-2 font-subtitle text-sm transition-colors duration-300 ${
            mode === 'login' ? 'bg-gold-deep text-cream' : 'text-onyx/60 hover:text-onyx'
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex flex-1 items-center justify-center rounded-full py-2 font-subtitle text-sm transition-colors duration-300 ${
            mode === 'register' ? 'bg-gold-deep text-cream' : 'text-onyx/60 hover:text-onyx'
          }`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === 'register' && (
          <>
            <Field label="Nome" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="O teu nome" />
            <Field
              label="Telemóvel"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="912 345 678"
            />
          </>
        )}
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : 'A tua password'}
        />
        {mode === 'register' && password.length > 0 && !passwordValid && (
          <p className="-mt-2 font-subtitle text-xs text-muted-dark">
            A password precisa de pelo menos 8 caracteres, 1 maiúscula, 1 número e 1 caractere especial.
          </p>
        )}
        {mode === 'register' && (
          <Field
            label="Confirmar password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repete a password"
          />
        )}
        {mode === 'register' && confirmPassword.length > 0 && confirmPassword !== password && (
          <p className="-mt-2 font-subtitle text-xs text-red-700">As passwords não coincidem.</p>
        )}

        {error && <p className="font-subtitle text-sm text-red-700">{error}</p>}

        <div className="flex justify-center sm:justify-start">
          <MotionButton
            label={submitting ? 'A processar...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            disabled={!canSubmit || submitting}
            type="submit"
          />
        </div>
      </form>
    </div>
  )
}
