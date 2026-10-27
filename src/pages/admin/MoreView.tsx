import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { AdminMe, Permission } from './admin-me'

export type MoreTarget =
  | 'servicos'
  | 'promocoes'
  | 'testemunhos'
  | 'estatisticas'
  | 'definicoes'
  | 'seguranca'
  | 'portfolio'
  | 'fechos'
  | 'notificar'
  | 'equipa'

type Item = { id: MoreTarget; label: string; hint: string; icon: string; permission?: Permission; owner?: boolean }

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Catálogo',
    items: [
      { id: 'servicos', label: 'Serviços', hint: 'Modelos, duração e preços', icon: 'bx bx-cut', permission: 'catalogo' },
      { id: 'promocoes', label: 'Promoções', hint: 'Descontos num modelo ou em todos', icon: 'bx bx-purchase-tag', permission: 'catalogo' },
      {
        id: 'portfolio',
        label: 'Portfólio',
        hint: 'Fotos e vídeos do trabalho, na app dos clientes',
        icon: 'bx bx-images',
        permission: 'catalogo',
      },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { id: 'testemunhos', label: 'Testemunhos', hint: 'Aprovar ou recusar', icon: 'bx bx-message-rounded-dots', permission: 'testemunhos' },
      { id: 'notificar', label: 'Notificar clientes', hint: 'Uma mensagem a todas ou a algumas', icon: 'bx bx-bell', permission: 'notificacoes' },
    ],
  },
  {
    title: 'Negócio',
    items: [
      { id: 'estatisticas', label: 'Estatísticas', hint: 'Receita, sessões e clientes', icon: 'bx bx-bar-chart-alt-2', permission: 'estatisticas' },
      { id: 'fechos', label: 'Dias fechados', hint: 'Folgas, feriados e férias', icon: 'bx bx-calendar-x', permission: 'marcacoes' },
      {
        id: 'definicoes',
        label: 'Definições do negócio',
        hint: 'WhatsApp, morada, horário, cancelamento',
        icon: 'bx bx-store',
        permission: 'definicoes',
      },
      { id: 'equipa', label: 'Equipa', hint: 'Quem entra no painel e o que pode usar', icon: 'bx bx-group', owner: true },
    ],
  },
]

const card = 'divide-y divide-onyx/10 overflow-hidden rounded-2xl border border-onyx/10 shadow-sm shadow-black/5 bg-white'
const label = 'mb-2 px-1 font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark'

export function MoreView({
  onOpen,
  badges,
  can,
  isOwner,
  me,
}: {
  onOpen: (id: MoreTarget) => void
  badges: Partial<Record<MoreTarget, number>>
  can: (permission: Permission) => boolean
  isOwner: boolean
  me: AdminMe | null
}) {
  const [photo, setPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (!me?.avatarVersion || !me.id) return
    api
      .get<{ dataUrl: string | null }>(`/auth/avatar/${me.id}`)
      .then((data) => setPhoto(data.dataUrl))
      .catch(() => {})
  }, [me?.id, me?.avatarVersion])

  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => (item.owner ? isOwner : !item.permission || can(item.permission))),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="mt-6 flex flex-col gap-8">
      {/* Who is signed in, on top like the Apple ID in the iPhone's Settings: opens the account page. */}
      <button
        type="button"
        onClick={() => onOpen('seguranca')}
        className={`${card} flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-onyx/5`}
      >
        {photo ? (
          <img src={photo} alt="" className="size-14 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-onyx font-subtitle text-xl font-semibold text-white">
            {(me?.name || me?.email || '?').trim().charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-subtitle text-base font-semibold text-onyx">{me?.name || 'A tua conta'}</span>
          <span className="block truncate font-subtitle text-xs text-muted-dark">Nome, foto, notificações e password</span>
        </span>
        <i className="bx bx-chevron-right text-xl text-muted-dark" aria-hidden="true" />
      </button>

      {groups.map((group) => (
        <section key={group.title}>
          <h2 className={label}>{group.title}</h2>
          <div className={card}>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpen(item.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-onyx/5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-onyx/5 text-xl text-onyx">
                  <i className={item.icon} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-subtitle text-base text-onyx">{item.label}</span>
                  <span className="block truncate font-subtitle text-xs text-muted-dark">{item.hint}</span>
                </span>
                {badges[item.id] ? (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs text-[#ffffff]">
                    {badges[item.id]}
                  </span>
                ) : null}
                <i className="bx bx-chevron-right text-xl text-muted-dark" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
