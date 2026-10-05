export type MoreTarget = 'servicos' | 'testemunhos' | 'estatisticas' | 'definicoes' | 'seguranca' | 'portfolio'

const ITEMS: Array<{ id: MoreTarget; label: string; hint: string; icon: string }> = [
  {
    id: 'portfolio',
    label: 'Portfólio',
    hint: 'Fotos e vídeos do trabalho, na app dos clientes',
    icon: 'bx bx-images',
  },
  { id: 'servicos', label: 'Serviços', hint: 'Modelos, duração e preços', icon: 'bx bx-cut' },
  { id: 'testemunhos', label: 'Testemunhos', hint: 'Aprovar ou recusar', icon: 'bx bx-message-rounded-dots' },
  { id: 'estatisticas', label: 'Estatísticas', hint: 'Receita, sessões e clientes', icon: 'bx bx-bar-chart-alt-2' },
  {
    id: 'definicoes',
    label: 'Definições do negócio',
    hint: 'WhatsApp, morada, horário, cancelamento',
    icon: 'bx bx-store',
  },
  { id: 'seguranca', label: 'Segurança', hint: 'Alterar a password', icon: 'bx bx-lock-alt' },
]

export function MoreView({
  onOpen,
  badges,
}: {
  onOpen: (id: MoreTarget) => void
  badges: Partial<Record<MoreTarget, number>>
}) {
  return (
    <div className="mt-6 divide-y divide-onyx/10 overflow-hidden rounded-2xl border-[1.5px] border-onyx/25 bg-white">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpen(item.id)}
          className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-onyx/5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-onyx/5 text-xl text-gold-deep">
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
