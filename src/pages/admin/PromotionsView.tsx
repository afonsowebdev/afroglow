import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, Pause, Play, Plus, Tag, Trash2, X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { tap } from '@/lib/haptics'
import { useScrollLock } from '@/lib/use-scroll-lock'
import { formatPrice, type Service } from '@/lib/types'
import { cardShadow, dayTime, Empty, Notice, Switch } from './admin-ui'

interface Promotion {
  id: string
  title: string
  percentOff: number
  serviceId: string | null
  service: { id: string; name: string } | null
  startsAt: string
  endsAt: string
  active: boolean
}

interface Draft {
  id: string | null
  title: string
  percentOff: string
  serviceId: string
  startsAt: string
  endsAt: string
  active: boolean
}

/** "2026-10-21T09:00" in the phone's own time, for the date and time fields. */
function localValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Where a promotion stands, with its colour: running green, scheduled or paused yellow, ended grey. */
function stateOf(p: Promotion) {
  const now = Date.now()
  if (new Date(p.endsAt).getTime() <= now) return { label: 'Terminada', colour: 'color-mix(in srgb, var(--color-onyx) 40%, transparent)' }
  if (!p.active) return { label: 'Em pausa', colour: 'var(--c-waiting)' }
  if (new Date(p.startsAt).getTime() > now) return { label: 'Agendada', colour: 'var(--c-waiting)' }
  return { label: 'A decorrer', colour: 'var(--c-confirmed)' }
}

/** One of the page's figures, in a white card, centred. */
function Figure({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div className={`flex min-w-0 flex-col items-center rounded-[22px] bg-card px-2 py-3.5 text-center ${cardShadow}`}>
      <p className="flex max-w-full items-center gap-1.5 truncate font-subtitle text-[12px] text-ink-3">
        {colour && <span className="size-2 shrink-0 rounded-full" style={{ background: colour }} aria-hidden="true" />}
        {label}
      </p>
      <p className="tabular mt-1 font-subtitle text-[22px] font-semibold leading-tight tracking-tight text-onyx">{value}</p>
    </div>
  )
}

