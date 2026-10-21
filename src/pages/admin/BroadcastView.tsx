import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { MotionButton } from '@/components/ui/motion-button'
import { api, ApiError } from '@/lib/api'
import type { AdminCustomer } from './admin-types'
import { ago, chip, group, Notice, plain, plural, Section, Segment } from './admin-ui'

interface Broadcast {
  id: string
  title: string
  body: string
  recipientCount: number
  createdAt: string
  admin: { name: string; email: string } | null
}

const TEMPLATES: Array<{ label: string; title: string; body: string }> = [
  { label: 'Vagas livres', title: 'Há vagas esta semana', body: 'Abrimos novos horários para esta semana. Marca já o teu na app!' },
  { label: 'Promoção', title: 'Promoção especial', body: 'Durante esta semana tens desconto nos teus penteados preferidos. Vê os preços na app.' },
  { label: 'Estúdio fechado', title: 'Estúdio fechado', body: 'O estúdio vai estar fechado nos próximos dias. Voltamos em breve, obrigada pela compreensão!' },
  { label: 'Novo modelo', title: 'Novo penteado disponível', body: 'Juntámos um modelo novo ao catálogo. Espreita na app e marca o teu.' },
]

/** A message to the clients (a notification on their iPhone, and under the bell in the app and on the site). */
export function BroadcastView({ presetCustomerId }: { presetCustomerId?: string | null }) {
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
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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
    setError(null)
    try {
      const result = await api.post<Broadcast>('/admin/broadcasts', {
        title: title.trim(),
        body: body.trim(),
        audience,
        customerIds: audience === 'SELECTED' ? [...picked] : undefined,
      })
      setConfirming(false)
      setNotice(`Mensagem enviada a ${plural(result.recipientCount, 'cliente', 'clientes')}.`)
      setTitle('')
      setBody('')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="mt-6 flex flex-col gap-7">
      {notice && <Notice text={notice} onClose={() => setNotice(null)} />}

      <Section
        title="Para"
        note={
          audience === 'ALL' && reach
            ? `${reach.withApp} de ${reach.total} têm a app no iPhone e recebem a notificação; todas a veem no sino da app e do site.`
            : undefined
        }
      >
        <Segment
          value={audience}
          onChange={setAudience}
          options={[
            ['ALL', `Todas${reach ? ` (${reach.total})` : ''}`],
            ['SELECTED', `Escolher${picked.size ? ` (${picked.size})` : ''}`],
          ]}
        />
      </Section>

      {audience === 'SELECTED' && (
        <Section title="Clientes com conta">
          <label className="mb-3 flex items-center gap-2 rounded-full bg-onyx/[0.06] px-4">
            <i className="bx bx-search text-lg text-onyx/40" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou telemóvel"
              aria-label="Procurar cliente"
              className="field-plain h-11 min-w-0 flex-1 bg-transparent font-subtitle text-base text-onyx outline-none placeholder:text-onyx/40"
            />
          </label>
          <ul className={`${group} max-h-80 overflow-y-auto`}>
            {shown.length === 0 && <li className="px-4 py-3 font-subtitle text-sm text-muted-dark">Nenhuma cliente com conta.</li>}
            {shown.slice(0, 200).map((c) => {
              const on = picked.has(c.id)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setPicked((current) => {
                        const next = new Set(current)
                        if (next.has(c.id)) next.delete(c.id)
                        else next.add(c.id)
                        return next
                      })
                    }
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-onyx/[0.04]"
                  >
                    <i className={`bx ${on ? 'bxs-check-circle text-onyx' : 'bx-circle text-onyx/30'} text-2xl`} aria-hidden="true" />
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-onyx font-subtitle text-sm font-semibold text-white">
                      {c.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-subtitle text-[15px] text-onyx">{c.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      <Section title="Mensagem" note={`${title.length}/60 · ${body.length}/300`}>
        <div className={group}>
          <label className="block px-4 pb-2 pt-2">
            <span className="block font-subtitle text-[11px] text-muted-dark">Título</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Ex.: Há vagas esta semana" className={`${plain} mt-0.5 h-7`} />
          </label>
          <label className="block px-4 pb-2 pt-2">
            <span className="block font-subtitle text-[11px] text-muted-dark">Texto</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={300}
              rows={4}
              placeholder="O que queres dizer às clientes?"
              className={`${plain} mt-0.5 resize-none leading-snug`}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => {
                setTitle(t.title)
                setBody(t.body)
              }}
              className={chip}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <div className="flex justify-center">
        <MotionButton label={`Enviar${recipients ? ` a ${plural(recipients, 'cliente', 'clientes')}` : ''}`} disabled={!ready} onClick={() => setConfirming(true)} />
      </div>

      {history.length > 0 && (
        <Section title="Enviadas" note="Toca numa mensagem para a usar de novo.">
          <div className={group}>
            {history.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setTitle(b.title)
                  setBody(b.body)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="block w-full px-4 py-3 text-left active:bg-onyx/[0.04]"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-subtitle text-[15px] font-medium text-onyx">{b.title}</span>
                  <span className="shrink-0 font-subtitle text-xs text-muted-dark">{ago(b.createdAt)}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block font-subtitle text-sm text-muted-dark">{b.body}</span>
                <span className="mt-1 block font-subtitle text-[11px] text-muted-dark">
                  {plural(b.recipientCount, 'cliente', 'clientes')}
                  {b.admin ? ` · ${b.admin.name || b.admin.email}` : ''}
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}

      <Sheet
        open={confirming}
        title={`Enviar a ${plural(recipients, 'cliente', 'clientes')}?`}
        description="Recebem a notificação no iPhone (quem tem a app) e veem-na no sino. Não dá para desfazer."
        icon="bx bx-bell"
        busy={sending}
        error={error}
        submitLabel="Enviar"
        onSubmit={() => void send()}
        onClose={() => setConfirming(false)}
      >
        <div className="rounded-2xl bg-onyx/5 p-4">
          <p className="font-subtitle text-sm font-semibold text-onyx">{title.trim()}</p>
          <p className="mt-1 font-subtitle text-sm text-muted-dark">{body.trim()}</p>
        </div>
      </Sheet>
    </section>
  )
}
