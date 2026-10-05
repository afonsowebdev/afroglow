import { useState, type FormEvent } from 'react'
import { MotionButton } from '@/components/ui/motion-button'
import { api, ApiError } from '@/lib/api'

const fieldClass =
  'w-full rounded-xl border border-gold/30 bg-white px-4 py-3 font-subtitle text-onyx outline-none transition-colors duration-300 focus-visible:border-gold-deep'

export function SecurityView() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const mismatch = confirm.length > 0 && next !== confirm
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || busy) return
    setBusy(true)
    setMessage(null)
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next })
      setCurrent('')
      setNext('')
      setConfirm('')
      setMessage({ ok: true, text: 'Password alterada.' })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 flex flex-col gap-5 rounded-2xl border-[1.5px] border-onyx/25 bg-white p-5 sm:p-6"
    >
      <div>
        <h2 className="font-subtitle text-xl text-onyx">Alterar password</h2>
        <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">Usa pelo menos 8 caracteres.</p>
      </div>
      <label>
        <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
          Password atual
        </span>
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={fieldClass}
        />
      </label>
      <label>
        <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
          Nova password
        </span>
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={fieldClass}
        />
      </label>
      <label>
        <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
          Repetir nova password
        </span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={fieldClass}
        />
        {mismatch && <span className="mt-1 block font-subtitle text-xs text-red-700">As passwords não coincidem.</span>}
      </label>
      {message && (
        <p className={`font-subtitle text-sm ${message.ok ? 'text-gold-deep' : 'text-red-700'}`}>{message.text}</p>
      )}
      <div>
        <MotionButton label={busy ? 'A guardar...' : 'Alterar password'} type="submit" disabled={!canSubmit || busy} />
      </div>
    </form>
  )
}
