import { useEffect, useState, type FormEvent } from 'react'
import { MotionButton } from '@/components/ui/motion-button'
import { api, ApiError } from '@/lib/api'
import { loadBusinessInfo, type BusinessInfo } from '@/lib/site-config'

const fieldClass =
  'w-full rounded-xl border border-gold/30 bg-white px-4 py-3 font-subtitle text-onyx outline-none transition-colors duration-300 focus-visible:border-gold-deep'

function Label({ children, hint }: { children: string; hint?: string }) {
  return (
    <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
      {children}
      {hint && <span className="ml-2 normal-case tracking-normal text-muted-dark/70">{hint}</span>}
    </span>
  )
}

/** Business details shown on the website and in the customer app. Empty fields stay hidden there. */
export function SettingsView() {
  const [form, setForm] = useState<BusinessInfo | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    api
      .get<BusinessInfo>('/settings')
      .then(setForm)
      .catch(() => setMessage({ ok: false, text: 'Não foi possível carregar as definições.' }))
  }, [])

  if (!form) {
    return <p className="mt-8 font-subtitle text-muted-dark">{message?.text ?? 'A carregar...'}</p>
  }

  function update(patch: Partial<BusinessInfo>) {
    setForm((current) => (current ? { ...current, ...patch } : current))
    setMessage(null)
  }

  function updateHours(index: number, patch: Partial<BusinessInfo['openingHours'][number]>) {
    if (!form) return
    update({ openingHours: form.openingHours.map((row, i) => (i === index ? { ...row, ...patch } : row)) })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form || saving) return
    setSaving(true)
    setMessage(null)
    try {
      const saved = await api.put<BusinessInfo>('/admin/settings', {
        ...form,
        whatsappNumber: form.whatsappNumber.replace(/\D/g, ''),
        openingHours: form.openingHours.filter((row) => row.days.trim() && row.hours.trim()),
      })
      setForm(saved)
      loadBusinessInfo(true)
      setMessage({ ok: true, text: 'Guardado. O site e a app já mostram estes dados.' })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5 rounded-2xl border border-gold/20 bg-white p-5 sm:p-6">
      <div>
        <h2 className="font-subtitle text-xl text-onyx">Definições do negócio</h2>
        <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">
          Aparecem no site e na app dos clientes. O que ficar vazio não é mostrado.
        </p>
      </div>

      <label>
        <Label hint="com indicativo, só números">WhatsApp</Label>
        <input
          value={form.whatsappNumber}
          onChange={(e) => update({ whatsappNumber: e.target.value })}
          inputMode="numeric"
          placeholder="351912345678"
          maxLength={20}
          className={fieldClass}
        />
      </label>
      <label>
        <Label>Telefone</Label>
        <input
          value={form.phone}
          onChange={(e) => update({ phone: e.target.value })}
          type="tel"
          placeholder="+351 912 345 678"
          maxLength={30}
          className={fieldClass}
        />
      </label>
      <label>
        <Label>Morada</Label>
        <input
          value={form.address}
          onChange={(e) => update({ address: e.target.value })}
          placeholder="Rua Exemplo 12, 4000-000 Porto"
          maxLength={200}
          className={fieldClass}
        />
      </label>
      <label>
        <Label hint="link de partilha do Google Maps ou Apple Maps">Mapa</Label>
        <input
          value={form.mapUrl}
          onChange={(e) => update({ mapUrl: e.target.value })}
          type="url"
          placeholder="https://maps.app.goo.gl/..."
          maxLength={500}
          className={fieldClass}
        />
      </label>

      <div>
        <Label>Horário de abertura</Label>
        <div className="flex flex-col gap-2">
          {form.openingHours.map((row, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={row.days}
                onChange={(e) => updateHours(index, { days: e.target.value })}
                aria-label="Dias"
                placeholder="Terça a sábado"
                maxLength={60}
                className={fieldClass}
              />
              <input
                value={row.hours}
                onChange={(e) => updateHours(index, { hours: e.target.value })}
                aria-label="Horas"
                placeholder="09:00 – 18:00"
                maxLength={60}
                className={fieldClass}
              />
              <button
                type="button"
                aria-label="Remover linha"
                onClick={() => update({ openingHours: form.openingHours.filter((_, i) => i !== index) })}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gold/30 text-muted-dark hover:text-red-700"
              >
                <i className="bx bx-trash" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        {form.openingHours.length < 10 && (
          <button
            type="button"
            onClick={() => update({ openingHours: [...form.openingHours, { days: '', hours: '' }] })}
            className="mt-3 font-subtitle text-sm text-gold-deep underline"
          >
            + Adicionar linha
          </button>
        )}
      </div>

      <label>
        <Label hint="mostrada antes de confirmar e ao cancelar">Política de cancelamento</Label>
        <textarea
          value={form.cancellationPolicy}
          onChange={(e) => update({ cancellationPolicy: e.target.value })}
          rows={3}
          maxLength={600}
          placeholder="Ex.: Cancelamentos com menos de 24 horas de antecedência..."
          className={fieldClass}
        />
      </label>

      {message && (
        <p className={`font-subtitle text-sm ${message.ok ? 'text-gold-deep' : 'text-red-700'}`}>{message.text}</p>
      )}

      <div>
        <MotionButton label={saving ? 'A guardar...' : 'Guardar'} type="submit" disabled={saving} />
      </div>
    </form>
  )
}
