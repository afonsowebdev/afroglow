import { useState } from 'react'
import { MotionButton } from '@/components/ui/motion-button'
import { ApiError } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'

const inputClasses =
  'rounded-xl border border-gold/30 bg-white px-4 py-3 font-subtitle text-onyx outline-none transition-colors duration-300 focus-visible:border-gold-deep'

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

export function AccountAuthForm({ onSuccess }: { onSuccess?: () => void }) {
  const { login, register } = useCustomerAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit =
    email.trim().length > 3 &&
    password.length >= (mode === 'register' ? 8 : 1) &&
    (mode === 'login' || (name.trim().length >= 2 && phone.trim().length >= 6))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password })
      }
      onSuccess?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.')
    } finally {
      setSubmitting(false)
    }
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
