import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { ActionButton } from '@/components/ui/action-button'
import { useAccountAuthForm, type AuthMode } from '@/components/ui/account-auth-form'
import { ForgotPasswordSheet } from '@/components/ui/forgot-password-sheet'
import { useCustomerAuth } from '@/lib/customer-auth'
import { cn } from '@/lib/utils'

const COPY: Record<AuthMode, { title: string; text: string }> = {
  login: { title: 'Entrar', text: 'Entra para marcares e acompanhares as tuas sessões.' },
  register: { title: 'Criar conta', text: 'Marca, reagenda e acompanha as tuas sessões num só sítio.' },
  verify: { title: 'Confirma o teu email', text: '' },
}

/** A field inside a grouped list: no box of its own, just the row. 16px text so iOS doesn't zoom in on focus. */
const fieldClass =
  'field-plain block h-[52px] w-full min-w-0 bg-transparent px-4 font-subtitle text-base text-onyx outline-none placeholder:text-onyx/35'

/** Fields stacked in one rounded group with hairlines between them, as in the iPhone's settings. */
function Group({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-onyx/[0.04]">{children}</div>
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative block">
      <input {...props} type={visible ? 'text' : 'password'} className={cn(fieldClass, 'pr-12')} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Esconder password' : 'Mostrar password'}
        className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-onyx/40"
      >
        {visible ? <EyeOff className="size-[18px]" strokeWidth={1.75} /> : <Eye className="size-[18px]" strokeWidth={1.75} />}
      </button>
    </span>
  )
}

/**
 * The customer app's own sign in / sign up, simple and in black and white like its profile: the title, an iPhone-style
 * switch between the two, the fields grouped in one list (with the iPhone's autofill for email, passwords and the
 * emailed code), and the app's button. The logic is the website's (useAccountAuthForm); only the looks differ.
 */
