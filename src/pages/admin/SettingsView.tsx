import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, Clock, ExternalLink, FileText, MapPin, Minus, Phone, Plus, X, type LucideIcon } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { tap } from '@/lib/haptics'
import { loadBusinessInfo, mapSearchText, type BusinessInfo } from '@/lib/site-config'
import { cardShadow } from './admin-ui'

// A field in a glass pill, without a box of its own inside.
const plain =
  'field-plain block w-full min-w-0 !border-0 !bg-transparent !p-0 font-subtitle text-base text-onyx !shadow-none outline-none placeholder:text-onyx/35'
const glassField = 'glass-chip flex items-center gap-3 rounded-full px-4'
const testChip = 'glass-chip flex h-8 items-center gap-1.5 rounded-full px-3 font-subtitle text-[12px] font-semibold text-onyx'

/** A part of the settings, in a white card like the Painel's: an icon in a glass circle, its title and what it is for. */
function Card({ Icon, title, note, children }: { Icon: LucideIcon; title: string; note?: string; children: ReactNode }) {
  return (
    <section className={`rounded-[22px] bg-card p-4 ${cardShadow}`}>
      <div className="mb-3.5 flex items-center gap-3">
        <span className="glass-chip flex size-10 shrink-0 items-center justify-center rounded-full text-onyx">
          <Icon size={17} />
        </span>
        <span className="min-w-0">
          <span className="block font-subtitle text-[15px] font-semibold text-onyx">{title}</span>
          {note && <span className="block font-subtitle text-xs leading-snug text-muted-dark">{note}</span>}
        </span>
      </div>
      {children}
    </section>
  )
}

