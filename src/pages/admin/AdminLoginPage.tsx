import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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
    <div className="flex min-h-screen items-center justify-center bg-cream px-5">
      <form onSubmit={handleSubmit} className="w-full max-w-sm border border-gold/30 bg-white p-8">
        <h1 className="font-display text-3xl italic">Área de Admin</h1>
        <div className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-ui text-xs uppercase tracking-wide text-muted-dark">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gold/30 px-4 py-2.5 font-body text-onyx outline-none focus-visible:border-gold-deep"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-ui text-xs uppercase tracking-wide text-muted-dark">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-gold/30 px-4 py-2.5 font-body text-onyx outline-none focus-visible:border-gold-deep"
            />
          </label>
        </div>
        {error && <p className="mt-4 font-body text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-6 w-full justify-center">
          {loading ? 'A entrar...' : 'Entrar'}
        </Button>
      </form>
    </div>
  )
}
