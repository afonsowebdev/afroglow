import type { Permission } from './admin-me'

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

const ITEMS: Item[] = [
  {
    id: 'portfolio',
    label: 'Portfólio',
    hint: 'Fotos e vídeos do trabalho, na app dos clientes',
    icon: 'bx bx-images',
    permission: 'catalogo',
  },
  { id: 'servicos', label: 'Serviços', hint: 'Modelos, duração e preços', icon: 'bx bx-cut', permission: 'catalogo' },
  { id: 'promocoes', label: 'Promoções', hint: 'Descontos num modelo ou em todos', icon: 'bx bx-purchase-tag', permission: 'catalogo' },
  { id: 'fechos', label: 'Dias fechados', hint: 'Folgas, feriados e férias', icon: 'bx bx-calendar-x', permission: 'marcacoes' },
  { id: 'notificar', label: 'Notificar clientes', hint: 'Uma mensagem a todas ou a algumas', icon: 'bx bx-bell', permission: 'notificacoes' },
  { id: 'testemunhos', label: 'Testemunhos', hint: 'Aprovar ou recusar', icon: 'bx bx-message-rounded-dots', permission: 'testemunhos' },
  { id: 'estatisticas', label: 'Estatísticas', hint: 'Receita, sessões e clientes', icon: 'bx bx-bar-chart-alt-2', permission: 'estatisticas' },
  {
    id: 'definicoes',
    label: 'Definições do negócio',
    hint: 'WhatsApp, morada, horário, cancelamento',
    icon: 'bx bx-store',
    permission: 'definicoes',
  },
  { id: 'equipa', label: 'Equipa', hint: 'Quem entra no painel e o que pode usar', icon: 'bx bx-group', owner: true },
  { id: 'seguranca', label: 'A tua conta', hint: 'Nome, foto, notificações e password', icon: 'bx bx-user-circle' },
]

export function MoreView({
  onOpen,
  badges,
  can,
  isOwner,
}: {
  onOpen: (id: MoreTarget) => void
  badges: Partial<Record<MoreTarget, number>>
  can: (permission: Permission) => boolean
  isOwner: boolean
}) {
  return (
    <div className="mt-6 divide-y divide-onyx/10 overflow-hidden rounded-2xl border border-onyx/10 shadow-sm shadow-black/5 bg-white">
      {ITEMS.filter((item) => (item.owner ? isOwner : !item.permission || can(item.permission))).map((item) => (
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
  )
}
