import { useCallback, useEffect, useState } from 'react'
import { Plus, Tag } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAdmin } from '../admin-context'
import { dateKey, dateParts, euros, shortDate } from '../format'
import {
  Alert,
  BarButton,
  Cell,
  DateCell,
  EmptyState,
  FieldRow,
  IOSSheet,
  InputCell,
  Screen,
  Section,
  Toggle,
  ToggleCell,
  plainInput,
  useToast,
} from '../ios'

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
  serviceId: string | null
  startsAt: string
  endsAt: string
  active: boolean
}

/** "2026-10-21T09:00" in the phone's own time, for datetime-local fields. */
function localValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** "21 out, 17:00". */
function nice(iso: string) {
  return `${shortDate(dateKey(iso))}, ${dateParts(iso).time}`
}

function state(p: Promotion) {
  const now = Date.now()
  if (new Date(p.endsAt).getTime() <= now) return 'ended'
  if (!p.active) return 'paused'
  if (new Date(p.startsAt).getTime() > now) return 'scheduled'
  return 'running'
}

const STATE_LABEL = { running: 'A decorrer', scheduled: 'Agendada', paused: 'Em pausa', ended: 'Terminada' }

/** Discounts for a while, on one hairstyle or on all: the clients see and book the lower price while they run. */
export function PromotionsScreen({ backLabel }: { backLabel: string }) {
  const { pop, services } = useAdmin()
  const toast = useToast()
  const [promotions, setPromotions] = useState<Promotion[] | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pickingService, setPickingService] = useState(false)

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
    setDraft({ id: null, title: '', percentOff: '20', serviceId: null, startsAt: localValue(start), endsAt: localValue(end), active: true })
  }

  function openEdit(p: Promotion) {
    setError(null)
    setDraft({
      id: p.id,
      title: p.title,
      percentOff: String(p.percentOff),
      serviceId: p.serviceId,
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
      serviceId: draft.serviceId,
      startsAt: new Date(draft.startsAt).toISOString(),
      endsAt: new Date(draft.endsAt).toISOString(),
      active: draft.active,
    }
    try {
      if (draft.id) await api.put(`/admin/promotions/${draft.id}`, payload)
      else await api.post('/admin/promotions', payload)
      toast(draft.id ? 'Promoção guardada' : 'Promoção criada')
      setDraft(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível guardar.')
    } finally {
      setBusy(false)
    }
  }

  async function togglePaused(p: Promotion, active: boolean) {
    try {
      await api.patch(`/admin/promotions/${p.id}/active`, { active })
      await load()
      toast(active ? 'Promoção retomada' : 'Promoção em pausa')
    } catch {
      toast('Não foi possível mudar.', true)
    }
  }

  async function remove() {
    if (!draft?.id) return
    try {
      await api.delete(`/admin/promotions/${draft.id}`)
      setDraft(null)
      toast('Promoção apagada')
      await load()
    } catch {
      toast('Não foi possível apagar.', true)
    }
  }

  const groups = (['running', 'scheduled', 'paused', 'ended'] as const)
    .map((key) => ({ key, items: (promotions ?? []).filter((p) => state(p) === key) }))
    .filter((g) => g.items.length)

  const percent = Number(draft?.percentOff)
  const validPercent = Number.isInteger(percent) && percent >= 1 && percent <= 90
  const example = draft ? (services.find((s) => s.id === draft.serviceId) ?? services.find((s) => s.active !== false)) : null
  const canSave = draft !== null && draft.title.trim().length >= 2 && validPercent && draft.startsAt < draft.endsAt

  return (
    <Screen title="Promoções" back={{ label: backLabel, onClick: pop }} trailing={<BarButton label="Nova promoção" Icon={Plus} onClick={openNew} />}>
      {promotions === null ? (
        <p className="py-10 text-center text-[15px] text-[var(--ios-secondary)]">A carregar…</p>
      ) : groups.length === 0 ? (
        <EmptyState
          Icon={Tag}
          title="Sem promoções"
          text="Cria um desconto num modelo ou em todos, por uns dias. As clientes veem e marcam logo o preço mais baixo."
          action={{ label: 'Criar promoção', onClick: openNew }}
        />
      ) : (
        groups.map((group) => (
          <Section key={group.key} header={STATE_LABEL[group.key]}>
            {group.items.map((p) => (
              <Cell
                key={p.id}
                leading={
                  <span
                    className="flex h-[29px] min-w-[46px] items-center justify-center rounded-[7px] px-1 text-[13px] font-bold text-white"
                    style={{ background: group.key === 'running' ? 'var(--ios-pink)' : 'var(--ios-gray)' }}
                  >
                    −{p.percentOff}%
                  </span>
                }
                title={p.title}
                subtitle={`${p.service?.name ?? 'Todos os modelos'} · ${nice(p.startsAt)} – ${nice(p.endsAt)}`}
                accessory={
                  group.key === 'ended' ? undefined : (
                    <Toggle checked={p.active} onChange={(v) => void togglePaused(p, v)} label={`${p.title} ativa`} />
                  )
                }
                onClick={() => openEdit(p)}
              />
            ))}
          </Section>
        ))
      )}
      {groups.length > 0 && (
        <p className="mx-8 mt-3 text-[13px] text-[var(--ios-secondary)]">
          Se um modelo tiver duas promoções ao mesmo tempo, vale a maior. As marcações já feitas guardam o preço com que foram feitas.
        </p>
      )}

      <IOSSheet
        open={draft !== null}
        title={draft?.id ? 'Promoção' : 'Nova promoção'}
        onClose={() => setDraft(null)}
        busy={busy}
        done={{ label: draft?.id ? 'Guardar' : 'Criar', onClick: () => void save(), disabled: !canSave }}
      >
        {draft && (
          <>
            {error && <p className="mx-8 mt-4 text-[15px] text-[var(--ios-red)]">{error}</p>}
            <Section>
              <InputCell value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={60} placeholder="Nome (ex.: Semana das tranças)" />
              <FieldRow label="Desconto">
                <span className="flex items-center gap-1">
                  <input
                    value={draft.percentOff}
                    onChange={(e) => setDraft({ ...draft, percentOff: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    inputMode="numeric"
                    className={`${plainInput} h-11 w-14 text-right`}
                    aria-label="Percentagem de desconto"
                  />
                  <span className="text-[17px] text-[var(--ios-secondary)]">%</span>
                </span>
              </FieldRow>
            </Section>
            <div className="mt-2 flex flex-wrap gap-2 px-4">
              {[10, 15, 20, 25, 30, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDraft({ ...draft, percentOff: String(n) })}
                  className={`h-8 rounded-full px-3.5 text-[15px] active:opacity-50 ${
                    draft.percentOff === String(n) ? 'bg-[var(--ios-tint)] font-semibold text-white dark:text-black' : 'bg-[var(--ios-fill)]'
                  }`}
                >
                  −{n}%
                </button>
              ))}
            </div>

            <Section header="Em que modelo">
              <Cell
                title="Modelo"
                detail={services.find((s) => s.id === draft.serviceId)?.name ?? 'Todos'}
                onClick={() => setPickingService((v) => !v)}
              />
              {pickingService && (
                <>
                  <Cell
                    title="Todos os modelos"
                    accessory={draft.serviceId === null ? 'check' : 'none'}
                    onClick={() => {
                      setDraft({ ...draft, serviceId: null })
                      setPickingService(false)
                    }}
                  />
                  {services.map((s) => (
                    <Cell
                      key={s.id}
                      title={s.name}
                      subtitle={s.active === false ? 'Escondido' : undefined}
                      accessory={draft.serviceId === s.id ? 'check' : 'none'}
                      onClick={() => {
                        setDraft({ ...draft, serviceId: s.id })
                        setPickingService(false)
                      }}
                    />
                  ))}
                </>
              )}
            </Section>

            <Section header="Quando" footer={draft.startsAt >= draft.endsAt ? 'O fim tem de ser depois do início.' : undefined}>
              <DateCell label="Começa" type="datetime-local" value={draft.startsAt} display={nice(new Date(draft.startsAt).toISOString())} onChange={(v) => v && setDraft({ ...draft, startsAt: v })} />
              <DateCell label="Acaba" type="datetime-local" value={draft.endsAt} display={nice(new Date(draft.endsAt).toISOString())} onChange={(v) => v && setDraft({ ...draft, endsAt: v })} />
              <ToggleCell title="Ativa" subtitle="Desligada, fica em pausa sem a apagar." checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} />
            </Section>

            {example && validPercent && (
              <Section header="Exemplo">
                <Cell
                  title={example.name}
                  detail={
                    <span>
                      <span className="text-[var(--ios-tertiary)] line-through">{euros(example.priceCents)}</span>{' '}
                      <span className="font-semibold text-[var(--ios-label)]">{euros(Math.round((example.priceCents * (100 - percent)) / 100))}</span>
                    </span>
                  }
                />
              </Section>
            )}

            {draft.id && (
              <Section>
                <Cell title="Apagar promoção" destructive onClick={() => setConfirmDelete(true)} />
              </Section>
            )}
          </>
        )}
      </IOSSheet>

      <Alert
        open={confirmDelete}
        title="Apagar a promoção?"
        message="Os preços voltam ao normal. As marcações já feitas mantêm o preço."
        onClose={() => setConfirmDelete(false)}
        buttons={[
          { label: 'Cancelar', style: 'cancel' },
          {
            label: 'Apagar',
            style: 'destructive',
            onClick: () => {
              setConfirmDelete(false)
              void remove()
            },
          },
        ]}
      />
    </Screen>
  )
}
