import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MotionButton } from '@/components/ui/motion-button'
import { ApiError } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'

const inputClasses =
  'rounded-xl border border-gold/30 bg-white px-4 py-3 font-subtitle text-onyx outline-none transition-colors duration-300 focus-visible:border-gold-deep'

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">{label}</span>
      <input className={inputClasses} {...props} />
    </label>
  )
}

const EASE = [0.22, 1, 0.36, 1] as const

// Mounts/unmounts with a smooth height + fade so the form reflows instead of jumping.
function Collapse({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="overflow-hidden"
    >
      <div className="pb-4">{children}</div>
    </motion.div>
  )
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      role="alert"
      initial={{ opacity: 0, y: -6, x: 0 }}
      animate={{ opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="font-subtitle text-sm text-red-700"
    >
      {children}
    </motion.p>
  )
}

function PasswordField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">{label}</span>
      <span className="relative">
        <input className={`${inputClasses} w-full pr-12`} type={visible ? 'text' : 'password'} {...props} />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Esconder password' : 'Mostrar password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-onyx/40 transition-colors duration-300 hover:text-gold-deep"
        >
          <i className={`bx ${visible ? 'bx-hide' : 'bx-show'} text-xl`} aria-hidden="true" />
        </button>
      </span>
    </label>
  )
}

function PasswordChecklist({ password }: { password: string }) {
  const rules = [
    { ok: password.length >= 8, text: '8+ caracteres' },
    { ok: /[A-Z]/.test(password), text: '1 maiúscula' },
    { ok: /[0-9]/.test(password), text: '1 número' },
    { ok: /[^A-Za-z0-9]/.test(password), text: '1 especial' },
  ]
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {rules.map((r) => (
        <li
          key={r.text}
          className={`flex items-center gap-1 font-subtitle text-xs transition-colors duration-300 ${
            r.ok ? 'text-gold-deep' : 'text-muted-dark'
          }`}
        >
          <i className={`bx ${r.ok ? 'bxs-check-circle' : 'bx-circle'} text-sm`} aria-hidden="true" />
          {r.text}
        </li>
      ))}
    </ul>
  )
}

const RESEND_COOLDOWN_SECONDS = 60

export type AuthMode = 'login' | 'register' | 'verify'

export function AccountAuthForm({
  onSuccess,
  mode: controlledMode,
  onModeChange,
  hideTabs = false,
}: {
  onSuccess?: () => void
  mode?: AuthMode
  onModeChange?: (mode: AuthMode) => void
  hideTabs?: boolean
}) {
  const { login, startRegistration, verifyEmail, resendCode } = useCustomerAuth()
  const [innerMode, setInnerMode] = useState<AuthMode>('login')
  const mode = controlledMode ?? innerMode
  function setMode(next: AuthMode) {
    setInnerMode(next)
    onModeChange?.(next)
  }
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
        await startRegistration({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        })
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

  const view =
    mode === 'verify' ? (
      <motion.div
        key="verify"
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -32 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
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

            <AnimatePresence>{error && <ErrorMessage>{error}</ErrorMessage>}</AnimatePresence>

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
      </motion.div>
    ) : (
      <motion.div
        key="main"
        initial={{ opacity: 0, x: -32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -32 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="flex flex-col gap-6"
      >
        {!hideTabs && (
          <div className="relative flex rounded-full border border-gold/20 bg-cream p-1">
            {(
              [
                ['login', 'Entrar'],
                ['register', 'Criar conta'],
              ] as const
            ).map(([value, text]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value)
                  setError(null)
                }}
                className="relative flex flex-1 items-center justify-center rounded-full py-2 font-subtitle text-sm"
              >
                {mode === value && (
                  <motion.span
                    layoutId="auth-tab-pill"
                    className="absolute inset-0 rounded-full bg-gold-deep shadow-md shadow-gold-deep/30"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span
                  className={`relative transition-colors duration-300 ${
                    mode === value ? 'text-cream' : 'text-onyx/60 hover:text-onyx'
                  }`}
                >
                  {text}
                </span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col">
          <AnimatePresence initial={false}>
            {mode === 'register' && (
              <Collapse key="name">
                <Field
                  label="Nome"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="O teu nome"
                />
              </Collapse>
            )}
            {mode === 'register' && (
              <Collapse key="phone">
                <Field
                  label="Telemóvel"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="912 345 678"
                />
              </Collapse>
            )}
          </AnimatePresence>

          <div className="pb-4">
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>
          <div className="pb-4">
            <PasswordField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : 'A tua password'}
            />
          </div>

          <AnimatePresence initial={false}>
            {mode === 'register' && password.length > 0 && !passwordValid && (
              <Collapse key="rules">
                <PasswordChecklist password={password} />
              </Collapse>
            )}
            {mode === 'register' && (
              <Collapse key="confirm">
                <PasswordField
                  label="Confirmar password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repete a password"
                />
              </Collapse>
            )}
            {mode === 'register' && confirmPassword.length > 0 && confirmPassword !== password && (
              <Collapse key="mismatch">
                <p className="font-subtitle text-xs text-red-700">As passwords não coincidem.</p>
              </Collapse>
            )}
            {error && (
              <Collapse key="error">
                <ErrorMessage>{error}</ErrorMessage>
              </Collapse>
            )}
          </AnimatePresence>

          <div className="flex justify-center sm:justify-start">
            <MotionButton
              label={submitting ? 'A processar...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
              disabled={!canSubmit || submitting}
              type="submit"
            />
          </div>
        </form>
      </motion.div>
    )

  return (
    <AnimatePresence mode="wait" initial={false}>
      {view}
    </AnimatePresence>
  )
}
