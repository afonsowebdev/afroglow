import { useEffect, useState, type FormEvent } from 'react'
import { api, ApiError } from '@/lib/api'
import { loadBusinessInfo, mapSearchText, type BusinessInfo } from '@/lib/site-config'

// Fields inside the grouped lists: no box of their own.
const plain =
  'field-plain block w-full min-w-0 bg-transparent font-subtitle text-base text-onyx outline-none placeholder:text-onyx/35'
const group =
  'divide-y divide-[var(--ios-separator)] overflow-hidden rounded-[10px] bg-[var(--ios-cell)]'

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-[7px] px-4 text-[13px] uppercase text-[var(--ios-secondary)]">
        {title}
      </h2>
      {children}
      {note && <p className="mt-2 px-1 font-subtitle text-xs text-muted-dark">{note}</p>}
    </section>
  )
}

/** A label on the left and its field on the right, as in the iPhone's settings. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-3 px-4">
      <span className="w-24 shrink-0 font-subtitle text-[15px] text-onyx">{label}</span>
      {children}
    </label>
  )
}

/** Business details shown on the website and in the customer app. Empty fields stay hidden there. */
export function SettingsView() {
  const [form, setForm] = useState<BusinessInfo | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  // Something changed since it was loaded or saved: the save button shows.
  const [dirty, setDirty] = useState(false)

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
    setDirty(true)
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
      setDirty(false)
      loadBusinessInfo(true)
      setMessage({ ok: true, text: 'Guardado. O site e a app já mostram isto.' })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.' })
    } finally {
      setSaving(false)
    }
  }

  const digits = form.whatsappNumber.replace(/\D/g, '')

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-7">
      <p className="px-1 font-subtitle text-sm text-muted-dark">
        Aparecem no site e na app dos clientes. O que ficar vazio não é mostrado.
      </p>

      <Section title="Contactos">
        <div className={group}>
          <Row label="WhatsApp">
            <input
              value={form.whatsappNumber}
              onChange={(e) => update({ whatsappNumber: e.target.value })}
              inputMode="numeric"
              placeholder="351912345678"
              maxLength={20}
              className={`${plain} h-[52px] text-right`}
            />
          </Row>
          <Row label="Telefone">
            <input
              value={form.phone}
              onChange={(e) => update({ phone: e.target.value })}
              type="tel"
              placeholder="+351 912 345 678"
              maxLength={30}
              className={`${plain} h-[52px] text-right`}
            />
          </Row>
        </div>
        {/* A way to check the numbers before saving. */}
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 px-1 font-subtitle text-xs">
          {digits.length >= 9 && (
            <a
              href={`https://wa.me/${digits}`}
              target="_blank"
              rel="noreferrer"
              className="text-onyx underline underline-offset-4"
            >
              Testar WhatsApp
            </a>
          )}
          {form.phone.replace(/[^+\d]/g, '').length >= 9 && (
            <a href={`tel:${form.phone.replace(/[^+\d]/g, '')}`} className="text-onyx underline underline-offset-4">
              Testar chamada
            </a>
          )}
          <span className="text-muted-dark">WhatsApp com indicativo, só números (ex. 351…).</span>
        </div>
      </Section>

      <Section title="Localização">
        <div className={group}>
          <label className="block px-4 pb-2.5 pt-2">
            <span className="block font-subtitle text-[11px] text-muted-dark">Morada</span>
            <textarea
              value={form.address}
              onChange={(e) => update({ address: e.target.value })}
              placeholder="Rua Exemplo 12, 4000-000 Porto"
              maxLength={200}
              rows={2}
              className={`${plain} mt-0.5 resize-none leading-snug`}
            />
          </label>
          <label className="block px-4 pb-2.5 pt-2">
            <span className="block font-subtitle text-[11px] text-muted-dark">Link do mapa (opcional)</span>
            <input
              value={form.mapUrl}
              onChange={(e) => update({ mapUrl: e.target.value })}
              type="url"
              placeholder="https://maps.app.goo.gl/..."
              maxLength={500}
              className={`${plain} mt-0.5 h-7`}
            />
          </label>
        </div>
        <p className="mt-2 px-1 font-subtitle text-xs text-muted-dark">
          Sem link, o mapa procura a morada.{' '}
          {(form.mapUrl || form.address) && (
            <a
              href={
                form.mapUrl ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearchText(form.address))}`
              }
              target="_blank"
              rel="noreferrer"
              className="text-onyx underline underline-offset-4"
            >
              Ver no mapa
            </a>
          )}
        </p>
      </Section>

      <Section
        title="Horário"
        note="As horas a que começam as sessões (ex. 09:00 e 14:00). Os dias que não estiverem aqui aparecem como fechados."
      >
        {/* One grouped list, a row per day: the day, the hours beside it, and remove. */}
        <div className={group}>
          {form.openingHours.map((row, index) => (
            <div key={index} className="flex items-center">
              <input
                value={row.days}
                onChange={(e) => updateHours(index, { days: e.target.value })}
                aria-label="Dia"
                placeholder="Quarta-feira"
                maxLength={60}
                className="field-plain h-[52px] min-w-0 flex-1 bg-transparent pl-4 font-subtitle text-base text-onyx outline-none placeholder:text-onyx/35"
              />
              <input
                value={row.hours}
                onChange={(e) => updateHours(index, { hours: e.target.value })}
                aria-label="Horas"
                placeholder="09:00 e 14:00"
                maxLength={60}
                className="field-plain h-[52px] w-[7.25rem] shrink-0 bg-transparent px-1 text-right font-subtitle text-base text-onyx/70 outline-none placeholder:text-onyx/35"
              />
              <button
                type="button"
                aria-label={`Remover ${row.days || 'linha'}`}
                onClick={() => update({ openingHours: form.openingHours.filter((_, i) => i !== index) })}
                className="flex h-[52px] w-11 shrink-0 items-center justify-center text-lg text-onyx/35 hover:text-red-700"
              >
                <i className="bx bx-minus-circle" aria-hidden="true" />
              </button>
            </div>
          ))}
          {form.openingHours.length < 10 && (
            <button
              type="button"
              onClick={() => update({ openingHours: [...form.openingHours, { days: '', hours: '' }] })}
              className="flex h-[52px] w-full items-center gap-2 px-4 font-subtitle text-[15px] text-onyx"
            >
              <i className="bx bx-plus-circle text-lg" aria-hidden="true" />
              Adicionar dia
            </button>
          )}
        </div>
      </Section>

      <Section title="Cancelamento" note="Mostrada às clientes antes de confirmarem e quando cancelam.">
        <div className={group}>
          <label className="block px-4 py-3">
            <textarea
              value={form.cancellationPolicy}
              onChange={(e) => update({ cancellationPolicy: e.target.value })}
              rows={3}
              maxLength={600}
              placeholder="Ex.: Cancelamentos com menos de 24 horas de antecedência..."
              className={`${plain} resize-none leading-snug`}
              aria-label="Política de cancelamento"
            />
          </label>
        </div>
      </Section>

      {/* Saving stays in reach above the tab bar while there are changes. */}
      <div className="sticky bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-10 flex flex-col items-center gap-2">
        {message && (
          <p
            role={message.ok ? 'status' : 'alert'}
            className={`rounded-full px-4 py-1.5 font-subtitle text-sm shadow-sm ${
              message.ok ? 'bg-white text-onyx' : 'bg-white text-red-700'
            }`}
          >
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || !dirty}
          className="h-12 w-full max-w-xs rounded-full bg-onyx font-subtitle text-sm font-medium text-white shadow-lg shadow-black/15 transition-opacity disabled:opacity-0"
        >
          {saving ? 'A guardar…' : 'Guardar alterações'}
        </button>
      </div>
    </form>
  )
}
