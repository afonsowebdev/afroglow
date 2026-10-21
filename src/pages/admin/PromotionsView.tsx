import { useCallback, useEffect, useState } from 'react'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { api, ApiError } from '@/lib/api'
import { formatPrice, type Service } from '@/lib/types'
import { dayTime, Empty, Notice, pillButton, plural, Switch } from './admin-ui'

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

function stateOf(p: Promotion) {
  const now = Date.now()
  if (new Date(p.endsAt).getTime() <= now) return { label: 'Terminada', dot: 'bg-onyx/30' }
  if (!p.active) return { label: 'Em pausa', dot: 'bg-amber-500' }
  if (new Date(p.startsAt).getTime() > now) return { label: 'Agendada', dot: 'bg-amber-500' }
  return { label: 'A decorrer', dot: 'bg-emerald-500' }
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

  return (
    <section className="mt-6">
      {notice && <Notice text={notice} onClose={() => setNotice(null)} />}

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-subtitle text-2xl font-semibold lining-nums tracking-tight text-onyx">
            {promotions ? plural(promotions.length, 'promoção', 'promoções') : '–'}
          </p>
          <p className="mt-0.5 font-subtitle text-sm text-muted-dark">{running ? `${running} a decorrer agora` : 'Nenhuma a decorrer'}</p>
        </div>
        <button type="button" onClick={openNew} className={pillButton}>
          <i className="bx bx-plus text-lg" aria-hidden="true" />
          Nova promoção
        </button>
      </div>

      {promotions === null ? (
        <p className="mt-6 font-subtitle text-muted-dark">A carregar...</p>
      ) : promotions.length === 0 ? (
        <Empty icon="bx bx-purchase-tag" title="Sem promoções" text="Cria um desconto num modelo ou em todos, por uns dias. As clientes veem e marcam logo o preço mais baixo." />
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {promotions.map((p) => {
            const state = stateOf(p)
            const ended = state.label === 'Terminada'
            return (
              <article key={p.id} className={`overflow-hidden rounded-2xl border border-onyx/10 bg-white shadow-sm shadow-black/5 ${ended ? 'opacity-70' : ''}`}>
                <button type="button" onClick={() => openEdit(p)} className="flex w-full items-center gap-4 p-4 text-left active:bg-onyx/[0.03]">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-onyx font-subtitle text-base font-semibold text-white">
                    −{p.percentOff}%
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-subtitle text-base font-semibold tracking-tight text-onyx">{p.title}</span>
                    <span className="block truncate font-subtitle text-sm text-muted-dark">{p.service?.name ?? 'Todos os modelos'}</span>
                    <span className="mt-1 flex items-center gap-1.5 font-subtitle text-[11px] text-muted-dark">
                      <span className={`size-1.5 rounded-full ${state.dot}`} />
                      {state.label} · {dayTime(p.startsAt)} – {dayTime(p.endsAt)}
                    </span>
                  </span>
                  <i className="bx bx-chevron-right shrink-0 text-xl text-onyx/30" aria-hidden="true" />
                </button>
                <div className="flex border-t border-onyx/10">
                  {!ended && (
                    <button
                      type="button"
                      onClick={() =>
                        void act(() => api.patch(`/admin/promotions/${p.id}/active`, { active: !p.active }), p.active ? 'Promoção em pausa.' : 'Promoção retomada.')
                      }
                      className="flex flex-1 items-center justify-center gap-1.5 py-2.5 font-subtitle text-sm text-onyx active:bg-onyx/[0.04]"
                    >
                      <i className={`bx ${p.active ? 'bx-pause' : 'bx-play'} text-base`} aria-hidden="true" />
                      {p.active ? 'Pausar' : 'Retomar'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      confirmDelete === p.id
                        ? void act(() => api.delete(`/admin/promotions/${p.id}`), 'Promoção apagada.')
                        : setConfirmDelete(p.id)
                    }
                    onBlur={() => setConfirmDelete(null)}
                    className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 font-subtitle text-sm ${!ended ? 'border-l border-onyx/10' : ''} ${
                      confirmDelete === p.id ? 'bg-red-600 font-medium text-[#ffffff]' : 'text-muted-dark'
                    }`}
                  >
                    <i className="bx bx-trash text-base" aria-hidden="true" />
                    {confirmDelete === p.id ? 'Confirmar' : 'Apagar'}
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

      <Sheet
        open={draft !== null}
        title={draft?.id ? 'Editar promoção' : 'Nova promoção'}
        description="Um desconto por uns dias, num modelo ou em todos."
        icon="bx bx-purchase-tag"
        busy={busy}
        error={error}
        submitLabel={draft?.id ? 'Guardar' : 'Criar'}
        submitDisabled={!draft || draft.title.trim().length < 2 || !validPercent || draft.startsAt >= draft.endsAt}
        onSubmit={() => void save()}
        onClose={() => setDraft(null)}
      >
        {draft && (
          <>
            <SheetField label="Nome">
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={60}
                placeholder="Ex.: Semana das tranças"
                className={sheetFieldClass}
              />
            </SheetField>
            <SheetField label="Desconto">
              <span className="flex items-center gap-2">
                <input
                  value={draft.percentOff}
                  onChange={(e) => setDraft({ ...draft, percentOff: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  inputMode="numeric"
                  className={`${sheetFieldClass} w-20`}
                />
                <span className="font-subtitle text-sm text-muted-dark">%</span>
                <span className="flex flex-wrap gap-1.5">
                  {[10, 15, 20, 30].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDraft({ ...draft, percentOff: String(n) })}
                      className={`rounded-full px-3 py-1.5 font-subtitle text-xs ${draft.percentOff === String(n) ? 'glass-chip-on font-semibold text-onyx' : 'glass-chip text-onyx'}`}
                    >
                      {n}%
                    </button>
                  ))}
                </span>
              </span>
            </SheetField>
            <SheetField label="Modelo">
              <select value={draft.serviceId} onChange={(e) => setDraft({ ...draft, serviceId: e.target.value })} className={sheetFieldClass}>
                <option value="">Todos os modelos</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </SheetField>
            <div className="grid grid-cols-2 gap-3">
              <SheetField label="Começa">
                <input
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(e) => e.target.value && setDraft({ ...draft, startsAt: e.target.value })}
                  className={sheetFieldClass}
                />
              </SheetField>
              <SheetField label="Acaba">
                <input
                  type="datetime-local"
                  value={draft.endsAt}
                  onChange={(e) => e.target.value && setDraft({ ...draft, endsAt: e.target.value })}
                  className={sheetFieldClass}
                />
              </SheetField>
            </div>
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block font-subtitle text-sm text-onyx">Ativa</span>
                <span className="block font-subtitle text-xs text-muted-dark">Desligada, fica em pausa sem a apagar.</span>
              </span>
              <Switch checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label="Ativa" />
            </label>
            {example && validPercent && (
              <p className="rounded-xl bg-onyx/5 px-4 py-3 font-subtitle text-sm text-onyx">
                Exemplo: {example.name}{' '}
                <span className="text-muted-dark line-through">{formatPrice(example.priceCents)}</span>{' '}
                <strong>{formatPrice(Math.round((example.priceCents * (100 - percent)) / 100))}</strong>
              </p>
            )}
          </>
        )}
      </Sheet>
    </section>
  )
}
