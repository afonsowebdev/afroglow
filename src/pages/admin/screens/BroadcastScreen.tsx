import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import type { AdminCustomer } from '../admin-types'
import { useAdmin } from '../admin-context'
import { plural, timeAgo } from '../format'
import { Alert, Avatar, BarButton, Cell, InputCell, Screen, SearchField, Section, Segmented, TextAreaCell, useToast } from '../ios'

interface Broadcast {
  id: string
  title: string
  body: string
  audience: 'ALL' | 'SELECTED'
  recipientCount: number
  createdAt: string
  admin: { name: string; email: string } | null
}

const TEMPLATES: Array<{ label: string; title: string; body: string }> = [
  { label: 'Vagas livres', title: 'Há vagas esta semana ✨', body: 'Abrimos novos horários para esta semana. Marca já o teu na app!' },
  { label: 'Promoção', title: 'Promoção especial 💛', body: 'Durante esta semana tens desconto nos teus penteados preferidos. Vê os preços na app.' },
  { label: 'Estúdio fechado', title: 'Estúdio fechado', body: 'O estúdio vai estar fechado nos próximos dias. Voltamos em breve, obrigada pela compreensão!' },
  { label: 'Novo modelo', title: 'Novo penteado disponível', body: 'Juntámos um modelo novo ao catálogo. Espreita na app e marca o teu.' },
]