/** Discounts for a while, on one hairstyle or on all: the clients see and book the lower price while they run. */
export function PromotionsView({ services }: { services: Service[] }) {
  const [promotions, setPromotions] = useState<Promotion[] | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setPromotions(await api.get<Promotion[]>('/admin/promotions'))
    } catch {
      setPromotions([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openNew() {
    const start = new Date()
    start.setMinutes(0, 0, 0)
    const end = new Date(start.getTime() + 7 * 86_400_000)
    end.setHours(23, 59, 0, 0)
    setError(null)
    setDraft({ id: null, title: '', percentOff: '20', serviceId: '', startsAt: localValue(start), endsAt: localValue(end), active: true })
  }

  function openEdit(p: Promotion) {
    setError(null)
    setDraft({
      id: p.id,
      title: p.title,
      percentOff: String(p.percentOff),
      serviceId: p.serviceId ?? '',
      startsAt: localValue(new Date(p.startsAt)),
      endsAt: localValue(new Date(p.endsAt)),
      active: p.active,
    })
  }

  async function save() {
    if (!draft) return
    setBusy(true)
    setError(null)
    const payload = {
      title: draft.title.trim(),
      percentOff: Number(draft.percentOff),
      serviceId: draft.serviceId || null,
      startsAt: new Date(draft.startsAt).toISOString(),
      endsAt: new Date(draft.endsAt).toISOString(),
      active: draft.active,
    }
    try {
      if (draft.id) await api.put(`/admin/promotions/${draft.id}`, payload)
      else await api.post('/admin/promotions', payload)
      setNotice(draft.id ? 'Promoção guardada.' : 'Promoção criada. As clientes já veem o preço com desconto.')
      setDraft(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível guardar.')
    } finally {
      setBusy(false)
    }
  }

  async function act(action: () => Promise<unknown>, text: string) {
    try {
      await action()
      setNotice(text)
      await load()
    } catch {
      setNotice('Não foi possível concluir. Tenta de novo.')
    }
  }

  const percent = Number(draft?.percentOff)
  const validPercent = Number.isInteger(percent) && percent >= 1 && percent <= 90
  const example = draft ? (services.find((s) => s.id === draft.serviceId) ?? services.find((s) => s.active !== false)) : null
  const running = (promotions ?? []).filter((p) => stateOf(p).label === 'A decorrer').length
  const scheduled = (promotions ?? []).filter((p) => ['Agendada', 'Em pausa'].includes(stateOf(p).label)).length
  const canSave = !!draft && draft.title.trim().length >= 2 && validPercent && draft.startsAt < draft.endsAt && !busy
  useScrollLock(draft !== null)
  const glassField = 'glass-chip flex h-12 items-center gap-3 rounded-full px-4'
  const plainInput = 'field-plain min-w-0 flex-1 !border-0 !bg-transparent !p-0 font-subtitle text-base text-onyx !shadow-none outline-none placeholder:text-onyx/35'
  const label = 'mb-2 px-1 font-subtitle text-[12px] font-semibold text-muted-dark'

  return (
    <section className="mt-6">
      {notice && <Notice text={notice} onClose={() => setNotice(null)} />}

      {promotions && promotions.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          <Figure label="Promoções" value={String(promotions.length)} />
          <Figure label="A decorrer" value={String(running)} colour="var(--c-confirmed)" />
          <Figure label="Agendadas" value={String(scheduled)} colour="var(--c-waiting)" />
        </div>
      )}

      {/* A new one: a plain white button, like Abrir semanas. */}
      <button
        type="button"
        onClick={() => {
          void tap()
          openNew()
        }}
        className={`flex h-16 w-full items-center gap-3 rounded-full bg-card pe-2.5 ps-5 text-left transition-transform active:scale-[0.98] ${cardShadow} ${promotions && promotions.length > 0 ? 'mt-3' : ''}`}
      >
        <Plus size={20} className="shrink-0 text-onyx" />
        <span className="min-w-0 flex-1">
          <span className="block font-subtitle text-[15px] font-semibold leading-tight text-onyx">Nova promoção</span>
          <span className="block truncate font-subtitle text-[12px] text-muted-dark">Um desconto por uns dias, num modelo ou em todos</span>
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
          <ArrowRight size={18} />
        </span>
      </button>

      {promotions === null ? (
        <p className="mt-6 px-1 font-subtitle text-sm text-muted-dark">A carregar…</p>
      ) : promotions.length === 0 ? (
        <Empty icon="bx bx-purchase-tag" title="Sem promoções" text="Cria um desconto num modelo ou em todos, por uns dias. As clientes veem e marcam logo o preço mais baixo." />
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {promotions.map((p) => {
            const state = stateOf(p)
            const ended = state.label === 'Terminada'
            const confirming = confirmDelete === p.id
            return (
              <article key={p.id} className={`rounded-[22px] bg-card p-3.5 ${cardShadow}`}>
                <button type="button" onClick={() => openEdit(p)} className="flex w-full items-center gap-3.5 text-left">
                  {/* The discount, in its state's colour. */}
                  <span
                    className="tabular flex size-14 shrink-0 items-center justify-center rounded-full font-subtitle text-[15px] font-bold"
                    style={{ background: `color-mix(in srgb, ${state.colour} 15%, transparent)`, color: ended ? 'var(--color-muted-dark)' : state.colour }}
                  >
                    −{p.percentOff}%
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate font-subtitle text-[15px] font-semibold tracking-tight ${ended ? 'text-muted-dark' : 'text-onyx'}`}>{p.title}</span>
                    <span className="block truncate font-subtitle text-[13px] text-muted-dark">{p.service?.name ?? 'Todos os modelos'}</span>
                    <span className="block truncate font-subtitle text-[11px] text-muted-dark">
                      {dayTime(p.startsAt)} – {dayTime(p.endsAt)}
                    </span>
                  </span>
                </button>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-subtitle text-[11px] font-semibold text-onyx"
                    style={{ background: `color-mix(in srgb, ${state.colour} 15%, transparent)` }}
                  >
                    <span className="size-1.5 rounded-full" style={{ background: state.colour }} aria-hidden="true" />
                    {state.label}
                  </span>
                  <span className="flex-1" />
                  {!ended && (
                    <button
                      type="button"
                      onClick={() => {
                        void tap()
                        void act(() => api.patch(`/admin/promotions/${p.id}/active`, { active: !p.active }), p.active ? 'Promoção em pausa.' : 'Promoção retomada.')
                      }}
                      className="glass-chip flex h-9 items-center gap-1.5 rounded-full px-3.5 font-subtitle text-[12px] font-semibold text-onyx"
                    >
                      {p.active ? <Pause size={13} /> : <Play size={13} />}
                      {p.active ? 'Pausar' : 'Retomar'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      void tap()
                      if (confirming) void act(() => api.delete(`/admin/promotions/${p.id}`), 'Promoção apagada.')
                      else setConfirmDelete(p.id)
                    }}
                    onBlur={() => setConfirmDelete(null)}
                    aria-label={confirming ? 'Confirmar: apagar a promoção' : 'Apagar a promoção'}
                    className={`flex h-9 items-center justify-center gap-1.5 rounded-full font-subtitle text-[12px] font-semibold ${confirming ? 'px-3.5 text-[#ffffff]' : 'w-9'}`}
                    style={
                      confirming
                        ? { background: 'var(--c-cancelled)' }
                        : { background: 'color-mix(in srgb, var(--c-cancelled) 12%, transparent)', color: 'var(--c-cancelled)' }
                    }
                  >
                    <Trash2 size={14} />
                    {confirming && 'Apagar?'}
                  </button>
                </div>
              </article>
            )
          })}
          <p className="px-1 font-subtitle text-xs text-muted-dark">
            Se um modelo tiver duas promoções ao mesmo tempo, vale a maior. As marcações já feitas guardam o preço com que foram feitas.
          </p>
        </div>
      )}

      {/* A promotion, new or edited, in a sheet like the others. */}
      <AnimatePresence>
        {draft && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
            <motion.button
              type="button"
              aria-label="Fechar"
              onClick={() => !busy && setDraft(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.form
              role="dialog"
              aria-modal="true"
              aria-label={draft.id ? 'Editar promoção' : 'Nova promoção'}
              onSubmit={(e) => {
                e.preventDefault()
                if (canSave) void save()
              }}
              className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              <div className="flex items-center gap-3 px-5 pb-3 pt-5">
                <span className="glass-chip flex size-11 shrink-0 items-center justify-center rounded-full text-onyx">
                  <Tag size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-subtitle text-[19px] font-semibold tracking-tight text-onyx">{draft.id ? 'Editar promoção' : 'Nova promoção'}</h2>
                  <p className="truncate font-subtitle text-xs text-muted-dark">As clientes veem e marcam logo o preço mais baixo.</p>
                </div>
                <button type="button" aria-label="Fechar" onClick={() => setDraft(null)} disabled={busy} className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full text-onyx">
                  <X size={16} />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-4 pt-1 [&>*]:shrink-0">
                {error && (
                  <p role="alert" className="rounded-2xl px-4 py-3 font-subtitle text-sm text-onyx" style={{ background: 'color-mix(in srgb, var(--c-cancelled) 12%, transparent)' }}>
                    {error}
                  </p>
                )}
                <label className={glassField}>
                  <span className="w-16 shrink-0 font-subtitle text-[13px] text-muted-dark">Nome</span>
                  <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={60} placeholder="Ex.: Semana das tranças" className={plainInput} />
                </label>

                <section>
                  <p className={label}>Desconto</p>
                  <div className="flex items-center gap-2">
                    <label className="glass-chip flex h-11 w-24 shrink-0 items-center gap-1 rounded-full px-4">
                      <input
                        value={draft.percentOff}
                        onChange={(e) => setDraft({ ...draft, percentOff: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                        inputMode="numeric"
                        aria-label="Desconto em percentagem"
                        className={`${plainInput} tabular text-right font-semibold`}
                      />
                      <span className="font-subtitle text-sm text-muted-dark">%</span>
                    </label>
                    <span className="flex flex-wrap gap-1.5">
                      {[10, 15, 20, 30].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            void tap()
                            setDraft({ ...draft, percentOff: String(n) })
                          }}
                          className={`h-9 rounded-full px-3 font-subtitle text-[12px] text-onyx ${draft.percentOff === String(n) ? 'glass-chip-on font-semibold' : 'glass-chip font-medium'}`}
                        >
                          {n}%
                        </button>
                      ))}
                    </span>
                  </div>
                </section>

                <section>
                  <p className={label}>Modelo</p>
                  <label className={`${glassField} relative`}>
                    <span className="min-w-0 flex-1 truncate font-subtitle text-base font-medium text-onyx">
                      {services.find((x) => x.id === draft.serviceId)?.name ?? 'Todos os modelos'}
                    </span>
                    <span className="font-subtitle text-xs text-muted-dark">Mudar</span>
                    <select
                      value={draft.serviceId}
                      onChange={(e) => setDraft({ ...draft, serviceId: e.target.value })}
                      aria-label="Modelo"
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                    >
                      <option value="">Todos os modelos</option>
                      {services.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>

                <section>
                  <p className={label}>Quando</p>
                  <div className="flex flex-col gap-2">
                    {(
                      [
                        ['Começa', 'startsAt'],
                        ['Acaba', 'endsAt'],
                      ] as const
                    ).map(([name, field]) => (
                      <label key={field} className={`${glassField} relative`}>
                        <span className="w-16 shrink-0 font-subtitle text-[13px] text-muted-dark">{name}</span>
                        <span className="min-w-0 flex-1 truncate text-right font-subtitle text-[15px] font-semibold text-onyx">
                          {dayTime(new Date(draft[field]).toISOString())}
                        </span>
                        <input
                          type="datetime-local"
                          value={draft[field]}
                          onChange={(e) => e.target.value && setDraft({ ...draft, [field]: e.target.value })}
                          aria-label={name}
                          className="absolute inset-0 size-full cursor-pointer opacity-0"
                        />
                      </label>
                    ))}
                  </div>
                  {draft.startsAt >= draft.endsAt && (
                    <p className="mt-2 px-1 font-subtitle text-xs" style={{ color: 'var(--c-cancelled)' }}>
                      O fim tem de ser depois do início.
                    </p>
                  )}
                </section>

                <div className="flex items-center gap-4 rounded-[20px] bg-onyx/[0.04] px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-subtitle text-[15px] font-semibold text-onyx">Ativa</span>
                    <span className="block font-subtitle text-xs text-muted-dark">Desligada, fica em pausa sem a apagar.</span>
                  </span>
                  <Switch checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label="Ativa" />
                </div>

                {example && validPercent && (
                  <p className="flex items-center justify-between gap-3 rounded-[20px] px-4 py-3 font-subtitle text-sm text-onyx" style={{ background: 'color-mix(in srgb, var(--c-confirmed) 10%, transparent)' }}>
                    <span className="min-w-0 truncate">{example.name}</span>
                    <span className="shrink-0">
                      <span className="text-muted-dark line-through">{formatPrice(example.priceCents)}</span>{' '}
                      <strong className="font-semibold" style={{ color: 'var(--c-confirmed)' }}>
                        {formatPrice(Math.round((example.priceCents * (100 - percent)) / 100))}
                      </strong>
                    </span>
                  </p>
                )}
              </div>

              <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]">
                <button
                  type="submit"
                  disabled={!canSave}
                  className={`flex h-14 w-full items-center gap-3 rounded-full bg-card pe-2 ps-5 text-left transition-transform active:scale-[0.98] disabled:opacity-45 ${cardShadow}`}
                >
                  <Check size={19} className="shrink-0 text-onyx" />
                  <span className="min-w-0 flex-1 truncate font-subtitle text-[15px] font-semibold text-onyx">
                    {busy ? 'A guardar…' : draft.id ? 'Guardar promoção' : `Criar promoção${validPercent ? ` de ${percent}%` : ''}`}
                  </span>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
                    <ArrowRight size={18} />
                  </span>
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
