import { useEffect, useState } from 'react'
import { ImagePlus, Plus, Scissors, Tag } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { optionsOf } from '@/lib/pricing'
import { serviceImageUrls } from '@/lib/service-images'
import type { Service } from '@/lib/types'
import { PricingEditor } from '../PricingEditor'
import { ServicePhotos } from '../ServicePhotos'
import { useAdmin } from '../admin-context'
import { draftFromPricing, pricingFromDraft, type PricingDraft } from '../pricing-draft'
import { dateParts, euros, plural } from '../format'
import {
  Alert,
  BarButton,
  Cell,
  EmptyState,
  FieldRow,
  IOSSheet,
  InputCell,
  Screen,
  Section,
  Segmented,
  TextAreaCell,
  ToggleCell,
  plainInput,
  useToast,
} from '../ios'

interface Form {
  id: string | null
  name: string
  description: string
  duration: string
  price: string
  pricing: PricingDraft
  active: boolean
}

interface Usage {
  total: number
  active: number
  history: number
  activeBookings: Array<{ id: string; customerName: string; status: 'PENDING' | 'ACCEPTED'; startsAt: string }>
}

const tableField =
  'w-full rounded-[10px] bg-[var(--ios-cell)] px-3 py-2.5 text-[17px] text-[var(--ios-label)] outline-none placeholder:text-[var(--ios-tertiary)]'

