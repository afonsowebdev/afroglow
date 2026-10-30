import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Bell, Check, RotateCcw, Search, Send, Users, X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { tap } from '@/lib/haptics'
import { useScrollLock } from '@/lib/use-scroll-lock'
import type { AdminCustomer } from './admin-types'
import { ago, cardShadow, Notice, plain, plural, Segment } from './admin-ui'

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

const label = 'mb-2 px-1 font-subtitle text-[12px] font-semibold text-muted-dark'

/** "AS" for Ana Silva. */
function initialsOf(name: string) {
  const words = name.trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? (words[words.length - 1][0] ?? '') : '')).toUpperCase()
}

/** The message as it shows on the iPhone's lock screen: the app's icon, its name and "agora", the title and the text. */
function NotificationPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass-chip flex items-start gap-3 rounded-[22px] p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-[#1a1008] font-logo text-xl text-[#d4af37]">A</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-subtitle text-[11px] font-semibold uppercase tracking-wide text-muted-dark">Afroglow</span>
          <span className="shrink-0 font-subtitle text-[11px] text-muted-dark">agora</span>
        </span>
        <span className={`block truncate font-subtitle text-[14px] font-semibold ${title.trim() ? 'text-onyx' : 'text-onyx/35'}`}>
          {title.trim() || 'O título aparece aqui'}
        </span>
        <span className={`line-clamp-3 block font-subtitle text-[13px] leading-snug ${body.trim() ? 'text-onyx/80' : 'text-onyx/35'}`}>
          {body.trim() || 'E o texto por baixo.'}
        </span>
      </span>
    </div>
  )
}

