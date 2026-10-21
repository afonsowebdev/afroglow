import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BRAND_CIRCLE } from '@/components/ui/brand-logo'
import { ForgotPasswordSheet } from '@/components/ui/forgot-password-sheet'
import { Group, PasswordInput, fieldClass } from '@/components/ui/grouped-fields'
import { VelocityRow } from '@/components/ui/velocity-marquee'
import { adminToken, api, ApiError } from '@/lib/api'
import { Button } from './ios'

/**
 * The admin's sign-in, in the admin app's iPhone style: the "A", the title, email and password grouped in one list
 * (with the iPhone's autofill), the filled button, and AFROGLOW sliding behind.
 */
export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { sessionToken } = await api.post<{ email: string; sessionToken?: string }>('/auth/login', {
        email,
        password,
      })
      adminToken.set(sessionToken ?? null)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao iniciar sessão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-ios relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[calc(3rem+env(safe-area-inset-top))]">
      {/* AFROGLOW sliding behind, in the free space under the form. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] -z-10"
      >
        <VelocityRow direction={-1} />
      </div>

      <main className="w-full max-w-md">
        <header className="flex flex-col items-center text-center">
          <span
            aria-hidden="true"
            className={`flex size-14 items-center justify-center rounded-full font-logo text-[1.75rem] leading-none logo-weight ${BRAND_CIRCLE}`}
          >
            <span className="translate-y-[0.1em]">A</span>
          </span>
          <h1 className="mt-5 text-[28px] font-bold tracking-tight">AFRO ADMIN</h1>
          <p className="mt-1 text-[15px] text-[var(--ios-secondary)]">Marcações, clientes e agenda da AFROGLOW.</p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col">
          <Group>
            <div>
              <input
                aria-label="Email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className={fieldClass}
              />
            </div>
            <PasswordInput
              aria-label="Password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </Group>

          <div className="flex justify-end px-1 pt-4">
            <button type="button" onClick={() => setForgotOpen(true)} className="text-[15px] text-[var(--ios-tint)] active:opacity-50">
              Esqueci-me da password
            </button>
          </div>

          {error && (
            <p role="alert" className="px-1 pt-4 text-center text-[15px] text-[var(--ios-red)]">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-6" disabled={loading || !email || !password}>
            {loading ? 'A entrar…' : 'Entrar'}
          </Button>
        </form>
      </main>

      <ForgotPasswordSheet admin open={forgotOpen} initialEmail={email} onClose={() => setForgotOpen(false)} />
    </div>
  )
}
