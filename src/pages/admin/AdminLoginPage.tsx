import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionButton } from '@/components/ui/action-button'
import { BRAND_CIRCLE } from '@/components/ui/brand-logo'
import { Group, PasswordInput, fieldClass } from '@/components/ui/grouped-fields'
import { VelocityRow } from '@/components/ui/velocity-marquee'
import { adminToken, api, ApiError } from '@/lib/api'

/**
 * The admin's sign-in, in the same simple black and white as the customer app's: the "A", the title, email and
 * password grouped in one list (with the iPhone's autofill), the app's button, and AFROGLOW sliding behind.
 */
export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    <div className="app-neutral relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-white px-5 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[calc(3rem+env(safe-area-inset-top))]">
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
          <h1 className="mt-5 font-subtitle text-2xl font-semibold tracking-tight text-onyx">Painel AFROGLOW</h1>
          <p className="mt-1.5 font-subtitle text-sm text-onyx/55">Marcações, clientes e agenda da AFROGLOW.</p>
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

          {error && (
            <p role="alert" className="px-1 pt-4 text-center font-subtitle text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-center">
            <ActionButton
              type="submit"
              disabled={loading || !email || !password}
              label={loading ? 'A entrar...' : 'Entrar'}
            />
          </div>
        </form>
      </main>
    </div>
  )
}