/**
 * A message to the clients (a notification on their iPhone, and under the bell in the app and on the site), in the
 * Painel's style: who gets it, the message in glass fields with ready-made ones, how it will look on the iPhone, a plain
 * button to send (confirmed in a sheet), and what was sent before.
 */
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
  useScrollLock(confirming)

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
    <section className="mt-6 flex flex-col gap-5">
      {notice && <Notice text={notice} onClose={() => setNotice(null)} />}

      {/* Who can be reached, in three figures. */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          ['Com conta', reach ? String(reach.total) : '–'],
          ['Com a app', reach ? String(reach.withApp) : '–'],
          ['Enviadas', String(history.length)],
        ].map(([name, value]) => (
          <div key={name} className={`flex min-w-0 flex-col items-center rounded-[22px] bg-card px-2 py-3.5 text-center ${cardShadow}`}>
            <p className="max-w-full truncate font-subtitle text-[12px] text-ink-3">{name}</p>
            <p className="tabular mt-1 font-subtitle text-[22px] font-semibold leading-tight tracking-tight text-onyx">{value}</p>
          </div>
        ))}
      </div>

      {/* Who gets it. */}
      <section className={`rounded-[22px] bg-card p-4 ${cardShadow}`}>
        <div className="mb-3 flex items-center gap-3">
          <span className="glass-chip flex size-10 shrink-0 items-center justify-center rounded-full text-onyx">
            <Users size={17} />
          </span>
          <span className="min-w-0">
            <span className="block font-subtitle text-[15px] font-semibold text-onyx">Para quem</span>
            <span className="block font-subtitle text-xs leading-snug text-muted-dark">
              {audience === 'ALL' && reach
                ? `${reach.withApp} de ${reach.total} recebem no iPhone; todas veem no sino.`
                : 'Escolhe as clientes com conta.'}
            </span>
          </span>
        </div>
        <Segment
          value={audience}
          onChange={(v) => {
            void tap()
            setAudience(v)
          }}
          options={[
            ['ALL', `Todas${reach ? ` (${reach.total})` : ''}`],
            ['SELECTED', `Escolher${picked.size ? ` (${picked.size})` : ''}`],
          ]}
        />

        {audience === 'SELECTED' && (
          <div className="mt-3">
            <label className="glass-chip mb-2.5 flex items-center gap-2 rounded-full pe-2 ps-4">
              <Search size={16} className="shrink-0 text-ink-3" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome ou telemóvel"
                aria-label="Procurar cliente"
                className="field-plain h-11 min-w-0 flex-1 !border-0 !bg-transparent !p-0 font-subtitle text-base text-onyx !shadow-none outline-none placeholder:text-onyx/40"
              />
              {search && (
                <button type="button" aria-label="Limpar a pesquisa" onClick={() => setSearch('')} className="flex size-7 shrink-0 items-center justify-center rounded-full bg-onyx/[0.06] text-muted-dark">
                  <X size={14} />
                </button>
              )}
            </label>
            <ul className="max-h-80 divide-y divide-onyx/[0.06] overflow-y-auto rounded-[18px] bg-onyx/[0.03]">
              {shown.length === 0 && <li className="px-4 py-3 font-subtitle text-sm text-muted-dark">Nenhuma cliente com conta.</li>}
              {shown.slice(0, 200).map((c) => {
                const on = picked.has(c.id)
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        void tap()
                        setPicked((current) => {
                          const next = new Set(current)
                          if (next.has(c.id)) next.delete(c.id)
                          else next.add(c.id)
                          return next
                        })
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-onyx/[0.04]"
                    >
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full transition-colors"
                        style={
                          on
                            ? { background: 'var(--color-onyx)', color: 'var(--color-white)' }
                            : { boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--color-onyx) 25%, transparent)' }
                        }
                        aria-hidden="true"
                      >
                        {on && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full font-subtitle text-[12px] font-semibold text-onyx">
                        {initialsOf(c.name)}
                      </span>
                      <span className={`min-w-0 flex-1 truncate font-subtitle text-[15px] ${on ? 'font-semibold text-onyx' : 'text-onyx'}`}>{c.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      {/* The message, with ready-made ones and how it will look. */}
      <section className={`rounded-[22px] bg-card p-4 ${cardShadow}`}>
        <div className="mb-3 flex items-center gap-3">
          <span className="glass-chip flex size-10 shrink-0 items-center justify-center rounded-full text-onyx">
            <Bell size={17} />
          </span>
          <span className="min-w-0">
            <span className="block font-subtitle text-[15px] font-semibold text-onyx">Mensagem</span>
            <span className="block font-subtitle text-xs text-muted-dark">Escreve ou começa por uma pronta.</span>
          </span>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => {
                void tap()
                setTitle(t.title)
                setBody(t.body)
              }}
              className={`h-9 rounded-full px-3.5 font-subtitle text-[12px] text-onyx ${title === t.title && body === t.body ? 'glass-chip-on font-semibold' : 'glass-chip font-medium'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <label className="glass-chip flex h-12 items-center gap-3 rounded-full px-4">
            <span className="w-12 shrink-0 font-subtitle text-[13px] text-muted-dark">Título</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Ex.: Há vagas esta semana" className={`${plain} !border-0 !p-0 !shadow-none`} />
            <span className="tabular shrink-0 font-subtitle text-[11px] text-muted-dark">{title.length}/60</span>
          </label>
          <label className="glass-chip block rounded-[20px] px-4 py-2.5">
            <span className="flex justify-between font-subtitle text-[12px] text-muted-dark">
              Texto <span className="tabular">{body.length}/300</span>
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={300}
              rows={4}
              placeholder="O que queres dizer às clientes?"
              className={`${plain} mt-0.5 resize-none !border-0 !p-0 leading-snug !shadow-none`}
            />
          </label>
        </div>
        <p className="mb-2 mt-4 px-1 font-subtitle text-[12px] font-semibold text-muted-dark">Assim aparece no iPhone</p>
        <NotificationPreview title={title} body={body} />
      </section>

      {/* Sending: a plain white button, confirmed in a sheet. */}
      <button
        type="button"
        disabled={!ready}
        onClick={() => {
          void tap()
          setError(null)
          setConfirming(true)
        }}
        className={`flex h-14 w-full items-center gap-3 rounded-full bg-card pe-2 ps-5 text-left transition-transform active:scale-[0.98] disabled:opacity-45 ${cardShadow}`}
      >
        <Send size={18} className="shrink-0 text-onyx" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-subtitle text-[15px] font-semibold leading-tight text-onyx">
            {recipients ? `Enviar a ${plural(recipients, 'cliente', 'clientes')}` : 'Enviar'}
          </span>
          {!ready && (
            <span className="block truncate font-subtitle text-[12px] text-muted-dark">
              {recipients === 0 ? 'Escolhe pelo menos uma cliente' : 'Escreve o título e o texto'}
            </span>
          )}
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
          <ArrowRight size={18} />
        </span>
      </button>

      {/* What was sent before; a tap uses it again. */}
      {history.length > 0 && (
        <section>
          <p className={label}>Enviadas · toca numa para a usar de novo</p>
          <div className="flex flex-col gap-2.5">
            {history.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  void tap()
                  setTitle(b.title)
                  setBody(b.body)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className={`block w-full rounded-[22px] bg-card p-4 text-left transition-transform active:scale-[0.99] ${cardShadow}`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-subtitle text-[15px] font-semibold text-onyx">{b.title}</span>
                  <span className="shrink-0 font-subtitle text-xs text-muted-dark">{ago(b.createdAt)}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block font-subtitle text-[13px] text-muted-dark">{b.body}</span>
                <span className="mt-2.5 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-onyx/[0.05] px-2.5 py-1 font-subtitle text-[11px] font-semibold text-onyx">
                    <Users size={11} />
                    {plural(b.recipientCount, 'cliente', 'clientes')}
                  </span>
                  {b.admin && <span className="truncate font-subtitle text-[11px] text-muted-dark">por {b.admin.name || b.admin.email}</span>}
                  <span className="flex-1" />
                  <RotateCcw size={14} className="shrink-0 text-ink-3" />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Confirming, in a sheet like the others. */}
      <AnimatePresence>
        {confirming && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
            <motion.button
              type="button"
              aria-label="Fechar"
              onClick={() => !sending && setConfirming(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Enviar a mensagem"
              className="relative flex w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              <div className="flex items-center gap-3 px-5 pb-3 pt-5">
                <span className="glass-chip flex size-11 shrink-0 items-center justify-center rounded-full text-onyx">
                  <Send size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-subtitle text-[19px] font-semibold tracking-tight text-onyx">Enviar a {plural(recipients, 'cliente', 'clientes')}?</h2>
                  <p className="truncate font-subtitle text-xs text-muted-dark">No iPhone (quem tem a app) e no sino. Não dá para desfazer.</p>
                </div>
                <button type="button" aria-label="Fechar" onClick={() => setConfirming(false)} disabled={sending} className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full text-onyx">
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-col gap-3 px-5 pb-4 pt-1">
                <NotificationPreview title={title} body={body} />
                {error && (
                  <p className="px-1 font-subtitle text-sm" style={{ color: 'var(--c-cancelled)' }}>
                    {error}
                  </p>
                )}
              </div>
              <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-1">
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => {
                    void tap('medium')
                    void send()
                  }}
                  className={`flex h-14 w-full items-center gap-3 rounded-full bg-card pe-2 ps-5 text-left transition-transform active:scale-[0.98] disabled:opacity-60 ${cardShadow}`}
                >
                  <Send size={18} className="shrink-0 text-onyx" />
                  <span className="min-w-0 flex-1 truncate font-subtitle text-[15px] font-semibold text-onyx">{sending ? 'A enviar…' : 'Enviar agora'}</span>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
                    <ArrowRight size={18} />
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