export default function AuthScreen({ stay = false }: { stay?: boolean } = {}) {
  const navigate = useNavigate()
  const { customer, loading } = useCustomerAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  // `stay`: shown in place of a screen that needs an account, which then simply appears; otherwise on to the profile.
  const goOn = () => {
    if (!stay) navigate('/conta', { replace: true })
  }
  const form = useAccountAuthForm({ mode, setMode, onSuccess: goOn })
  const copy = COPY[mode]

  useEffect(() => {
    if (!stay && !loading && customer) navigate('/conta', { replace: true })
  }, [stay, loading, customer, navigate])

  const switchTo = (next: AuthMode) => {
    setMode(next)
    form.setError(null)
  }

  const rules = [
    { ok: form.password.length >= 8, text: '8 ou mais caracteres' },
    { ok: /[A-Z]/.test(form.password), text: 'Uma maiúscula' },
    { ok: /[0-9]/.test(form.password), text: 'Um número' },
    { ok: /[^A-Za-z0-9]/.test(form.password), text: 'Um carácter especial' },
  ]

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))]">
      <header className="text-center">
        <h1 className="font-subtitle text-2xl font-semibold tracking-tight text-onyx">{copy.title}</h1>
        <p className="mx-auto mt-1.5 max-w-xs font-subtitle text-sm text-onyx/55">
          {mode === 'verify' ? (
            <>
              Enviámos um código de 6 dígitos para <span className="text-onyx">{form.email}</span>.
            </>
          ) : (
            copy.text
          )}
        </p>
      </header>

      {mode !== 'verify' && (
        // iPhone-style switch between signing in and creating an account.
        <div className="mt-7 grid grid-cols-2 rounded-xl bg-onyx/[0.06] p-1" role="tablist" aria-label="Conta">
          {(
            [
              ['login', 'Entrar'],
              ['register', 'Criar conta'],
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => switchTo(value)}
              className="relative h-9 font-subtitle text-sm"
            >
              {mode === value && (
                <motion.span
                  layoutId="auth-switch"
                  className="absolute inset-0 rounded-[9px] bg-white shadow-sm shadow-black/10 dark:bg-onyx/[0.14]"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                />
              )}
              <span className={cn('relative', mode === value ? 'font-medium text-onyx' : 'text-onyx/55')}>{text}</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={form.handleSubmit} className="mt-6 flex flex-col gap-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            {mode === 'verify' ? (
              <Group>
                <div>
                  <input
                    aria-label="Código de verificação"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={form.code}
                    onChange={(e) => form.setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className={cn(fieldClass, 'h-14 text-center text-2xl tracking-[0.5em]')}
                  />
                </div>
              </Group>
            ) : (
              <>
                {mode === 'register' && (
                  <Group>
                    <div>
                      <input
                        aria-label="Nome"
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => form.setName(e.target.value)}
                        placeholder="Nome"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <input
                        aria-label="Telemóvel"
                        type="tel"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={(e) => form.setPhone(e.target.value)}
                        placeholder="Telemóvel"
                        className={fieldClass}
                      />
                    </div>
                  </Group>
                )}
                <Group>
                  <div>
                    <input
                      aria-label="Email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      value={form.email}
                      onChange={(e) => form.setEmail(e.target.value)}
                      placeholder="Email"
                      className={fieldClass}
                    />
                  </div>
                  <PasswordInput
                    aria-label="Password"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    value={form.password}
                    onChange={(e) => form.setPassword(e.target.value)}
                    placeholder="Password"
                  />
                  {mode === 'register' && (
                    <PasswordInput
                      aria-label="Confirmar password"
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={(e) => form.setConfirmPassword(e.target.value)}
                      placeholder="Confirmar password"
                    />
                  )}
                </Group>

                {mode === 'register' && form.password.length > 0 && (
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-1">
                    {rules.map((rule) => (
                      <li
                        key={rule.text}
                        className={cn(
                          'flex items-center gap-1.5 font-subtitle text-xs',
                          rule.ok ? 'text-onyx' : 'text-onyx/45',
                        )}
                      >
                        <Check className={cn('size-3.5', rule.ok ? 'opacity-100' : 'opacity-30')} strokeWidth={2.5} />
                        {rule.text}
                      </li>
                    ))}
                  </ul>
                )}
                {mode === 'register' &&
                  form.confirmPassword.length > 0 &&
                  form.confirmPassword !== form.password && (
                    <p className="px-1 font-subtitle text-xs text-red-700">As passwords não coincidem.</p>
                  )}

                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => form.setForgotOpen(true)}
                    className="self-end px-1 font-subtitle text-sm text-onyx/60"
                  >
                    Esqueci-me da password
                  </button>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {form.error && (
          <p role="alert" className="px-1 text-center font-subtitle text-sm text-red-700">
            {form.error}
          </p>
        )}

        <div className="mt-2 flex justify-center">
          <ActionButton
            type="submit"
            disabled={!form.canSubmit || form.submitting}
            label={
              form.submitting
                ? 'A processar...'
                : mode === 'login'
                  ? 'Entrar'
                  : mode === 'register'
                    ? 'Criar conta'
                    : 'Confirmar'
            }
          />
        </div>

        {mode === 'verify' && (
          <div className="flex flex-col items-center gap-2 font-subtitle text-sm">
            <button
              type="button"
              onClick={form.handleResend}
              disabled={form.resendCooldown > 0 || form.submitting}
              className="text-onyx underline underline-offset-4 disabled:text-onyx/40 disabled:no-underline"
            >
              {form.resendCooldown > 0 ? `Reenviar código (${form.resendCooldown}s)` : 'Reenviar código'}
            </button>
            <button type="button" onClick={() => switchTo('register')} className="text-onyx/55">
              Alterar email
            </button>
          </div>
        )}
      </form>

      <ForgotPasswordSheet open={form.forgotOpen} initialEmail={form.email} onClose={() => form.setForgotOpen(false)} />
    </main>
  )
}