/** The hairstyles: photo, name, price and options; tap to edit, + to add. */
export function ServicesScreen({ backLabel }: { backLabel: string }) {
  const { services, reload, pop, push } = useAdmin()
  const toast = useToast()
  const [form, setForm] = useState<Form | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<{ service: Service; usage: Usage | null } | null>(null)
  const [promos, setPromos] = useState<Array<{ serviceId: string | null; percentOff: number; active: boolean; startsAt: string; endsAt: string }>>([])

  useEffect(() => {
    api
      .get<typeof promos>('/admin/promotions')
      .then(setPromos)
      .catch(() => {})
  }, [])

  const now = Date.now()
  const running = promos.filter((p) => p.active && new Date(p.startsAt).getTime() <= now && new Date(p.endsAt).getTime() > now)
  const promoFor = (id: string) =>
    running.filter((p) => p.serviceId === null || p.serviceId === id).sort((a, b) => b.percentOff - a.percentOff)[0]

  function openNew() {
    setError(null)
    setForm({ id: null, name: '', description: '', duration: '', price: '', pricing: draftFromPricing(null), active: true })
  }

  function openEdit(service: Service) {
    setError(null)
    setForm({
      id: service.id,
      name: service.name,
      description: service.description,
      duration: service.durationLabel,
      price: (service.priceCents / 100).toFixed(2).replace(/\.00$/, ''),
      pricing: draftFromPricing(service.pricing),
      active: service.active !== false,
    })
  }

  async function save() {
    if (!form) return
    const price = Number(form.price.replace(',', '.'))
    if (!form.name.trim() || !form.description.trim() || !form.duration.trim()) {
      setError('Preenche o nome, a descrição e a duração.')
      return
    }
    const table = pricingFromDraft(form.pricing)
    if ('error' in table) {
      setError(table.error)
      return
    }
    if (!table.pricing && (form.price.trim() === '' || Number.isNaN(price) || price < 0)) {
      setError('Preço inválido.')
      return
    }
    setBusy(true)
    setError(null)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      durationLabel: form.duration.trim(),
      priceCents: table.pricing ? 0 : Math.round(price * 100),
      pricing: table.pricing,
      active: form.active,
    }
    try {
      if (form.id === null) {
        const created = await api.post<Service>('/admin/services', payload)
        await reload()
        toast('Modelo criado. Junta-lhe fotos.')
        // Straight into the new one, so the photos can be added.
        setForm({ ...form, id: created.id })
      } else {
        await api.patch(`/admin/services/${form.id}`, payload)
        await reload()
        toast('Modelo guardado')
        setForm(null)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível guardar o modelo.')
    } finally {
      setBusy(false)
    }
  }

  async function askDelete(service: Service) {
    setDeleting({ service, usage: null })
    try {
      setDeleting({ service, usage: await api.get<Usage>(`/admin/services/${service.id}/usage`) })
    } catch {
      setDeleting(null)
      toast('Não foi possível verificar as marcações deste modelo.', true)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await api.delete(`/admin/services/${deleting.service.id}`)
      setDeleting(null)
      setForm(null)
      await reload()
      toast(`${deleting.service.name} eliminado`)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível eliminar.', true)
    }
  }

  const hidden = services.filter((s) => s.active === false).length
  const usage = deleting?.usage
  const editing = form?.id ? services.find((s) => s.id === form.id) : null

  return (
    <Screen
      title="Serviços"
      subtitle={services.length ? `${plural(services.length, 'modelo', 'modelos')}${hidden ? ` · ${hidden} escondido${hidden === 1 ? '' : 's'}` : ''}` : undefined}
      back={{ label: backLabel, onClick: pop }}
      trailing={<BarButton label="Novo modelo" Icon={Plus} onClick={openNew} />}
    >
      {services.length === 0 ? (
        <EmptyState Icon={Scissors} title="Ainda sem modelos" text="Cria o primeiro: nome, duração, preço e fotos." action={{ label: 'Novo modelo', onClick: openNew }} />
      ) : (
        <Section footer={running.length ? 'Os preços com desconto são os que as clientes veem enquanto a promoção dura.' : undefined}>
          {services.map((service) => {
            const photo = serviceImageUrls(service)[0]
            const { lengths, partings } = optionsOf(service)
            const promo = promoFor(service.id)
            return (
              <Cell
                key={service.id}
                leading={
                  photo ? (
                    <img src={photo} alt="" loading="lazy" className="size-[52px] rounded-[8px] object-cover" />
                  ) : (
                    <span className="flex size-[52px] items-center justify-center rounded-[8px] bg-[var(--ios-fill)] text-[var(--ios-tertiary)]">
                      <ImagePlus className="size-6" strokeWidth={1.6} />
                    </span>
                  )
                }
                title={
                  <span className={service.active === false ? 'text-[var(--ios-secondary)]' : undefined}>
                    {service.name}
                    {service.active === false && <span className="text-[13px]"> · escondido</span>}
                  </span>
                }
                subtitle={
                  <>
                    {service.pricing ? 'desde ' : ''}
                    {promo ? (
                      <>
                        <span className="line-through">{euros(service.priceCents)}</span>{' '}
                        <span className="font-semibold text-[var(--ios-pink)]">
                          {euros(Math.round((service.priceCents * (100 - promo.percentOff)) / 100))}
                        </span>
                      </>
                    ) : (
                      euros(service.priceCents)
                    )}
                    {` · ${service.durationLabel}`}
                    {[...lengths, ...partings].length ? ` · ${[...lengths, ...partings].join(', ')}` : ''}
                  </>
                }
                onClick={() => openEdit(service)}
              />
            )
          })}
        </Section>
      )}
      <Section>
        <Cell Icon={Tag} tint="pink" title="Promoções" onClick={() => push({ name: 'promotions' })} />
      </Section>

      <IOSSheet
        open={form !== null}
        title={form?.id ? form.name || 'Modelo' : 'Novo modelo'}
        onClose={() => setForm(null)}
        busy={busy}
        done={{ label: form?.id ? 'Guardar' : 'Criar', onClick: () => void save() }}
      >
        {form && (
          <>
            {error && <p className="mx-8 mt-4 text-[15px] text-[var(--ios-red)]">{error}</p>}
            <Section flush header="Fotos">
              {form.id ? (
                <div className="rounded-[12px] bg-[var(--ios-cell)] p-3">
                  <ServicePhotos serviceId={form.id} images={editing?.images ?? []} onChanged={() => void reload()} />
                </div>
              ) : (
                <p className="rounded-[12px] bg-[var(--ios-cell)] px-4 py-3 text-[15px] text-[var(--ios-secondary)]">
                  Cria o modelo primeiro; depois juntas as fotos aqui.
                </p>
              )}
            </Section>

            <Section header="Informação" footer={`${form.description.length}/300`}>
              <InputCell value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} placeholder="Nome (ex.: Box Braids)" />
              <TextAreaCell
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={300}
                rows={3}
                placeholder="Descrição para as clientes"
              />
              <FieldRow label="Duração">
                <input
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  maxLength={40}
                  placeholder="Ex.: 3–5h"
                  className={`${plainInput} h-11 w-full text-right`}
                />
              </FieldRow>
            </Section>

            <Section header="Preço" flush>
              <Segmented
                value={form.pricing.on ? 'options' : 'single'}
                onChange={(v) => setForm({ ...form, pricing: { ...form.pricing, on: v === 'options' } })}
                options={[
                  { value: 'single', label: 'Preço único' },
                  { value: 'options', label: 'Por opções' },
                ]}
              />
              <div className="mt-3">
                {form.pricing.on ? (
                  <>
                    <PricingEditor bare draft={form.pricing} onChange={(pricing) => setForm({ ...form, pricing })} fieldClass={tableField} />
                    <p className="mt-2 px-4 text-[13px] text-[var(--ios-secondary)]">
                      A cliente escolhe ao marcar; a app mostra “desde” o preço mais baixo.
                    </p>
                  </>
                ) : (
                  <div className="ios-list overflow-hidden rounded-[10px] bg-[var(--ios-cell)]">
                    <FieldRow label="Preço">
                      <span className="flex items-center gap-1">
                        <input
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
                          inputMode="decimal"
                          placeholder="65"
                          className={`${plainInput} h-11 w-24 text-right`}
                        />
                        <span className="text-[17px] text-[var(--ios-secondary)]">€</span>
                      </span>
                    </FieldRow>
                  </div>
                )}
              </div>
            </Section>

            <Section footer="Desligado, o modelo fica escondido das clientes; as marcações já feitas mantêm-se.">
              <ToggleCell title="Disponível para marcar" checked={form.active} onChange={(active) => setForm({ ...form, active })} />
            </Section>

            {editing && (
              <Section>
                <Cell title="Eliminar modelo" destructive onClick={() => void askDelete(editing)} />
              </Section>
            )}
          </>
        )}
      </IOSSheet>

      <Alert
        open={deleting !== null}
        title={deleting ? `Eliminar ${deleting.service.name}?` : ''}
        message={
          !usage
            ? 'A verificar as marcações…'
            : usage.active > 0
              ? `Tem ${plural(usage.active, 'marcação ativa', 'marcações ativas')} (${usage.activeBookings
                  .slice(0, 3)
                  .map((b) => `${b.customerName}, ${dateParts(b.startsAt).day} ${dateParts(b.startsAt).month}`)
                  .join('; ')}). Resolve-as primeiro, ou esconde o modelo em vez de o eliminar.`
              : usage.history > 0
                ? `Também apaga ${plural(usage.history, 'marcação antiga', 'marcações antigas')} do histórico. Não pode ser desfeito.`
                : 'Não tem marcações. Não pode ser desfeito.'
        }
        onClose={() => setDeleting(null)}
        buttons={
          usage && usage.active === 0
            ? [
                { label: 'Cancelar', style: 'cancel' },
                { label: 'Eliminar', style: 'destructive', onClick: () => void confirmDelete() },
              ]
            : [{ label: 'OK', style: 'cancel' }]
        }
      />
    </Screen>
  )
}