/** Messages to the clients: everyone or a few, a preview of the notification, and what was sent before. */
export function BroadcastScreen({ backLabel, presetCustomerId }: { backLabel: string; presetCustomerId?: string }) {
  const { pop } = useAdmin()
  const toast = useToast()
  const [audience, setAudience] = useState<'ALL' | 'SELECTED'>(presetCustomerId ? 'SELECTED' : 'ALL')
  const [picked, setPicked] = useState<Set<string>>(() => new Set(presetCustomerId ? [presetCustomerId] : []))
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [reach, setReach] = useState<{ total: number; withApp: number } | null>(null)
  const [history, setHistory] = useState<Broadcast[]>([])
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    const [list, audienceData, sent] = await Promise.all([
      api.get<AdminCustomer[]>('/admin/customers').catch(() => [] as AdminCustomer[]),
      api.get<{ total: number; withApp: number }>('/admin/broadcasts/audience').catch(() => null),
      api.get<Broadcast[]>('/admin/broadcasts').catch(() => [] as Broadcast[]),
    ])
    setCustomers(list.filter((c) => c.hasAccount))
    setReach(audienceData)
    setHistory(sent)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q ? customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)) : customers
    return [...list].sort((a, b) => Number(picked.has(b.id)) - Number(picked.has(a.id)) || a.name.localeCompare(b.name, 'pt'))
  }, [customers, search, picked])

  const recipients = audience === 'ALL' ? (reach?.total ?? 0) : picked.size
  const ready = title.trim().length >= 2 && body.trim().length >= 2 && recipients > 0

  async function send() {
    setSending(true)
    try {
      const result = await api.post<Broadcast>('/admin/broadcasts', {
        title: title.trim(),
        body: body.trim(),
        audience,
        customerIds: audience === 'SELECTED' ? [...picked] : undefined,
      })
      toast(`Enviada a ${plural(result.recipientCount, 'cliente', 'clientes')}`)
      setTitle('')
      setBody('')
      await load()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível enviar.', true)
    } finally {
      setSending(false)
    }
  }

  return (
    <Screen
      title="Notificar"
      back={{ label: backLabel, onClick: pop }}
      trailing={<BarButton label={sending ? 'A enviar…' : 'Enviar'} bold disabled={!ready || sending} onClick={() => setConfirming(true)} />}
    >
      <Section flush header="Para">
        <Segmented
          value={audience}
          onChange={setAudience}
          options={[
            { value: 'ALL', label: `Todas${reach ? ` (${reach.total})` : ''}` },
            { value: 'SELECTED', label: `Escolher${picked.size ? ` (${picked.size})` : ''}` },
          ]}
        />
      </Section>
      {audience === 'ALL' && reach && (
        <p className="mx-8 mt-2 text-[13px] text-[var(--ios-secondary)]">
          {reach.withApp} de {reach.total} têm a app no iPhone e recebem a notificação; todas a veem no sino da app e do site.
        </p>
      )}

      <Section header="Mensagem" footer={`${title.length}/60 · ${body.length}/300`}>
        <InputCell value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Título" aria-label="Título" />
        <TextAreaCell value={body} onChange={(e) => setBody(e.target.value)} maxLength={300} rows={4} placeholder="O que queres dizer às clientes?" aria-label="Mensagem" />
      </Section>
      <div className="mt-2 flex flex-wrap gap-2 px-4">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => {
              setTitle(t.title)
              setBody(t.body)
            }}
            className="h-8 rounded-full bg-[var(--ios-fill)] px-3.5 text-[15px] text-[var(--ios-tint)] active:opacity-50"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* How it will look on their lock screen. */}
      <Section flush header="Pré-visualização">
        <div className="rounded-[18px] bg-[color-mix(in_srgb,var(--ios-cell)_80%,transparent)] p-3 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-start gap-2.5">
            <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[9px] bg-black font-logo text-[18px] text-white">A</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[15px] font-semibold">{title.trim() || 'Título'}</p>
                <span className="shrink-0 text-[13px] text-[var(--ios-secondary)]">agora</span>
              </div>
              <p className="line-clamp-4 text-[15px] leading-[20px]">{body.trim() || 'A tua mensagem aparece aqui.'}</p>
            </div>
          </div>
        </div>
      </Section>

      {audience === 'SELECTED' && (
        <>
          <div className="mt-6 px-4">
            <SearchField value={search} onChange={setSearch} placeholder="Procurar cliente" />
          </div>
          <Section header={`Clientes com conta · ${picked.size} escolhida${picked.size === 1 ? '' : 's'}`}>
            {shown.length === 0 ? (
              <Cell title="Nenhuma cliente com conta" />
            ) : (
              shown.slice(0, 200).map((c) => (
                <Cell
                  key={c.id}
                  leading={<Avatar name={c.name} size={32} />}
                  title={c.name}
                  subtitle={plural(c.bookingCount, 'sessão', 'sessões')}
                  accessory={picked.has(c.id) ? 'check' : 'none'}
                  onClick={() =>
                    setPicked((current) => {
                      const next = new Set(current)
                      if (next.has(c.id)) next.delete(c.id)
                      else next.add(c.id)
                      return next
                    })
                  }
                />
              ))
            )}
          </Section>
        </>
      )}

      {history.length > 0 && (
        <Section header="Enviadas">
          {history.map((b) => (
            <Cell
              key={b.id}
              title={b.title}
              subtitle={`${timeAgo(b.createdAt)} · ${plural(b.recipientCount, 'cliente', 'clientes')}${b.admin ? ` · ${b.admin.name || b.admin.email}` : ''}\n${b.body}`}
              multiline
              onClick={() => {
                setTitle(b.title)
                setBody(b.body)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              accessory="none"
            />
          ))}
        </Section>
      )}
      {history.length > 0 && <p className="mx-8 mt-2 text-[13px] text-[var(--ios-secondary)]">Toca numa mensagem para a usar de novo.</p>}

      <Alert
        open={confirming}
        title={`Enviar a ${plural(recipients, 'cliente', 'clientes')}?`}
        message={`“${title.trim()}”. Não dá para desfazer.`}
        onClose={() => setConfirming(false)}
        buttons={[
          { label: 'Cancelar', style: 'cancel' },
          {
            label: 'Enviar',
            onClick: () => {
              setConfirming(false)
              void send()
            },
          },
        ]}
      />
    </Screen>
  )
}