/**
 * Business details shown on the website and in the customer app (empty fields stay hidden there), in the Painel's
 * style: a white card per part with glass fields, ways to test the numbers and the map, and a plain save button that
 * shows while something changed.
 */
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
    return <p className="mt-8 px-1 font-subtitle text-sm text-muted-dark">{message?.text ?? 'A carregar…'}</p>
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
  const phoneDigits = form.phone.replace(/[^+\d]/g, '')
  const mapHref = form.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearchText(form.address))}`

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <p className="px-1 font-subtitle text-sm text-muted-dark">Aparecem no site e na app das clientes. O que ficar vazio não é mostrado.</p>

      <Card Icon={Phone} title="Contactos" note="WhatsApp com indicativo, só números (ex. 351…).">
        <div className="flex flex-col gap-2">
          <label className={`${glassField} h-12`}>
            <i className="bx bxl-whatsapp text-lg text-ink-3" aria-hidden="true" />
            <span className="w-[4.5rem] shrink-0 font-subtitle text-[13px] text-muted-dark">WhatsApp</span>
            <input
              value={form.whatsappNumber}
              onChange={(e) => update({ whatsappNumber: e.target.value })}
              inputMode="numeric"
              placeholder="351912345678"
              maxLength={20}
              className={`${plain} tabular text-right`}
            />
          </label>
          <label className={`${glassField} h-12`}>
            <Phone size={16} className="shrink-0 text-ink-3" />
            <span className="w-[4.5rem] shrink-0 font-subtitle text-[13px] text-muted-dark">Telefone</span>
            <input
              value={form.phone}
              onChange={(e) => update({ phone: e.target.value })}
              type="tel"
              placeholder="+351 912 345 678"
              maxLength={30}
              className={`${plain} tabular text-right`}
            />
          </label>
        </div>
        {/* A way to check the numbers before saving. */}
        {(digits.length >= 9 || phoneDigits.length >= 9) && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {digits.length >= 9 && (
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className={testChip}>
                <i className="bx bxl-whatsapp text-sm" aria-hidden="true" />
                Testar WhatsApp
              </a>
            )}
            {phoneDigits.length >= 9 && (
              <a href={`tel:${phoneDigits}`} className={testChip}>
                <Phone size={12} strokeWidth={2.4} />
                Testar chamada
              </a>
            )}
          </div>
        )}
      </Card>

      <Card Icon={MapPin} title="Localização" note="Sem link, o mapa procura a morada.">
        <div className="flex flex-col gap-2">
          <label className="glass-chip block rounded-[20px] px-4 py-2.5">
            <span className="block font-subtitle text-[12px] text-muted-dark">Morada</span>
            <textarea
              value={form.address}
              onChange={(e) => update({ address: e.target.value })}
              placeholder="Rua Exemplo 12, 4000-000 Porto"
              maxLength={200}
              rows={2}
              className={`${plain} mt-0.5 resize-none leading-snug`}
            />
          </label>
          <label className={`${glassField} h-12`}>
            <span className="shrink-0 font-subtitle text-[13px] text-muted-dark">Link do mapa</span>
            <input
              value={form.mapUrl}
              onChange={(e) => update({ mapUrl: e.target.value })}
              type="url"
              placeholder="opcional"
              maxLength={500}
              className={`${plain} text-right`}
            />
          </label>
        </div>
        {(form.mapUrl || form.address) && (
          <div className="mt-2.5 flex">
            <a href={mapHref} target="_blank" rel="noreferrer" className={testChip}>
              <ExternalLink size={12} strokeWidth={2.4} />
              Ver no mapa
            </a>
          </div>
        )}
      </Card>

      <Card Icon={Clock} title="Horário" note="As horas a que começam as sessões. Os dias que não estiverem aqui aparecem como fechados.">
        {/* A glass row per day: the day, its hours, and remove. */}
        <div className="flex flex-col gap-2">
          {form.openingHours.map((row, index) => (
            <div key={index} className="glass-chip flex h-12 items-center gap-2 rounded-full pe-1.5 ps-4">
              <input
                value={row.days}
                onChange={(e) => updateHours(index, { days: e.target.value })}
                aria-label="Dia"
                placeholder="Quarta-feira"
                maxLength={60}
                className={`${plain} font-medium`}
              />
              <input
                value={row.hours}
                onChange={(e) => updateHours(index, { hours: e.target.value })}
                aria-label="Horas"
                placeholder="09:00 e 14:00"
                maxLength={60}
                className={`${plain} tabular !w-[6.6rem] shrink-0 text-right !text-[15px] text-muted-dark`}
              />
              <button
                type="button"
                aria-label={`Remover ${row.days || 'linha'}`}
                onClick={() => {
                  void tap()
                  update({ openingHours: form.openingHours.filter((_, i) => i !== index) })
                }}
                className="flex size-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'color-mix(in srgb, var(--c-cancelled) 12%, transparent)', color: 'var(--c-cancelled)' }}
              >
                <Minus size={15} strokeWidth={2.4} />
              </button>
            </div>
          ))}
          {form.openingHours.length < 10 && (
            <button
              type="button"
              onClick={() => {
                void tap()
                update({ openingHours: [...form.openingHours, { days: '', hours: '' }] })
              }}
              className="flex h-12 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-dashed border-onyx/15 font-subtitle text-[14px] font-semibold text-onyx"
            >
              <Plus size={16} strokeWidth={2.4} />
              Adicionar dia
            </button>
          )}
        </div>
      </Card>

      <Card Icon={FileText} title="Cancelamento" note="Mostrada às clientes antes de confirmarem e quando cancelam.">
        <label className="glass-chip block rounded-[20px] px-4 py-3">
          <textarea
            value={form.cancellationPolicy}
            onChange={(e) => update({ cancellationPolicy: e.target.value })}
            rows={4}
            maxLength={600}
            placeholder="Ex.: Cancelamentos com menos de 24 horas de antecedência…"
            className={`${plain} resize-none leading-snug`}
            aria-label="Política de cancelamento"
          />
          <span className="tabular mt-1 block text-right font-subtitle text-[11px] text-muted-dark">{form.cancellationPolicy.length}/600</span>
        </label>
      </Card>

      {/* Saving stays in reach above the tab bar while there are changes; the result shows the same way. */}
      <div className="sticky bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-10 mt-2 flex flex-col items-center gap-2">
        <AnimatePresence>
          {message && (
            <motion.p
              key="message"
              role={message.ok ? 'status' : 'alert'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`flex items-center gap-2 rounded-full bg-card px-4 py-2 font-subtitle text-[13px] text-onyx ${cardShadow}`}
            >
              {message.ok ? (
                <Check size={15} style={{ color: 'var(--c-confirmed)' }} />
              ) : (
                <X size={15} style={{ color: 'var(--c-cancelled)' }} />
              )}
              {message.text}
            </motion.p>
          )}
          {dirty && (
            <motion.button
              key="save"
              type="submit"
              disabled={saving}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className={`flex h-14 w-full max-w-sm items-center gap-3 rounded-full bg-card pe-2 ps-5 text-left transition-transform active:scale-[0.98] disabled:opacity-60 ${cardShadow}`}
            >
              <Check size={19} className="shrink-0 text-onyx" />
              <span className="min-w-0 flex-1 truncate font-subtitle text-[15px] font-semibold text-onyx">{saving ? 'A guardar…' : 'Guardar alterações'}</span>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
                <ArrowRight size={18} />
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </form>
  )
}
