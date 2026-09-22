import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Gallery } from '@/components/ui/gallery'
import { MotionButton } from '@/components/ui/motion-button'
import { api, ApiError } from '@/lib/api'

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
      await api.post('/auth/login', { email, password })
      navigate('/admin')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao iniciar sessão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-cream px-5 py-16">
      <Gallery className="absolute inset-0" />

      <Link to="/" className="relative z-10 mb-8 font-logo text-3xl leading-none tracking-wide text-gold-deep">
        AfroGlow
      </Link>

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm rounded-3xl border border-gold/20 bg-white/95 p-8 backdrop-blur-sm"
      >
        <h1 className="font-logo text-2xl text-onyx">Área de Admin</h1>
        <div className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-gold/30 bg-white px-4 py-3 font-subtitle text-onyx outline-none transition-colors duration-300 focus-visible:border-gold-deep"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-gold/30 bg-white px-4 py-3 font-subtitle text-onyx outline-none transition-colors duration-300 focus-visible:border-gold-deep"
            />
          </label>
        </div>
        {error && <p className="mt-4 font-subtitle text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-center">
          <MotionButton label={loading ? 'A entrar...' : 'Entrar'} disabled={loading} type="submit" className="w-full" />
        </div>
      </form>
    </div>
  )
}
