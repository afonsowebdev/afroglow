import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check } from 'lucide-react'
import { ActionButton } from '@/components/ui/action-button'
import { ButtonWithIcon } from '@/components/ui/button-with-icon'
import { useAccountAuthForm, type AuthMode } from '@/components/ui/account-auth-form'
import { ForgotPasswordSheet } from '@/components/ui/forgot-password-sheet'
import { useCustomerAuth } from '@/lib/customer-auth'
import { cn } from '@/lib/utils'
import { BRAND_CIRCLE } from '@/components/ui/brand-logo'
import { Group, PasswordInput, fieldClass } from '@/components/ui/grouped-fields'
import { VelocityRow } from '@/components/ui/velocity-marquee'

const COPY: Record<AuthMode, { title: string; text: string }> = {
  login: {
    title: 'Entrar',
    text: 'Entra para marcares e acompanhares as tuas sessões.',
  },
  register: {
    title: 'Criar conta',
    text: 'Marca, reagenda e acompanha as tuas sessões num só sítio.',
  },
  verify: { title: 'Confirma o teu email', text: '' },
}

const EASE = [0.22, 1, 0.36, 1] as const

const markClass = `flex size-14 shrink-0 items-center justify-center rounded-full font-logo text-[1.75rem] leading-none logo-weight ${BRAND_CIRCLE}`

/** Opens and closes with a smooth height and fade, so the form reflows instead of jumping (as on the website). */
function Collapse({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="overflow-hidden"
    >
      <div className={className}>{children}</div>
    </motion.div>
  )
}

/**
 * The customer app's own sign in / sign up, simple and in black and white like its profile: the title, an iPhone-style
 * switch between the two, the fields grouped in one list (with the iPhone's autofill for email, passwords and the
 * emailed code), and the app's button. The logic is the website's (useAccountAuthForm); only the looks differ.
 */
export default function AuthScreen({ stay = false, site = false }: { stay?: boolean; site?: boolean } = {}) {
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
    <main
      className={cn(
        'relative isolate mx-auto flex min-h-[100svh] w-full max-w-md flex-col justify-center px-5',
        // `site`: the website's page, under its header; otherwise between the app's top row and tab bar.
        site
          ? 'pb-16 pt-[calc(3rem+env(safe-area-inset-top))]'
          : 'pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(3rem+env(safe-area-inset-top))]',
      )}
    >
      {/* AFROGLOW sliding behind everything, as on the website's sections. Full width of the screen. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-0 left-1/2 -z-10 flex w-screen -translate-x-1/2 flex-col',
          // Site: across the middle. App: lower down, in the free space above the tab bar, where the form doesn't cover it.
          site ? 'justify-center' : 'justify-end pb-[calc(7.5rem+env(safe-area-inset-bottom))]',
        )}
      >
        <VelocityRow direction={-1} />
      </div>

      {/* The "A" at the top, as on the admin's sign-in (no header on this screen). On the website it leads home. */}
      {site ? (
        <Link to="/" aria-label="AFROGLOW, voltar ao início" className={`${markClass} mx-auto mb-5`}>
          <span className="translate-y-[0.1em]">A</span>
        </Link>
      ) : (
        <span aria-hidden="true" className={`${markClass} mx-auto mb-5`}>
          <span className="translate-y-[0.1em]">A</span>
        </span>
      )}

      {/* The title and line fade from one to the other, as on the website. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.header
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="text-center"
        >
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
        </motion.header>
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {mode !== 'verify' && (
          <Collapse key="switch">
            {/* iPhone-style switch between signing in and creating an account. */}
            <div
              className="mt-7 grid grid-cols-2 rounded-xl bg-[color-mix(in_srgb,var(--color-onyx)_6%,var(--color-white))] p-1"
              role="tablist"
              aria-label="Conta"
            >
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
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 36,
                      }}
                    />
                  )}
                  <span className={cn('relative', mode === value ? 'font-medium text-onyx' : 'text-onyx/55')}>
                    {text}
                  </span>
                </button>
              ))}
            </div>
          </Collapse>
        )}
      </AnimatePresence>

      <form onSubmit={form.handleSubmit} className="mt-6 flex flex-col">
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'verify' ? (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
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
            </motion.div>
          ) : (
            // Signing in and creating an account share the email and password; the extra fields open and close
            // around them, so switching never jumps.
            <motion.div
              key="main"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <AnimatePresence initial={false}>
                {mode === 'register' && (
                  <Collapse key="identity" className="pb-4">
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
                  </Collapse>
                )}
              </AnimatePresence>

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
                <AnimatePresence initial={false}>
                  {mode === 'register' && (
                    <Collapse key="confirm">
                      <PasswordInput
                        aria-label="Confirmar password"
                        autoComplete="new-password"
                        value={form.confirmPassword}
                        onChange={(e) => form.setConfirmPassword(e.target.value)}
                        placeholder="Confirmar password"
                      />
                    </Collapse>
                  )}
                </AnimatePresence>
              </Group>

              <AnimatePresence initial={false}>
                {mode === 'register' && form.password.length > 0 && (
                  <Collapse key="rules" className="px-1 pt-4">
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
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
                  </Collapse>
                )}
                {mode === 'register' && form.confirmPassword.length > 0 && form.confirmPassword !== form.password && (
                  <Collapse key="mismatch" className="px-1 pt-3">
                    <p className="font-subtitle text-xs text-red-700">As passwords não coincidem.</p>
                  </Collapse>
                )}
                {mode === 'login' && (
                  <Collapse key="forgot" className="flex justify-end px-1 pt-4">
                    <button
                      type="button"
                      onClick={() => form.setForgotOpen(true)}
                      className="font-subtitle text-sm text-onyx/60"
                    >
                      Esqueci-me da password
                    </button>
                  </Collapse>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {form.error && (
            <Collapse key="error" className="px-1 pt-4">
              <p role="alert" className="text-center font-subtitle text-sm text-red-700">
                {form.error}
              </p>
            </Collapse>
          )}
        </AnimatePresence>

        <div className="mt-6 flex justify-center">
          {site ? (
            <ButtonWithIcon
              solid
              large
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
              className="disabled:opacity-40"
            />
          ) : (
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
          )}
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
